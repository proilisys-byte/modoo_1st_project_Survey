import type { CtaType } from "./supabase";

/** 결과 페이지 CTA 신청 취소 — 서버 API(service role) 경유 */
export async function cancelCtaRequest(payload: {
  submission_uid: string;
  cta_type: CtaType;
}): Promise<{ cancelled: boolean; error?: string }> {
  try {
    const res = await fetch("/api/cancel-cta", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = (await res.json()) as {
      cancelled?: boolean;
      error?: string;
    };
    if (!res.ok || !data.cancelled) {
      return { cancelled: false, error: data.error ?? "신청 해제 실패" };
    }
    return { cancelled: true };
  } catch {
    return { cancelled: false, error: "네트워크 오류" };
  }
}
