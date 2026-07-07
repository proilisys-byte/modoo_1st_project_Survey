import type { ReportEmailPayload } from "@/lib/report-email";
import { sendReportByUid } from "@/lib/send-report-by-uid";

const RESEND_KEY = "proali_resend_at_";

/** T-18: 15분당 1회 재발송 */
export async function resendReportEmail(
  submissionUid: string,
  payload?: Pick<ReportEmailPayload, "to" | "company" | "result">
): Promise<{ sent: boolean; rateLimited?: boolean }> {
  const key = `${RESEND_KEY}${submissionUid}`;
  try {
    const last = localStorage.getItem(key);
    if (last && Date.now() - Number(last) < 15 * 60 * 1000) {
      return { sent: false, rateLimited: true };
    }
  } catch {
    // localStorage 불가 시 서버 레이트리밋에 의존
  }

  try {
    const uidRes = await sendReportByUid(submissionUid, payload?.to?.trim());
    if (uidRes.sent) {
      try {
        localStorage.setItem(key, String(Date.now()));
      } catch {
        // 무시
      }
      return { sent: true };
    }

    if (!payload) return { sent: false };

    const res = await fetch("/api/resend-report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...payload, submission_uid: submissionUid }),
    });
    const data = (await res.json()) as { sent?: boolean };
    if (res.status === 429) return { sent: false, rateLimited: true };
    if (!res.ok || !data.sent) return { sent: false };
    try {
      localStorage.setItem(key, String(Date.now()));
    } catch {
      // 무시
    }
    return { sent: true };
  } catch {
    return { sent: false };
  }
}
