/**
 * T-17: PII 제외 분석용 export — result_snapshot 우선, 없으면 재계산(recomputed=true)
 */
import { resolveResult } from "./resolve-result";
import type { Answers } from "./scoring";
import type { ResultSnapshot } from "./result-snapshot";

/** DB survey_responses 행 (PII 필드 포함 가능 — export 시 제외) */
export type SurveyResponseRow = {
  id: string;
  submission_uid?: string | null;
  created_at?: string;
  answers: Answers;
  email?: string;
  company?: string | null;
  job_title?: string | null;
  phone?: string | null;
  score: number;
  grade?: string;
  grade_code: string;
  grade_internal?: string | null;
  pain_scores: Record<string, number>;
  attention_passed: boolean;
  duration_seconds: number;
  user_agent?: string | null;
  survey_version?: string | null;
  started_at?: string | null;
  submitted_at?: string | null;
  consent_required?: boolean | null;
  marketing_opt_in?: boolean | null;
  email_status?: string | null;
  email_error?: string | null;
  psm_inconsistent?: boolean | null;
  scoring_config_version?: string | null;
  benchmark_version?: string | null;
  c_display_order?: unknown;
  result_snapshot?: ResultSnapshot | null;
};

/** analysis/data/raw/*.jsonl 한 줄 형식 (PII 없음) */
export type AnalysisExportRecord = {
  response_id: string;
  survey_version: string;
  scoring_config_version: string;
  duration_seconds: number;
  attention_passed: boolean;
  psm_inconsistent: boolean;
  score: number;
  grade_code: string;
  d1: number;
  d2: number;
  d3: number;
  d4: number;
  pain_scores: Record<string, number>;
  answers: Answers;
  created_at?: string;
  submission_uid?: string | null;
  consent_required?: boolean | null;
  marketing_opt_in?: boolean | null;
  email_status?: string | null;
  c_display_order?: unknown;
  benchmark_version?: string | null;
  recomputed: boolean;
  top3_computed: Array<{ id: string; burden: number; short: string }>;
};

const PII_FIELDS = ["email", "phone", "company", "job_title"] as const;

export function toAnalysisExport(row: SurveyResponseRow): AnalysisExportRecord {
  const resolved = resolveResult({
    answers: row.answers,
    result_snapshot: row.result_snapshot,
    scoring_config_version: row.scoring_config_version,
  });
  return {
    response_id: row.id || row.submission_uid || "unknown",
    survey_version: row.survey_version ?? "v2",
    scoring_config_version: resolved.scoring_config_version,
    duration_seconds: row.duration_seconds,
    attention_passed: row.attention_passed,
    psm_inconsistent: Boolean(row.psm_inconsistent),
    score: resolved.total,
    grade_code: resolved.grade_code,
    d1: resolved.d1,
    d2: resolved.d2,
    d3: resolved.d3,
    d4: resolved.d4,
    pain_scores: resolved.pain_scores,
    top3_computed: resolved.top3_computed,
    recomputed: resolved.recomputed,
    answers: row.answers,
    created_at: row.created_at,
    submission_uid: row.submission_uid,
    consent_required: row.consent_required,
    marketing_opt_in: row.marketing_opt_in,
    email_status: row.email_status,
    c_display_order: row.c_display_order,
    benchmark_version: row.benchmark_version,
  };
}

export function stripPii<T extends Record<string, unknown>>(row: T): Omit<T, (typeof PII_FIELDS)[number]> {
  const out = { ...row };
  for (const f of PII_FIELDS) {
    delete out[f];
  }
  return out as Omit<T, (typeof PII_FIELDS)[number]>;
}

export function rowsToJsonl(records: AnalysisExportRecord[]): string {
  return records.map((r) => JSON.stringify(r)).join("\n") + (records.length ? "\n" : "");
}

export function rowsToCsv(records: AnalysisExportRecord[]): string {
  if (records.length === 0) return "";
  const flat = records.map((r) => ({
    response_id: r.response_id,
    survey_version: r.survey_version,
    scoring_config_version: r.scoring_config_version,
    duration_seconds: r.duration_seconds,
    attention_passed: r.attention_passed,
    psm_inconsistent: r.psm_inconsistent,
    score: r.score,
    grade_code: r.grade_code,
    d1: r.d1,
    d2: r.d2,
    d3: r.d3,
    d4: r.d4,
    pain_scores: JSON.stringify(r.pain_scores),
    answers: JSON.stringify(r.answers),
    created_at: r.created_at ?? "",
  }));
  const headers = Object.keys(flat[0]);
  const lines = [headers.join(",")];
  for (const row of flat) {
    lines.push(
      headers
        .map((h) => {
          const v = String((row as Record<string, unknown>)[h] ?? "");
          return v.includes(",") || v.includes('"') ? `"${v.replace(/"/g, '""')}"` : v;
        })
        .join(",")
    );
  }
  return lines.join("\n") + "\n";
}
