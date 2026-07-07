import {
  buildDiagnosisForEmail,
  deliverReportEmail,
  REPORT_EMAIL_USER_ERROR,
  type SurveyResponseEmailRow,
} from "@/lib/send-report-core";
import { getSupabaseServerConfig } from "@/lib/supabase-server";
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  const config = getSupabaseServerConfig();
  if (!config || config.mode !== "service_role") {
    console.error("send-report-by-uid: SUPABASE_SERVICE_ROLE_KEY required");
    return NextResponse.json(
      { sent: false, error: REPORT_EMAIL_USER_ERROR },
      { status: 503 }
    );
  }

  let body: { submission_uid?: string; to?: string };
  try {
    body = (await request.json()) as { submission_uid?: string; to?: string };
  } catch {
    return NextResponse.json(
      { sent: false, error: REPORT_EMAIL_USER_ERROR },
      { status: 400 }
    );
  }

  const uid = body.submission_uid?.trim() ?? "";
  if (!uid) {
    return NextResponse.json(
      { sent: false, error: REPORT_EMAIL_USER_ERROR },
      { status: 400 }
    );
  }

  const admin = createClient(config.url, config.key);
  const { data, error } = await admin
    .from("survey_responses")
    .select(
      "email, company, grade, grade_code, answers, result_snapshot, scoring_config_version"
    )
    .eq("submission_uid", uid)
    .maybeSingle();

  if (error) {
    console.error("send-report-by-uid: db read failed", error);
    return NextResponse.json(
      { sent: false, error: REPORT_EMAIL_USER_ERROR },
      { status: 502 }
    );
  }
  if (!data) {
    return NextResponse.json(
      { sent: false, error: REPORT_EMAIL_USER_ERROR },
      { status: 404 }
    );
  }

  const to = (body.to?.trim() || data.email?.trim()) ?? "";
  if (!EMAIL_RE.test(to)) {
    return NextResponse.json(
      { sent: false, error: REPORT_EMAIL_USER_ERROR },
      { status: 400 }
    );
  }

  const row = data as SurveyResponseEmailRow;
  const result = buildDiagnosisForEmail(row);
  const outcome = await deliverReportEmail({
    to,
    company: row.company,
    result,
    submissionUid: uid,
  });

  if (!outcome.sent) {
    const { error: failUpdateError } = await admin
      .from("survey_responses")
      .update({ email_status: "failed" })
      .eq("submission_uid", uid);
    if (failUpdateError) {
      console.error("send-report-by-uid: email_status failed update", failUpdateError);
    }
    return NextResponse.json(
      { sent: false, error: REPORT_EMAIL_USER_ERROR },
      { status: outcome.detail === "resend_not_configured" ? 503 : 502 }
    );
  }

  const { error: updateError } = await admin
    .from("survey_responses")
    .update({ email_status: "sent" })
    .eq("submission_uid", uid);
  if (updateError) {
    console.error("send-report-by-uid: email_status update failed", updateError);
  }

  return NextResponse.json({ sent: true });
}
