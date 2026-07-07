/**
 * TOP3 burden 산출 회귀 — v03 P14~P18
 */
import {
  ATTENTION_QUESTION_ID,
  PAIN_QUESTION_IDS,
  type CDisplayOrder,
} from "../lib/display-order";
import { SECTIONS } from "../lib/questions";
import { isAnswered } from "../lib/question-utils";
import {
  buildPainScores,
  buildTop3Risks,
  diagnose,
  isScoringPainId,
  SCORING_PAIN_IDS,
  type Answers,
} from "../lib/scoring";

function assert(cond: boolean, msg: string): void {
  if (!cond) {
    console.error(`FAIL: ${msg}`);
    process.exit(1);
  }
}

const BASE_SCALING: Answers = {
  B2: "3",
  B4: "b4_v2_lte1w",
  B6: "1",
  B3: "2",
  B7: "b7_v2_lt3",
  E25: { quality: "e25_qms", production: "e25_mes", delivery: "e25_erp" },
};

const DIFFERENTIAL: Answers = {
  ...BASE_SCALING,
  P14: { freq: 1, sev: 1 },
  P15: { freq: 1, sev: 1 },
  P16: { freq: 5, sev: 5 },
  P17: { freq: 4, sev: 5 },
  P18: { freq: 3, sev: 5 },
  C_ATT: { freq: 2, sev: 1 },
};

const diff = diagnose(DIFFERENTIAL);
assert(
  diff.risks.map((r) => r.id).join() === "P16,P17,P18",
  `differential TOP3 expected P16,P17,P18 got ${diff.risks.map((r) => r.id).join()}`
);
assert(
  diff.risks.map((r) => r.painScore).join() === "25,20,15",
  `differential burdens expected 25,20,15 got ${diff.risks.map((r) => r.painScore).join()}`
);

const DISPLAY_A: CDisplayOrder = {
  C_pain: ["P15", "P14", "P16", ATTENTION_QUESTION_ID, "P17", "P18"],
};
const DISPLAY_B: CDisplayOrder = {
  C_pain: ["P18", "P17", "P16", "P15", ATTENTION_QUESTION_ID, "P14"],
};
assert(DISPLAY_A.C_pain.length === 6, "C_pain must be 6 items (P14~P18 + C_ATT)");
void DISPLAY_B;

const dA = diagnose(DIFFERENTIAL);
const dB = diagnose({ ...DIFFERENTIAL });
assert(
  dA.risks.map((r) => r.id).join() === dB.risks.map((r) => r.id).join(),
  "display_order permutations must not affect TOP3 (key-based scoring)"
);

const ALL_TIE: Answers = { ...BASE_SCALING, C_ATT: { freq: 2 } };
for (const id of PAIN_QUESTION_IDS) {
  ALL_TIE[id] = { freq: 2, sev: 2 };
}
const tie = buildTop3Risks(ALL_TIE);
assert(
  tie.map((r) => r.id).join() === "P14,P15,P16",
  `all-tie TOP3 expected P14,P15,P16 got ${tie.map((r) => r.id).join()}`
);

const withAtt: Answers = { ...ALL_TIE, C_ATT: { freq: 2, sev: 5 } };
const scoredKeys = Object.keys(buildPainScores(withAtt)).sort();
assert(
  scoredKeys.join() === [...PAIN_QUESTION_IDS].sort().join(),
  `pain_scores keys must be P14~P18 only, got ${scoredKeys.join()}`
);
assert(!scoredKeys.includes(ATTENTION_QUESTION_ID), "C_ATT must not be in pain_scores");
assert(
  SCORING_PAIN_IDS.length === 5 && SCORING_PAIN_IDS.every(isScoringPainId),
  "SCORING_PAIN_IDS whitelist is P14~P18"
);

const p14Question = SECTIONS.find((s) => s.id === "C")!.questions.find(
  (q) => q.id === "P14"
)!;
assert(!isAnswered(p14Question, { P14: { freq: 2 } }), "P14 freq-only must fail isAnswered");
assert(isAnswered(p14Question, { P14: { freq: 2, sev: 2 } }), "P14 with sev must pass");

console.log("OK: TOP3 regression — differential, display_order invariant, tie rules, C_ATT exclude");
console.log("OK: differential TOP3=P16,P17,P18 burdens=25,20,15");
console.log("OK: all-tie TOP3=P14,P15,P16");
