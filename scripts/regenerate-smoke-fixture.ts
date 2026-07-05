/**
 * T-17 / [02-smoke]: smoke_fixture.jsonl 재생성
 * lib/export-responses.ts toAnalysisExport() 경로 사용 (PII 제외)
 *
 * 실행: npx tsx scripts/regenerate-smoke-fixture.ts
 */
import { writeFileSync } from "fs";
import { join } from "path";
import {
  rowsToJsonl,
  toAnalysisExport,
  type SurveyResponseRow,
} from "../lib/export-responses";

/** DB 형태 시드 (PII 포함 — export 시 제거됨) */
const SEED: SurveyResponseRow[] = [
  {
    id: "smoke-001",
    submission_uid: "uid-smoke-001",
    created_at: "2026-07-05T10:00:00Z",
    email: "user@example.com",
    company: "테스트 제조",
    job_title: "품질팀장",
    phone: "010-0000-0001",
    answers: {
      B2: "3",
      B4: "b4_v2_1_2w",
      B7: "b7_v2_3to6",
      A1: "3",
      A2: "a2_v2_3",
      C1: { freq: 3, sev: 4 },
      C2: { freq: 3, sev: 3 },
      C3: { freq: 4, sev: 4 },
      C4: { freq: 2, sev: 5 },
      C5: { freq: 2, sev: 4 },
      C6: { freq: 3, sev: 5 },
      C7: { freq: 3, sev: 4 },
      C8: { freq: 2, sev: 4 },
      C_ATT: { freq: 2, sev: 1 },
    },
    score: 0,
    grade_code: "B",
    pain_scores: {},
    attention_passed: true,
    duration_seconds: 620,
    survey_version: "v2",
    scoring_config_version: "v2",
    psm_inconsistent: false,
  },
  {
    id: "smoke-002",
    submission_uid: "uid-smoke-002",
    email: "fail@example.com",
    company: "스트레스 테스트",
    job_title: "테스트",
    phone: "010-0000-0002",
    answers: {
      A1: "1",
      A2: "a2_v2_1",
      B7: "b7_v2_ge12",
      C1: { freq: 5, sev: 4 },
      C2: { freq: 5, sev: 4 },
      C3: { freq: 5, sev: 4 },
      C4: { freq: 5, sev: 4 },
      C5: { freq: 5, sev: 4 },
      C6: { freq: 5, sev: 4 },
      C7: { freq: 5, sev: 4 },
      C8: { freq: 5, sev: 4 },
      C_ATT: { freq: 5, sev: 5 },
    },
    score: 0,
    grade_code: "D",
    pain_scores: {},
    attention_passed: false,
    duration_seconds: 90,
    survey_version: "v2",
    scoring_config_version: "v2",
    psm_inconsistent: true,
  },
  {
    id: "smoke-003",
    submission_uid: "uid-smoke-003",
    email: "ok@example.com",
    company: "샘플 B",
    job_title: "대리",
    phone: null,
    answers: {
      B2: "2",
      B3: "2",
      B4: "b4_v2_2_4w",
      B5: "3",
      B6: "2",
      B7: "b7_v2_7to11",
      D2: "3",
      A1: "3",
      A2: "a2_v2_4",
      C1: { freq: 2, sev: 5 },
      C2: { freq: 2, sev: 4 },
      C3: { freq: 3, sev: 4 },
      C4: { freq: 3, sev: 3 },
      C5: { freq: 2, sev: 3 },
      C6: { freq: 2, sev: 4 },
      C7: { freq: 2, sev: 5 },
      C8: { freq: 2, sev: 3 },
      C_ATT: { freq: 2, sev: 2 },
    },
    score: 0,
    grade_code: "B",
    pain_scores: {},
    attention_passed: true,
    duration_seconds: 540,
    survey_version: "v2",
    scoring_config_version: "v2",
    psm_inconsistent: false,
  },
];

const exported = SEED.map(toAnalysisExport);
const outPath = join(process.cwd(), "analysis/data/raw/smoke_fixture.jsonl");
writeFileSync(outPath, rowsToJsonl(exported), "utf8");

console.log(`OK: wrote ${exported.length} rows -> ${outPath}`);
for (const r of exported) {
  console.log(
    `  ${r.response_id}: score=${r.score} grade=${r.grade_code} d1=${r.d1} d2=${r.d2} d3=${r.d3} d4=${r.d4}`
  );
}
