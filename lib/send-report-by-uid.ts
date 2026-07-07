/** DB 저장 후 서버에서 리포트 이메일 발송 (submission_uid 기준) */
export async function sendReportByUid(
  submissionUid: string,
  to?: string
): Promise<{ sent: boolean; status: "sent" | "failed" }> {
  try {
    const res = await fetch("/api/send-report-by-uid", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        submission_uid: submissionUid,
        ...(to ? { to } : {}),
      }),
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
