import type { ReportEmailPayload } from "@/lib/report-email";
import {
  buildDiagnosisForEmail,
  deliverReportEmail,
  REPORT_EMAIL_USER_ERROR,
  type SurveyResponseEmailRow,
} from "@/lib/send-report-core";
import { getSupabaseServerConfig } from "@/lib/supabase-server";
import type { DiagnosisResult } from "@/lib/scoring";
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const RATE_LIMIT_MS = 15 * 60 * 1000;

const resendAt = new Map<string, number>();

async function loadRowByUid(
  uid: string
): Promise<(SurveyResponseEmailRow & { email_status?: string | null }) | null> {
  const config = getSupabaseServerConfig();
  if (!config || config.mode !== "service_role") return null;

  const admin = createClient(config.url, config.key);
  const { data, error } = await admin
    .from("survey_responses")
    .select(
      "email, company, grade, grade_code, answers, result_snapshot, scoring_config_version, email_status"
    )
    .eq("submission_uid", uid)
    .maybeSingle();

  if (error || !data) {
    if (error) console.error("resend-report: db read failed", error);
    return null;
  }
  return data as SurveyResponseEmailRow & { email_status?: string | null };
}

async function shouldRateLimit(uid: string, force: boolean): Promise<boolean> {
  if (force) return false;

  const last = resendAt.get(uid) ?? 0;
  if (Date.now() - last >= RATE_LIMIT_MS) return false;

  const row = await loadRowByUid(uid);
  return row?.email_status === "sent";
}

export async function POST(request: Request) {
  let body: ReportEmailPayload & { submission_uid?: string; force?: boolean };
  try {
    body = (await request.json()) as ReportEmailPayload & {
      submission_uid?: string;
      force?: boolean;
    };
  } catch {
    return NextResponse.json(
      { sent: false, error: REPORT_EMAIL_USER_ERROR },
      { status: 400 }
    );
  }

  const uid = body.submission_uid?.trim() ?? "";
  const force = body.force === true;

  if (uid && (await shouldRateLimit(uid, force))) {
    return NextResponse.json(
      { sent: false, error: "15분에 한 번만 재발송할 수 있습니다." },
      { status: 429 }
    );
  }

  let to = body.to?.trim() ?? "";
  let company = body.company ?? null;
  let result = body.result as DiagnosisResult | undefined;

  if (uid && (!result || typeof result.total !== "number")) {
    const row = await loadRowByUid(uid);
    if (row) {
      to = to || row.email?.trim() || "";
      company = company ?? row.company;
      result = buildDiagnosisForEmail(row);
    }
  }

  if (!EMAIL_RE.test(to)) {
    return NextResponse.json(
      { sent: false, error: REPORT_EMAIL_USER_ERROR },
      { status: 400 }
    );
  }

  if (!result || typeof result.total !== "number") {
    return NextResponse.json(
      { sent: false, error: REPORT_EMAIL_USER_ERROR },
      { status: 400 }
    );
  }

  const outcome = await deliverReportEmail({
    to,
    company,
    result,
    submissionUid: uid || null,
  });

  if (!outcome.sent) {
    const config = getSupabaseServerConfig();
    if (uid && config?.mode === "service_role") {
      const admin = createClient(config.url, config.key);
      await admin
        .from("survey_responses")
        .update({ email_status: "failed" })
        .eq("submission_uid", uid);
    }
    return NextResponse.json(
      { sent: false, error: REPORT_EMAIL_USER_ERROR },
      { status: outcome.detail === "resend_not_configured" ? 503 : 502 }
    );
  }

  if (uid) resendAt.set(uid, Date.now());

  const config = getSupabaseServerConfig();
  if (uid && config?.mode === "service_role") {
    const admin = createClient(config.url, config.key);
    const { error } = await admin
      .from("survey_responses")
      .update({ email_status: "sent" })
      .eq("submission_uid", uid);
    if (error) console.error("resend-report: email_status update failed", error);
  }

  return NextResponse.json({ sent: true });
}
