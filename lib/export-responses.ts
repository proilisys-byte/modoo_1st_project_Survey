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
  
  const flat = records.map((r) => {
    const ans = r.answers || {};
    
    // 이중 척도(C1~C8, C_ATT) 파서 helper
    const parseDual = (val: unknown) => {
      if (val && typeof val === "object") {
        const obj = val as Record<string, unknown>;
        return {
          freq: obj.freq ?? "",
          sev: obj.sev ?? "",
        };
      }
      return { freq: "", sev: "" };
    };

    // 다중 선택 배열 파서 helper
    const parseMulti = (val: unknown): string => {
      if (Array.isArray(val)) {
        return val.join("; ");
      }
      return String(val ?? "");
    };

    // E1 matrix5 파서 helper
    const parseE1 = (val: unknown, subId: string): string => {
      if (val && typeof val === "object") {
        return String((val as Record<string, unknown>)[subId] ?? "");
      }
      return "";
    };

    // E4 priceMatrix 파서 helper
    const parseE4 = (val: unknown, subId: string): string => {
      if (val && typeof val === "object") {
        return String((val as Record<string, unknown>)[subId] ?? "");
      }
      return "";
    };

    const c1 = parseDual(ans.C1);
    const c2 = parseDual(ans.C2);
    const c3 = parseDual(ans.C3);
    const c4 = parseDual(ans.C4);
    const c_att = parseDual(ans.C_ATT);
    const c5 = parseDual(ans.C5);
    const c6 = parseDual(ans.C6);
    const c7 = parseDual(ans.C7);
    const c8 = parseDual(ans.C8);

    return {
      response_id: r.response_id,
      created_at: r.created_at ?? "",
      survey_version: r.survey_version,
      scoring_config_version: r.scoring_config_version,
      duration_seconds: r.duration_seconds,
      attention_passed: r.attention_passed,
      psm_inconsistent: r.psm_inconsistent,
      score: r.score,
      grade_code: r.grade_code,
      
      // 섹션 A
      A1: String(ans.A1 ?? ""),
      A2: String(ans.A2 ?? ""),
      A3: parseMulti(ans.A3),
      A4: String(ans.A4 ?? ""),
      A5: String(ans.A5 ?? ""),
      A6: String(ans.A6 ?? ""),
      
      // 섹션 B
      B1: String(ans.B1 ?? ""),
      B2: String(ans.B2 ?? ""),
      B3: String(ans.B3 ?? ""),
      B3A: String(ans.B3A ?? ""),
      q10_basis: String(ans.q10_basis ?? ""),
      B4: String(ans.B4 ?? ""),
      B5: String(ans.B5 ?? ""),
      B6: String(ans.B6 ?? ""),
      B7: String(ans.B7 ?? ""),
      
      // 섹션 C (듀얼스케일 쪼개기)
      C1_freq: c1.freq,
      C1_sev: c1.sev,
      C2_freq: c2.freq,
      C2_sev: c2.sev,
      C3_freq: c3.freq,
      C3_sev: c3.sev,
      C4_freq: c4.freq,
      C4_sev: c4.sev,
      C_ATT_freq: c_att.freq, // C_ATT는 영향도(sev)가 없음
      C5_freq: c5.freq,
      C5_sev: c5.sev,
      C6_freq: c6.freq,
      C6_sev: c6.sev,
      C7_freq: c7.freq,
      C7_sev: c7.sev,
      C8_freq: c8.freq,
      C8_sev: c8.sev,
      C9: parseMulti(ans.C9),
      
      // 섹션 D
      D1: String(ans.D1 ?? ""),
      D2: String(ans.D2 ?? ""),
      D2A: parseMulti(ans.D2A),
      D3: parseMulti(ans.D3),
      D4_gate: String(ans.D4_gate ?? ""),
      D4_pain: String(ans.D4_pain ?? ""),
      D5: String(ans.D5 ?? ""),
      
      // 섹션 E (매트릭스 쪼개기)
      E1_a: parseE1(ans.E1, "a"),
      E1_b: parseE1(ans.E1, "b"),
      E1_c: parseE1(ans.E1, "c"),
      E1_d: parseE1(ans.E1, "d"),
      E1_e: parseE1(ans.E1, "e"),
      E1_f: parseE1(ans.E1, "f"),
      E2: String(ans.E2 ?? ""),
      E3: String(ans.E3 ?? ""),
      E4_a: parseE4(ans.E4, "a"),
      E4_b: parseE4(ans.E4, "b"),
      E4_c: parseE4(ans.E4, "c"),
      E4_d: parseE4(ans.E4, "d"),
      E5: parseMulti(ans.E5),
      E5A: String(ans.E5A ?? ""),
      E6: String(ans.E6 ?? "")
    };
  });

  const headers = Object.keys(flat[0]);
  const lines = [headers.join(",")];
  for (const row of flat) {
    lines.push(
      headers
          .map((h) => {
            const v = String((row as Record<string, unknown>)[h] ?? "");
            // CSV 이스케이프: 쌍따옴표가 있거나 컴마가 있으면 감싸줌
            return v.includes(",") || v.includes('"') || v.includes("\n") || v.includes("\r")
              ? `"${v.replace(/"/g, '""')}"`
              : v;
          })
          .join(",")
    );
  }
  return lines.join("\n") + "\n";
}
