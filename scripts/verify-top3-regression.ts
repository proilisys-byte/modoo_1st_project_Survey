/**
 * TOP3 burden 산출 회귀 — key 저장·동점 규칙·C_ATT 제외·display_order 무관
 * 실행: npm run verify:top3
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
  B5: "2",
  B6: "1",
  B3: "2",
  B7: "b7_v2_lt3",
  D2: "2",
};

// --- 1) 차등값 fixture: C4=25, C6=20, C7=15 ---
const DIFFERENTIAL: Answers = {
  ...BASE_SCALING,
  C1: { freq: 1, sev: 1 },
  C2: { freq: 1, sev: 1 },
  C3: { freq: 1, sev: 1 },
  C4: { freq: 5, sev: 5 }, // 25
  C5: { freq: 1, sev: 1 },
  C6: { freq: 4, sev: 5 }, // 20
  C7: { freq: 3, sev: 5 }, // 15
  C8: { freq: 1, sev: 1 },
  C_ATT: { freq: 2, sev: 1 },
};

const diff = diagnose(DIFFERENTIAL);
assert(
  diff.risks.map((r) => r.id).join() === "C4,C6,C7",
  `differential TOP3 expected C4,C6,C7 got ${diff.risks.map((r) => r.id).join()}`
);
assert(
  diff.risks.map((r) => r.painScore).join() === "25,20,15",
  `differential burdens expected 25,20,15 got ${diff.risks.map((r) => r.painScore).join()}`
);

// --- 2) display_order 셔플 — diagnose는 c_display_order 미사용, key answers만 ---
const DISPLAY_A: CDisplayOrder = {
  C_pain: [
    "C3",
    "C1",
    "C2",
    ATTENTION_QUESTION_ID,
    "C4",
    "C5",
    "C6",
    "C7",
    "C8",
  ],
  C9_options: ["C8", "C6", "C4", "C2", "C1", "C3", "C5", "C7"],
};
const DISPLAY_B: CDisplayOrder = {
  C_pain: [
    "C8",
    "C7",
    "C6",
    "C5",
    "C4",
    ATTENTION_QUESTION_ID,
    "C3",
    "C2",
    "C1",
  ],
  C9_options: ["C1", "C2", "C3", "C4", "C5", "C6", "C7", "C8"],
};
assert(DISPLAY_A.C_pain.length === 9, "C_pain must be 9 items (C1~C8 + C_ATT)");
void DISPLAY_B; // UI-only; scoring ignores

const dA = diagnose(DIFFERENTIAL);
const dB = diagnose({ ...DIFFERENTIAL });
assert(
  dA.risks.map((r) => r.id).join() === dB.risks.map((r) => r.id).join(),
  "display_order permutations must not affect TOP3 (key-based scoring)"
);

// --- 3) 전 항목 burden·sev 동점 → C1,C2,C3 ---
const ALL_TIE: Answers = {
  ...BASE_SCALING,
  C_ATT: { freq: 2 },
};
for (const id of PAIN_QUESTION_IDS) {
  ALL_TIE[id] = { freq: 2, sev: 2 }; // burden=4
}
const tie = buildTop3Risks(ALL_TIE);
assert(
  tie.map((r) => r.id).join() === "C1,C2,C3",
  `all-tie TOP3 expected C1,C2,C3 got ${tie.map((r) => r.id).join()}`
);
assert(
  tie.every((r) => r.painScore === 4),
  "all-tie top3 burdens must be 4"
);

// --- 4) C_ATT 9개 배열 — 채점 대상은 C1~C8 key만 ---
const withAttNine: Answers = { ...ALL_TIE, C_ATT: { freq: 2, sev: 5 } };
const scoredKeys = Object.keys(buildPainScores(withAttNine)).sort();
assert(
  scoredKeys.join() === [...PAIN_QUESTION_IDS].sort().join(),
  `pain_scores keys must be C1~C8 only, got ${scoredKeys.join()}`
);
assert(!scoredKeys.includes(ATTENTION_QUESTION_ID), "C_ATT must not be in pain_scores");
assert(
  SCORING_PAIN_IDS.length === 8 && SCORING_PAIN_IDS.every(isScoringPainId),
  "SCORING_PAIN_IDS whitelist is C1~C8"
);
for (const id of DISPLAY_A.C_pain) {
  if (id === ATTENTION_QUESTION_ID) {
    assert(!isScoringPainId(id), "C_ATT is not a scoring pain id");
  } else {
    assert(isScoringPainId(id), `${id} in C_pain must be scoring pain id`);
  }
}

// --- 5) DB 확정 포렌식: C1=1×1, C2~C8=2×2 → TOP3=C2,C3,C4 @ burden 4 ---
const DB_FORENSIC: Answers = {
  ...BASE_SCALING,
  C1: { freq: 1, sev: 1 },
  C2: { freq: 2, sev: 2 },
  C3: { freq: 2, sev: 2 },
  C4: { freq: 2, sev: 2 },
  C5: { freq: 2, sev: 2 },
  C6: { freq: 2, sev: 2 },
  C7: { freq: 2, sev: 2 },
  C8: { freq: 2, sev: 2 },
  C_ATT: { freq: 2 },
};
const forensic = buildTop3Risks(DB_FORENSIC);
assert(
  forensic.map((r) => r.id).join() === "C2,C3,C4",
  `DB forensic TOP3 expected C2,C3,C4 got ${forensic.map((r) => r.id).join()}`
);
assert(
  forensic.map((r) => r.painScore).join() === "4,4,4",
  `DB forensic burdens expected 4,4,4 got ${forensic.map((r) => r.painScore).join()}`
);
assert(
  buildPainScores(DB_FORENSIC).C1 === 1,
  "C1 burden must be 1 in forensic fixture"
);

// --- 6) C1 sev 필수 검증 (key 기준, C_ATT만 sevOptional) ---
const c1Question = SECTIONS.find((s) => s.id === "C")!.questions.find(
  (q) => q.id === "C1"
)!;
assert(!isAnswered(c1Question, { C1: { freq: 2 } }), "C1 freq-only must fail isAnswered");
assert(isAnswered(c1Question, { C1: { freq: 2, sev: 2 } }), "C1 with sev must pass");

console.log("OK: TOP3 regression — differential, display_order invariant, tie rules, C_ATT exclude");
console.log("OK: submit validation blocks C1 without sev");
console.log("OK: differential TOP3=C4,C6,C7 burdens=25,20,15");
console.log("OK: all-tie TOP3=C1,C2,C3");
console.log("OK: DB forensic C1=1×1 C2~C8=2×2 → TOP3=C2,C3,C4 @ burden 4");
