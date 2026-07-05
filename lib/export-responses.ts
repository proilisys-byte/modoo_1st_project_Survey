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

/**
 * 문항별 고정 컬럼 순서 — CSV 헤더에 사용
 * dualScale(C1~C8, C_ATT): _freq, _sev 서브컬럼
 * matrix5(E1): 행별 서브컬럼 (a~f)
 * priceMatrix(E4): 행별 서브컬럼 (a~d)
 * multi(A3, C9, D2A, D3, E5): 쉼표 구분 문자열
 */
const QUESTION_COLUMNS: string[] = [
  // 섹션 A
  "A1", "A2", "A3", "A4", "A5", "A6",
  // 섹션 B
  "B1", "B2", "B3", "B3A", "q10_basis", "B4", "B5", "B6", "B7",
  // 섹션 C (dualScale → _freq, _sev 분리)
  "C1_freq", "C1_sev",
  "C2_freq", "C2_sev",
  "C3_freq", "C3_sev",
  "C4_freq", "C4_sev",
  "C_ATT_freq", "C_ATT_sev",
  "C5_freq", "C5_sev",
  "C6_freq", "C6_sev",
  "C7_freq", "C7_sev",
  "C8_freq", "C8_sev",
  "C9",
  // 섹션 D
  "D1", "D2", "D2A", "D3", "D4_gate", "D4_pain", "D5",
  // 섹션 E
  "E1_a", "E1_b", "E1_c", "E1_d", "E1_e", "E1_f",
  "E2",
  "E3",
  "E4_a", "E4_b", "E4_c", "E4_d",
  "E5", "E5A", "E6",
];

const DUAL_SCALE_IDS = new Set(["C1", "C2", "C3", "C4", "C_ATT", "C5", "C6", "C7", "C8"]);
const MATRIX_IDS: Record<string, string[]> = {
  E1: ["a", "b", "c", "d", "e", "f"],
  E4: ["a", "b", "c", "d"],
};

function flattenAnswer(
  answers: Record<string, unknown>,
  col: string
): string {
  // dualScale 서브컬럼 (예: C1_freq, C_ATT_sev)
  const dualMatch = col.match(/^(.+)_(freq|sev)$/);
  if (dualMatch) {
    const [, qid, sub] = dualMatch;
    if (DUAL_SCALE_IDS.has(qid)) {
      const val = answers[qid];
      if (val && typeof val === "object" && !Array.isArray(val)) {
        return String((val as Record<string, unknown>)[sub] ?? "");
      }
      return "";
    }
  }

  // matrix5 / priceMatrix 서브컬럼 (예: E1_a, E4_b)
  const matrixMatch = col.match(/^(E[14])_([a-f])$/);
  if (matrixMatch) {
    const [, qid, rowId] = matrixMatch;
    const val = answers[qid];
    if (val && typeof val === "object" && !Array.isArray(val)) {
      return String((val as Record<string, unknown>)[rowId] ?? "");
    }
    return "";
  }

  // 일반 문항
  const val = answers[col];
  if (val === undefined || val === null) return "";
  if (Array.isArray(val)) return val.join("|");
  if (typeof val === "object") return JSON.stringify(val);
  return String(val);
}

export function rowsToCsv(records: AnalysisExportRecord[]): string {
  if (records.length === 0) return "";

  // 메타 컬럼 + 문항별 개별 컬럼 + pain_scores + top3
  const metaHeaders = [
    "response_id",
    "created_at",
    "survey_version",
    "scoring_config_version",
    "duration_seconds",
    "attention_passed",
    "psm_inconsistent",
    "score",
    "grade_code",
    "d1",
    "d2",
    "d3",
    "d4",
    "email_status",
    "recomputed",
  ];

  const painHeaders = [
    "pain_C1", "pain_C2", "pain_C3", "pain_C4",
    "pain_C5", "pain_C6", "pain_C7", "pain_C8",
  ];

  const top3Headers = ["top3_1", "top3_2", "top3_3"];

  const allHeaders = [...metaHeaders, ...QUESTION_COLUMNS, ...painHeaders, ...top3Headers];

  const csvEscape = (v: string): string => {
    if (v.includes(",") || v.includes('"') || v.includes("\n")) {
      return `"${v.replace(/"/g, '""')}"`;
    }
    return v;
  };

  const lines = ["\uFEFF" + allHeaders.join(",")]; // BOM for Excel 한글 인코딩

  for (const r of records) {
    const answers = (r.answers ?? {}) as Record<string, unknown>;
    const painScores = r.pain_scores ?? {};
    const top3 = r.top3_computed ?? [];

    const metaValues = [
      r.response_id,
      r.created_at ?? "",
      r.survey_version,
      r.scoring_config_version,
      String(r.duration_seconds),
      String(r.attention_passed),
      String(r.psm_inconsistent),
      String(r.score),
      r.grade_code,
      String(r.d1),
      String(r.d2),
      String(r.d3),
      String(r.d4),
      r.email_status ?? "",
      String(r.recomputed),
    ];

    const questionValues = QUESTION_COLUMNS.map((col) => flattenAnswer(answers, col));

    const painValues = ["C1", "C2", "C3", "C4", "C5", "C6", "C7", "C8"].map(
      (id) => String(painScores[id] ?? "")
    );

    const top3Values = [0, 1, 2].map((i) => (top3[i] ? `${top3[i].id}(${top3[i].burden})` : ""));

    const row = [...metaValues, ...questionValues, ...painValues, ...top3Values].map(csvEscape);
    lines.push(row.join(","));
  }

  return lines.join("\n") + "\n";
}

