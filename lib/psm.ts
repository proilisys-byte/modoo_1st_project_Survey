import type { Answers } from "./scoring";

const PSM_ROWS = ["a", "b", "c", "d"] as const;

/** F30 PSM 4행: 너무싸다 ≤ 합리적 ≤ 비싸다 ≤ 너무비싸다 순서 위반 여부 */
export function isPsmInconsistent(answers: Answers): boolean {
  const e4 = answers["F30"] as Record<string, number> | undefined;
  if (!e4) return false;

  const indices = PSM_ROWS.map((row) => e4[row]);
  if (indices.some((v) => typeof v !== "number")) return false;

  for (let i = 1; i < indices.length; i++) {
    if (indices[i] < indices[i - 1]) return true;
  }
  return false;
}
