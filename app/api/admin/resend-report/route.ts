import {
  buildDiagnosisForEmail,
  deliverReportEmail,
  type SurveyResponseEmailRow,
} from "@/lib/send-report-core";
import { getSupabaseServerConfig } from "@/lib/supabase-server";
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

function checkAdmin(request: Request): boolean {
  const secret = process.env.ADMIN_EXPORT_SECRET;
  if (!secret) return false;
  const auth = request.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  return token.length > 0 && token === secret;
}

/** 관리자: submission_uid로 리포트 재발송 (상세 오류 반환) */
export async function POST(request: Request) {
  if (!checkAdmin(request)) return unauthorized();

  let body: { submission_uid?: string; to?: string };
  try {
    body = (await request.json()) as { submission_uid?: string; to?: string };
  } catch {
    return NextResponse.json({ sent: false, error: "Invalid JSON" }, { status: 400 });
  }

  const uid = body.submission_uid?.trim() ?? "";
  if (!uid) {
    return NextResponse.json({ sent: false, error: "submission_uid required" }, { status: 400 });
  }

  const config = getSupabaseServerConfig();
  if (!config || config.mode !== "service_role") {
    return NextResponse.json(
      { sent: false, error: "SUPABASE_SERVICE_ROLE_KEY required" },
      { status: 503 }
    );
  }

  const admin = createClient(config.url, config.key);
  const { data, error } = await admin
    .from("survey_responses")
    .select(
      "email, company, grade, grade_code, answers, result_snapshot, scoring_config_version, email_status"
    )
    .eq("submission_uid", uid)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ sent: false, error: error.message }, { status: 502 });
  }
  if (!data) {
    return NextResponse.json({ sent: false, error: "submission not found" }, { status: 404 });
  }

  const to = body.to?.trim() || data.email?.trim() || "";
  let result;
  try {
    result = buildDiagnosisForEmail(data as SurveyResponseEmailRow);
  } catch (buildError) {
    const msg = buildError instanceof Error ? buildError.message : String(buildError);
    return NextResponse.json({ sent: false, error: `build failed: ${msg}` }, { status: 500 });
  }

  const outcome = await deliverReportEmail({
    to,
    company: data.company,
    result,
    submissionUid: uid,
  });

  if (!outcome.sent) {
    await admin
      .from("survey_responses")
      .update({ email_status: "failed" })
      .eq("submission_uid", uid);
    return NextResponse.json(
      { sent: false, error: outcome.detail ?? "resend failed", to },
      { status: 502 }
    );
  }

  await admin
    .from("survey_responses")
    .update({ email_status: "sent" })
    .eq("submission_uid", uid);

  return NextResponse.json({ sent: true, to, email_status: "sent" });
}
