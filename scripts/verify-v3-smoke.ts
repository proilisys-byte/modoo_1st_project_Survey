/**
 * v3 smoke: answers_display 라벨 변환 + showIf 분기
 * 실행: npx tsx scripts/verify-v3-smoke.ts
 */
import { buildAnswersDisplay } from "../lib/answers-display";
import { findFirstUnansweredRequired } from "../lib/question-utils";
import { createPainDisplayOrder } from "../lib/display-order";
import { SURVEY_VERSION } from "../lib/survey-meta";

function assert(cond: boolean, msg: string): void {
  if (!cond) {
    console.error(`FAIL: ${msg}`);
    process.exit(1);
  }
}

const answers: Record<string, unknown> = {
  A1: "0",
  A5: "6",
  C9: ["C1", "C2", "C3"],
  "C9-1_C1": "c9_1_std",
  "C9-2": "c9_2_audit",
  F4: { f4_a: 1, f4_b: 2, f4_c: 3, f4_d: 4 },
  "F0-3": "pref_erp",
  "F0-3-2": "pref_mes",
  E2: "1",
  "E2-1_budget": "e2_1_roi",
};

const display = buildAnswersDisplay(answers);
assert(SURVEY_VERSION === "v3", "SURVEY_VERSION must be v3");
assert(
  String(display.A1).includes("반도체 제조"),
  "A1 should display Korean label"
);
assert(
  String(display.A5).includes("영업"),
  "A5 should include sales/marketing option label"
);
assert(
  String(display.C9).includes("1순위"),
  "C9 should show rank order in display"
);
assert(
  String(display["F0-3-2"]).includes("MES"),
  "F0-3-2 should show label text"
);

const order = createPainDisplayOrder();
const missing = findFirstUnansweredRequired(answers, order);
assert(missing !== null, "partial answers should still have missing fields");

console.log("OK: v3 smoke — answers_display labels + version");
