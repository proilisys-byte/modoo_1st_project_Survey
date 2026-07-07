import { buildReportEmailHtml } from "@/lib/report-email";
import { resolveGrade } from "@/lib/grade-bands";
import { getResendConfig } from "@/lib/resend-config";
import { resolveResult } from "@/lib/resolve-result";
import type { ResultSnapshot } from "@/lib/result-snapshot";
import type { Answers, DiagnosisResult } from "@/lib/scoring";

export const REPORT_EMAIL_USER_ERROR =
  "리포트 발송이 지연되고 있습니다. 응답은 안전하게 저장되었으며, 준비되는 대로 입력하신 이메일로 보내드립니다.";

export type SurveyResponseEmailRow = {
  email: string;
  company: string | null;
  grade: string | null;
  grade_code: string | null;
  answers: Answers;
  result_snapshot: ResultSnapshot | null;
  scoring_config_version?: string | null;
};

export function buildDiagnosisForEmail(row: SurveyResponseEmailRow): DiagnosisResult {
  const resolved = resolveResult({
    answers: row.answers,
    result_snapshot: row.result_snapshot,
    scoring_config_version: row.scoring_config_version,
  });
  const grade = resolveGrade(resolved.total);
  const diagnosis = resolved.diagnosis;
  diagnosis.gradeName = row.grade?.trim() || grade.name;
  diagnosis.gradeInternalName = grade.internalName;
  diagnosis.actionPlan = grade.plan;
  return diagnosis;
}

export async function sendViaResend(
  apiKey: string,
  from: string,
  to: string,
  html: string,
  subject: string
): Promise<{ ok: true } | { ok: false; detail: string }> {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from, to: [to], subject, html }),
  });

  if (res.ok) return { ok: true };

  const detail = await res.text().catch(() => `HTTP ${res.status}`);
  return { ok: false, detail };
}

export async function deliverReportEmail(params: {
  to: string;
  company: string | null;
  result: DiagnosisResult;
  submissionUid?: string | null;
}): Promise<{ sent: boolean; detail?: string }> {
  const config = getResendConfig();
  if (!config) {
    const missing = [
      !process.env.RESEND_API_KEY?.trim() ? "RESEND_API_KEY" : null,
      !process.env.EMAIL_FROM?.trim() ? "EMAIL_FROM" : null,
    ].filter(Boolean);
    console.error("send-report: missing env:", missing.join(", ") || "unknown");
    return { sent: false, detail: "resend_not_configured" };
  }

  const to = params.to.trim();
  const html = buildReportEmailHtml({
    company: params.company,
    result: params.result,
    submissionUid: params.submissionUid ?? null,
  });
  const subject = `[PRO ALI SMART] ISO 실행력 진단 리포트 — ${params.result.total}점 (${params.result.gradeName})`;

  let lastDetail = "";
  for (let attempt = 0; attempt < 2; attempt++) {
    if (attempt > 0) {
      await new Promise((r) => setTimeout(r, 1000));
    }
    const outcome = await sendViaResend(
      config.apiKey,
      config.from,
      to,
      html,
      subject
    );
    if (outcome.ok) return { sent: true };
    lastDetail = outcome.detail;
    console.error(`send-report attempt ${attempt + 1} failed:`, outcome.detail);
  }

  return { sent: false, detail: lastDetail };
}
