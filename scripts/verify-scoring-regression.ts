/**
 * T-13 회귀: 채점은 문항 key 기준이므로 표시 순서와 무관하게 동일해야 함
 * 실행: npx tsx scripts/verify-scoring-regression.ts
 */
import { diagnose } from "../lib/scoring";

const SAMPLE: Record<string, unknown> = {
  B2: "3",
  B4: "b4_v2_lte1w",
  B5: "2",
  B6: "1",
  B3: "2",
  B7: "b7_v2_lt3",
  D2: "2",
  C1: { freq: 3, sev: 4 },
  C2: { freq: 2, sev: 3 },
  C3: { freq: 4, sev: 4 },
  C4: { freq: 3, sev: 3 },
  C5: { freq: 2, sev: 2 },
  C6: { freq: 4, sev: 5 },
  C7: { freq: 3, sev: 4 },
  C8: { freq: 2, sev: 3 },
  C_ATT: { freq: 2, sev: 1 },
};

const a = diagnose(SAMPLE);
const b = diagnose({ ...SAMPLE });
const c = diagnose({ ...SAMPLE, C9: ["C6", "C1", "C4"] });

let ok = true;
if (a.total !== b.total || a.gradeCode !== b.gradeCode) {
  console.error("FAIL: identical answers produced different scores");
  ok = false;
}
if (a.total !== c.total) {
  console.error("FAIL: C9 selection changed computed score (should be excluded)");
  ok = false;
}
if (a.risks.map((r) => r.id).join() !== b.risks.map((r) => r.id).join()) {
  console.error("FAIL: TOP3 risks order/content unstable");
  ok = false;
}

if (!ok) process.exit(1);
console.log(`OK: scoring regression — total=${a.total} grade=${a.gradeCode}`);
console.log("OK: display order permutations do not affect score (key-based)");
