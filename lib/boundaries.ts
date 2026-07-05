/**
 * Q11(B4)·Q14(B7) 구간형 보기 — 일수 절단 규칙 (단위테스트·분석 조화의 단일 기준)
 *
 * Q11 CAPA 완결 소요 (b4_v2_* duration keys only):
 *   b4_v2_lte1w  → 0~7일   (≤7일,  "1주 이내")
 *   b4_v2_1_2w   → 8~14일  ("1~2주")
 *   b4_v2_2_4w   → 15~28일 ("2~4주", 4주=28일)
 *   b4_v2_gt4w   → 29일+   ("1개월(4주) 초과")
 *   b4_v2_effect_weak / b4_v2_not_operated → 일수 매핑 없음 (상태형)
 *
 * v1 B4 key "1"~"5"는 deprecated. v1 "2"(2~3주)는 v2 구간으로 분해 불가 →
 *   벤치마크 조화 시 b4_v2_1_2w | b4_v2_2_4w | b4_v2_gt4w 조대 범주만 사용.
 *
 * Q14 Audit man-day (b7_v2_*):
 *   b7_v2_lt3       → 0~2일
 *   b7_v2_3to6      → 3~6일
 *   b7_v2_7to11     → 7~11일
 *   b7_v2_ge12      → 12일+
 */

export type DayRange = { key: string; min: number; max: number };

/** Q11 — 기간형 보기만 (상태형 제외) */
export const B4_DURATION_RANGES: DayRange[] = [
  { key: "b4_v2_lte1w", min: 0, max: 7 },
  { key: "b4_v2_1_2w", min: 8, max: 14 },
  { key: "b4_v2_2_4w", min: 15, max: 28 },
  { key: "b4_v2_gt4w", min: 29, max: 999 },
];

export const B4_STATUS_KEYS = ["b4_v2_effect_weak", "b4_v2_not_operated"] as const;

/** Q14 — man-day (특수 보기 제외) */
export const B7_MAN_DAY_RANGES: DayRange[] = [
  { key: "b7_v2_lt3", min: 0, max: 2 },
  { key: "b7_v2_3to6", min: 3, max: 6 },
  { key: "b7_v2_7to11", min: 7, max: 11 },
  { key: "b7_v2_ge12", min: 12, max: 999 },
];

export const B7_SPECIAL_KEYS = ["b7_v2_unknown"] as const;

export function mapDaysToRange(
  days: number,
  ranges: DayRange[]
): string | null {
  const hits = ranges.filter((r) => days >= r.min && days <= r.max);
  return hits.length === 1 ? hits[0].key : null;
}
