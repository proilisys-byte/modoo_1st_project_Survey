/**
 * v03 smoke: answers_display 라벨 변환 + showIf 분기
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
  Q20: { first: "sys_capa", second: "sys_delivery" },
  "Q20-1": "q20_1_defect",
  "Q20-2": "pref_mes",
  "Q20-3": "pref_saas",
  F28: ["f28_roi", "f28_staff", "f28_data"],
  "F28-1_f28_roi": "f28_1_roi_effect",
  E25: { quality: "e25_excel", production: "e25_mes", delivery: "e25_erp" },
};

const display = buildAnswersDisplay(answers);
assert(SURVEY_VERSION === "v03", "SURVEY_VERSION must be v03");
assert(String(display.A1).includes("반도체 제조"), "A1 should display Korean label");
assert(String(display.A5).includes("영업"), "A5 should include sales/marketing option label");
assert(String(display.Q20).includes("1순위"), "Q20 should show rank order in display");
assert(String(display["Q20-2"]).includes("MES"), "Q20-2 should show label text");
assert(String(display.E25).includes("품질"), "E25 should show matrix row labels");

const order = createPainDisplayOrder();
const missing = findFirstUnansweredRequired(answers, order);
assert(missing !== null, "partial answers should still have missing fields");

console.log("OK: v03 smoke — answers_display labels + version");
