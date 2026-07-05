/**
 * T-18: email_status=failed 건 일괄 재발송 (관리자 CLI)
 *
 * 필요 환경변수:
 *   NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
 *   RESEND_API_KEY, EMAIL_FROM
 *
 * 실행: node scripts/resend-failed-reports.mjs
 */
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const apiKey = process.env.RESEND_API_KEY;
const from = process.env.EMAIL_FROM;

if (!url || !serviceKey || !apiKey || !from) {
  console.error("Missing env: SUPABASE URL/KEY, RESEND_API_KEY, EMAIL_FROM");
  process.exit(1);
}

const supabase = createClient(url, serviceKey);

const { data: rows, error } = await supabase
  .from("survey_responses")
  .select(
    "submission_uid, email, company, score, grade, grade_code, grade_internal, pain_scores"
  )
  .eq("email_status", "failed");

if (error) {
  console.error("Query failed:", error.message);
  process.exit(1);
}

if (!rows?.length) {
  console.log("No failed email rows.");
  process.exit(0);
}

console.log(`Found ${rows.length} failed row(s). Resending...`);

let ok = 0;
let fail = 0;

for (const row of rows) {
  const subject = `[PRO ALI SMART] ISO 실행력 진단 리포트 — ${row.score}점 (${row.grade})`;
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [row.email],
      subject,
      html: `<p>진단 리포트 재발송입니다. 총점 ${row.score}점 (${row.grade})</p>`,
    }),
  });

  if (res.ok) {
    await supabase
      .from("survey_responses")
      .update({ email_status: "sent" })
      .eq("submission_uid", row.submission_uid);
    ok++;
    console.log("sent:", row.submission_uid, row.email);
  } else {
    fail++;
    console.error("fail:", row.submission_uid, await res.text());
  }
}

console.log(`Done: ${ok} sent, ${fail} failed`);
