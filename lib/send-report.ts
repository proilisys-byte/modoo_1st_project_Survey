import type { ReportEmailPayload } from "@/lib/report-email";
import type { ReportSendResult } from "@/lib/send-report-by-uid";

/** 진단 리포트 이메일 발송 — 실패해도 설문 흐름은 막지 않는다 */
export async function sendReportEmail(
  payload: ReportEmailPayload
): Promise<ReportSendResult> {
  try {
    const res = await fetch("/api/send-report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = (await res.json()) as { sent?: boolean; error?: string };
    if (!res.ok || !data.sent) {
      return {
        sent: false,
        status: "failed",
        statusCode: res.status,
        error: data.error,
      };
    }
    return { sent: true, status: "sent" };
  } catch {
    return { sent: false, status: "failed", error: "네트워크 오류" };
  }
}
