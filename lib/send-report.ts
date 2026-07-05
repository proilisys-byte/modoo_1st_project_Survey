import type { ReportEmailPayload } from "@/lib/report-email";

/** 진단 리포트 이메일 발송 — 실패해도 설문 흐름은 막지 않는다 */
export async function sendReportEmail(
  payload: ReportEmailPayload
): Promise<{ sent: boolean; status: "sent" | "failed" }> {
  try {
    const res = await fetch("/api/send-report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = (await res.json()) as { sent?: boolean };
    if (!res.ok || !data.sent) {
      return { sent: false, status: "failed" };
    }
    return { sent: true, status: "sent" };
  } catch {
    return { sent: false, status: "failed" };
  }
}
