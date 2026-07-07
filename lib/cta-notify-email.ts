import { CTA_ITEMS } from "./cta-items";
import type { CtaType } from "./supabase";
import { getResendConfig } from "./resend-config";

export type CtaNotifyPayload = {
  submissionUid: string;
  ctaType: CtaType;
  email: string;
  /** survey_responses.contact_name */
  applicantName: string | null;
  company: string | null;
  /** survey_responses.job_title */
  jobTitle: string | null;
  phone: string | null;
  score: number;
  gradeCode: string;
};

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function ctaTitle(ctaType: CtaType): string {
  return CTA_ITEMS.find((c) => c.type === ctaType)?.title ?? ctaType;
}

export function getCtaNotifyEmail(): string | null {
  const to = process.env.CTA_NOTIFY_EMAIL?.trim();
  if (!to) return null;
  return to;
}

export function buildCtaNotifyHtml(payload: CtaNotifyPayload): string {
  const title = ctaTitle(payload.ctaType);
  const rows = [
    ["신청 유형", title],
    ["신청자 이름", payload.applicantName || "(미입력)"],
    ["회사명", payload.company || "(미입력)"],
    ["직책", payload.jobTitle || "(미입력)"],
    ["이메일", payload.email],
    ["연락처", payload.phone || "(미입력)"],
    ["진단 점수", `${payload.score}점`],
    ["등급 코드", payload.gradeCode],
    ["submission_uid", payload.submissionUid],
  ];

  const tableRows = rows
    .map(
      ([label, value]) =>
        `<tr>
          <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;color:#64748b;font-size:14px;white-space:nowrap;">${escapeHtml(label)}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;color:#0f172a;font-size:14px;">${escapeHtml(value)}</td>
        </tr>`
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="ko">
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:24px;background:#f1f5f9;font-family:'Malgun Gothic','Apple SD Gothic Neo',sans-serif;">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;border:1px solid #e2e8f0;padding:24px;">
    <p style="margin:0 0 4px;font-size:13px;font-weight:600;color:#2563eb;">PRO ALI SMART 설문</p>
    <h1 style="margin:0 0 16px;font-size:20px;color:#0f172a;">CTA 신청 알림 — ${escapeHtml(title)}</h1>
    <table style="width:100%;border-collapse:collapse;">${tableRows}</table>
    <p style="margin:16px 0 0;font-size:12px;color:#94a3b8;">Supabase Table Editor → cta_requests 에서 확인할 수 있습니다.</p>
  </div>
</body>
</html>`;
}

/** CTA 저장 후 관리자 알림 — 실패해도 신청 저장은 유지 */
export async function sendCtaAdminNotification(
  payload: CtaNotifyPayload
): Promise<boolean> {
  const config = getResendConfig();
  const to = getCtaNotifyEmail();
  if (!config || !to) {
    if (!to) console.error("cta-notify: CTA_NOTIFY_EMAIL not configured");
    return false;
  }

  const subject = `[PRO ALI SMART] CTA 신청 — ${ctaTitle(payload.ctaType)} (${payload.company || payload.email})`;
  const html = buildCtaNotifyHtml(payload);

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: config.from,
      to: [to],
      subject,
      html,
    }),
  });

  if (!res.ok) {
    console.error("cta-notify:", await res.text().catch(() => res.status));
    return false;
  }
  return true;
}
