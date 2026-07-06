/**
 * findFirstUnansweredRequired — 정당한 생략·선택 항목은 제출 허용
 * 실행: npm run verify:submit
 */
import {
  ATTENTION_QUESTION_ID,
  createPainDisplayOrder,
  type CDisplayOrder,
} from "../lib/display-order";
import { findFirstUnansweredRequired } from "../lib/question-utils";
import type { Answers } from "../lib/scoring";

function assert(cond: boolean, msg: string): void {
  if (!cond) {
    console.error(`FAIL: ${msg}`);
    process.exit(1);
  }
}

function matrixFilled(
  rows: string[],
  value = 3
): Record<string, number> {
  return Object.fromEntries(rows.map((id) => [id, value]));
}

/** 전 섹션 필수 문항 최소 충족 answers (v3 — Deep Dive 최소 경로) */
function completeSurveyAnswers(): Answers {
  return {
    A1: "0",
    A2: "a2_v2_3",
    A3: ["1"],
    A4: "2",
    A5: "1",
    A6: "3",
    B1: "2",
    B2: "3",
    B3: "2",
    B3A: "2",
    q10_basis: "q10_basis_qty",
    B4: "b4_v2_lte1w",
    B5: "2",
    B6: "1",
    B7: "b7_v2_lt3",
    C1: { freq: 2, sev: 2 },
    C2: { freq: 2, sev: 2 },
    C3: { freq: 2, sev: 2 },
    C4: { freq: 2, sev: 2 },
    C_ATT: { freq: 2 },
    C5: { freq: 2, sev: 2 },
    C6: { freq: 2, sev: 2 },
    C7: { freq: 2, sev: 2 },
    C8: { freq: 2, sev: 2 },
    C9: ["C4", "C5", "C6"],
    "C9-1_C4": "c9_1_lot",
    "C9-2": "c9_2_audit",
    F4: { f4_a: 1, f4_b: 2, f4_c: 3, f4_d: 4 },
    D1: "2",
    D2: "3",
    D2A: ["none"],
    D3: ["1", "3"],
    D4_gate: "no",
    "F0-Q1": "f0_q_manual",
    "F0-Q2": "f0_p_manual",
    "F0-Q3": "f0_d_oral",
    "F0-3": "pref_tbd",
    "F0-3-1": ["f0_3_1_cost"],
    "F0-4": "data_none",
    "F5-1": ["f5_1_roi", "f5_1_staff", "f5_1_data"],
    F6: "mvp_tbd",
    E1: matrixFilled(["a", "b", "c", "d", "e", "f"]),
    E2: "6",
    E3: "4",
    E4: { a: 1, b: 2, c: 3, d: 4 },
    E5: "2",
    E6: "2",
  };
}

const displayOrder: CDisplayOrder = createPainDisplayOrder();

// --- C_ATT sev 미입력 허용 ---
const attOnlyFreq = completeSurveyAnswers();
const attMissing = findFirstUnansweredRequired(attOnlyFreq, displayOrder);
assert(
  attMissing === null,
  `C_ATT freq-only (no sev) must not block submit (blocked by ${attMissing})`
);

// --- 회사명 공란: contact는 findFirstUnansweredRequired 범위 밖 ---
void attOnlyFreq;

// --- D5·E5A 자유응답 공란 (required: false) ---
const noOptionalText = completeSurveyAnswers();
assert(
  findFirstUnansweredRequired(noOptionalText, displayOrder) === null,
  "optional text (D5, E5A) blank must not block submit"
);

// --- B3A=6 → q10_basis 숨김, 미응답 허용 ---
const b3aUnknown = completeSurveyAnswers();
b3aUnknown.B3A = "6";
delete b3aUnknown.q10_basis;
assert(
  findFirstUnansweredRequired(b3aUnknown, displayOrder) === null,
  "hidden q10_basis when B3A=6 must not block submit"
);

// --- D4_gate=no → D4_pain 숨김 ---
const d4Skipped = completeSurveyAnswers();
d4Skipped.D4_gate = "no";
delete d4Skipped.D4_pain;
assert(
  findFirstUnansweredRequired(d4Skipped, displayOrder) === null,
  "hidden D4_pain when gate=no must not block submit"
);

// --- E3/E6 비적극 → phone은 contact 검증(별도) — answers 검증 통과 ---
const noPhoneAnswers = completeSurveyAnswers();
noPhoneAnswers.E3 = "4";
noPhoneAnswers.E6 = "2";
assert(
  findFirstUnansweredRequired(noPhoneAnswers, displayOrder) === null,
  "E3/E6 not requiring phone must pass answers validation"
);

// --- C1 sev 누락은 여전히 차단 ---
const c1MissingSev = completeSurveyAnswers();
c1MissingSev.C1 = { freq: 2 };
assert(
  findFirstUnansweredRequired(c1MissingSev, displayOrder) === "C1",
  "C1 without sev must still block submit"
);

console.log("OK: submit validation — C_ATT sev optional");
console.log("OK: submit validation — optional text blank (D5, E5A)");
console.log("OK: submit validation — conditional hidden (q10_basis, D4_pain)");
console.log("OK: submit validation — E3/E6 phone not in answers gate");
console.log("OK: submit validation — C1 sev still required");
