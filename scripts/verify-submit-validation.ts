/**
 * findFirstUnansweredRequired — v03 정당한 생략·선택 항목은 제출 허용
 * 실행: npm run verify:submit
 */
import { createPainDisplayOrder, CANONICAL_C_PAIN_ORDER, type CDisplayOrder } from "../lib/display-order";
import { findFirstUnansweredRequired } from "../lib/question-utils";
import type { Answers } from "../lib/scoring";

function assert(cond: boolean, msg: string): void {
  if (!cond) {
    console.error(`FAIL: ${msg}`);
    process.exit(1);
  }
}

function matrixFilled(rows: string[], value = 3): Record<string, number> {
  return Object.fromEntries(rows.map((id) => [id, value]));
}

/** v03 전 섹션 필수 문항 최소 충족 answers (Deep Dive 최소 경로) */
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
    B6: "1",
    B7: "b7_v2_lt3",
    P14: { freq: 2, sev: 2 },
    P15: { freq: 2, sev: 2 },
    P16: { freq: 2, sev: 2 },
    P17: { freq: 2, sev: 2 },
    P18: { freq: 2, sev: 2 },
    C_ATT: { freq: 2 },
    Q20: { first: "sys_capa", second: "sys_delivery" },
    "Q20-1": "q20_1_defect",
    "Q20-2": "pref_qms",
    D1: "2",
    D3: ["1", "3"],
    D4: "d4_no",
    E25: {
      quality: "e25_unknown",
      production: "e25_unknown",
      delivery: "e25_unknown",
    },
    E26: "e26_none",
    F27: matrixFilled(["a", "b", "c"]),
    F28: ["f28_roi", "f28_staff", "f28_data"],
    "F28-1_f28_roi": "f28_1_roi_effect",
    F29: "4",
    F30: { a: 1, b: 2, c: 3, d: 4 },
    F31: "2",
    F32: "4",
    F34: "2",
  };
}

const displayOrder: CDisplayOrder = createPainDisplayOrder();

assert(
  displayOrder.C_pain.every((id, i) => id === CANONICAL_C_PAIN_ORDER[i]),
  "section C order must be P14~P18 then C_ATT (18=P18, 19=C_ATT)"
);

const attOnlyFreq = completeSurveyAnswers();
assert(
  findFirstUnansweredRequired(attOnlyFreq, displayOrder) === null,
  "C_ATT freq-only (no sev) must not block submit"
);

const noOptionalText = completeSurveyAnswers();
assert(
  findFirstUnansweredRequired(noOptionalText, displayOrder) === null,
  "optional text (D5, F33) blank must not block submit"
);

const b3aUnknown = completeSurveyAnswers();
b3aUnknown.B3A = "6";
delete b3aUnknown.q10_basis;
assert(
  findFirstUnansweredRequired(b3aUnknown, displayOrder) === null,
  "hidden q10_basis when B3A=6 must not block submit"
);

const noPhoneAnswers = completeSurveyAnswers();
noPhoneAnswers.F29 = "4";
noPhoneAnswers.F34 = "2";
assert(
  findFirstUnansweredRequired(noPhoneAnswers, displayOrder) === null,
  "F29/F34 not requiring phone must pass answers validation"
);

const p14MissingSev = completeSurveyAnswers();
p14MissingSev.P14 = { freq: 2 };
assert(
  findFirstUnansweredRequired(p14MissingSev, displayOrder) === "P14",
  "P14 without sev must still block submit"
);

console.log("OK: submit validation — C_ATT sev optional");
console.log("OK: submit validation — optional text blank (D5, F33)");
console.log("OK: submit validation — conditional hidden (q10_basis)");
console.log("OK: submit validation — F29/F34 phone not in answers gate");
console.log("OK: submit validation — P14 sev still required");
