import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { CDisplayOrder } from "./display-order";

let client: SupabaseClient | null | undefined;

/** 환경변수가 설정된 경우에만 클라이언트를 생성한다 (미설정 시 로컬 미리보기 모드) */
export function getSupabase(): SupabaseClient | null {
  if (client !== undefined) return client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  client = url && key ? createClient(url, key) : null;
  return client;
}

export type EmailStatus = "pending" | "sent" | "failed";

import type { ResultSnapshot } from "./result-snapshot";

export type SubmissionPayload = {
  submission_uid: string;
  answers: Record<string, unknown>;
  /** Table Editor용 한글 라벨 (응답 코드 → 텍스트) */
  answers_display?: Record<string, unknown>;
  email: string;
  contact_name: string;
  company: string | null;
  job_title: string;
  phone: string | null;
  score: number;
  grade: string;
  grade_code: string;
  grade_internal: string;
  pain_scores: Record<string, number>;
  attention_passed: boolean;
  duration_seconds: number;
  user_agent: string;
  /** T-17 v2 메타 */
  survey_version: string;
  started_at: string | null;
  submitted_at: string;
  consent_required: boolean;
  /** false면 마케팅 발송 대상에서 제외 */
  marketing_opt_in: boolean;
  email_status: EmailStatus;
  psm_inconsistent: boolean;
  scoring_config_version: string;
  c_display_order: CDisplayOrder | null;
  result_snapshot: ResultSnapshot | null;
};

/** 응답 저장 — 성공 여부를 반환하고 실패해도 UI 흐름은 막지 않는다 */
export async function submitResponse(
  payload: SubmissionPayload
): Promise<{ saved: boolean; error?: string }> {
  const supabase = getSupabase();
  if (!supabase) {
    return { saved: false, error: "Supabase 환경변수 미설정 (로컬 미리보기 모드)" };
  }
  const { error } = await supabase.from("survey_responses").insert(payload);
  if (error) return { saved: false, error: error.message };
  return { saved: true };
}

export type CtaType = "free_diagnosis" | "consulting" | "poc";

export type CtaPayload = {
  submission_uid: string;
  cta_type: CtaType;
  email: string;
  company: string | null;
  phone: string | null;
  score: number;
  grade_code: string;
};

/** 결과 페이지 CTA(무료진단·상담·PoC) 신청 저장 — 서버 API 경유(관리자 알림 포함) */
export async function submitCtaRequest(
  payload: CtaPayload
): Promise<{ saved: boolean; error?: string }> {
  try {
    const res = await fetch("/api/cta-request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        submission_uid: payload.submission_uid,
        cta_type: payload.cta_type,
        phone: payload.phone ?? undefined,
      }),
    });
    const data = (await res.json()) as { saved?: boolean; error?: string };
    if (!res.ok || !data.saved) {
      return { saved: false, error: data.error ?? "신청 저장 실패" };
    }
    return { saved: true };
  } catch {
    return { saved: false, error: "네트워크 오류" };
  }
}
