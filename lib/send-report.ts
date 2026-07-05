import type { ReportEmailPayload } from "@/lib/report-email";

/** 진단 리포트 이메일 발송 — 실패해도 설문 흐름은 막지 않는다 */
export async function sendReportEmail(
  payload: ReportEmailPayload
): Promise<{ sent: boolean; error?: string }> {
  try {
    const res = await fetch("/api/send-report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = (await res.json()) as { sent?: boolean; error?: string };
    if (!res.ok || !data.sent) {
      return { sent: false, error: data.error ?? "이메일 발송 실패" };
    }
    return { sent: true };
  } catch {
    return { sent: false, error: "네트워크 오류로 이메일을 보내지 못했습니다." };
  }
}
