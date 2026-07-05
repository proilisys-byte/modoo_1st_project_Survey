import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null | undefined;

/** 환경변수가 설정된 경우에만 클라이언트를 생성한다 (미설정 시 로컬 미리보기 모드) */
export function getSupabase(): SupabaseClient | null {
  if (client !== undefined) return client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  client = url && key ? createClient(url, key) : null;
  return client;
}

export type SubmissionPayload = {
  submission_uid: string;
  answers: Record<string, unknown>;
  email: string;
  company: string | null;
  phone: string | null;
  score: number;
  grade: string;
  grade_code: string;
  grade_internal: string;
  pain_scores: Record<string, number>;
  attention_passed: boolean;
  duration_seconds: number;
  user_agent: string;
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

/** 결과 페이지 CTA(무료진단·상담·PoC) 신청 저장 */
export async function submitCtaRequest(
  payload: CtaPayload
): Promise<{ saved: boolean; error?: string }> {
  const supabase = getSupabase();
  if (!supabase) {
    return { saved: false, error: "Supabase 환경변수 미설정 (로컬 미리보기 모드)" };
  }
  const { error } = await supabase.from("cta_requests").insert(payload);
  if (error) return { saved: false, error: error.message };
  return { saved: true };
}
