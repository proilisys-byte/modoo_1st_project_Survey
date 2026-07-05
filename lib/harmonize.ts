/**
 * v1↔v2 문항 조화(harmonization) 규칙 — analysis 파이프라인 참조용
 *
 * **원칙: v1·v2 혼합 분석에는 조대(coarse) 변수만 사용한다.**
 * v1 중첩·공백 구간을 v2 세부 key에 1:1로 매핑하지 않는다.
 *
 * Q14 (B7) man-day:
 * - v2: b7_v2_* 상호배타 구간
 * - v1: "3일 미만"/"7일 미만"/"12일 미만" 중첩 → 조대 `<12일` / `≥12일` / `unknown`만
 *
 * Q11 (B4) CAPA 완결 소요:
 * - v2: b4_v2_* (일수 절단 lib/boundaries.ts: 7/14/28일)
 * - v1: "2~3주"는 b4_v2_1_2w / b4_v2_2_4w 어느 쪽으로도 1:1 불가
 * - 공통 조대: `≤1주` / `1주 초과~4주 이하` / `4주 초과` + 상태형
 *
 * Q2 (A2) 규모: v1·v2 공통 3계층 소/중/대
 * Q29 (D4): v1 "받아본 적 없다" ≡ v2 D4_gate=없다
 */

export type SizeTier = "small" | "mid" | "large";

/** Q11 B4 — v1·v2 혼합 분석용 조대 기간 범주 */
export type B4DurationCoarse =
  | "lte1w" // ≤1주 (7일 이내)
  | "gt1w_lte4w" // 1주 초과 ~ 4주(28일) 이하
  | "gt4w" // 4주 초과
  | "status_effect_weak"
  | "status_not_operated";

/** Q14 B7 — v1·v2 혼합 분석용 조대 man-day 범주 */
export type B7ManDayCoarse = "lt12" | "ge12" | "unknown";

/** v1 B4 key/라벨 → 조대 범주 (1:1 v2 key 매핑 없음) */
export const B4_V1_TO_COARSE: Record<
  string,
  { label: string; coarse: B4DurationCoarse | null }
> = {
  "1": { label: "1주일 이내", coarse: "lte1w" },
  "2": {
    label: "2~3주",
    coarse: "gt1w_lte4w",
  },
  "3": { label: "1개월 이상", coarse: "gt4w" },
  "4": {
    label: "작성은 하지만 효과확인까지 가는 경우가 드물다",
    coarse: "status_effect_weak",
  },
  "5": {
    label: "정식 CAPA 절차 자체가 잘 운영되지 않는다",
    coarse: "status_not_operated",
  },
};

/** v2 B4 key/라벨 → 동일 조대 범주 */
export const B4_V2_TO_COARSE: Record<
  string,
  { label: string; coarse: B4DurationCoarse }
> = {
  b4_v2_lte1w: { label: "1주 이내", coarse: "lte1w" },
  b4_v2_1_2w: { label: "1~2주", coarse: "gt1w_lte4w" },
  b4_v2_2_4w: { label: "2~4주", coarse: "gt1w_lte4w" },
  b4_v2_gt4w: { label: "1개월(4주) 초과", coarse: "gt4w" },
  b4_v2_effect_weak: {
    label: "작성은 하지만 효과확인까지 가는 경우가 드물다",
    coarse: "status_effect_weak",
  },
  b4_v2_not_operated: {
    label: "정식 CAPA 절차 자체가 잘 운영되지 않는다",
    coarse: "status_not_operated",
  },
};

/** v1 B7 key/라벨 → 조대 man-day (중첩 구간은 lt12로만) */
export const B7_V1_TO_COARSE: Record<
  string,
  { label: string; coarse: B7ManDayCoarse }
> = {
  "1": { label: "3일 미만", coarse: "lt12" },
  "2": { label: "7일 미만", coarse: "lt12" },
  "3": { label: "12일 미만", coarse: "lt12" },
  "4": { label: "12일 이상", coarse: "ge12" },
  "5": { label: "모름", coarse: "unknown" },
  "6": { label: "전담자 상주근무", coarse: "unknown" },
};

/** v2 B7 key/라벨 → 동일 조대 man-day */
export const B7_V2_TO_COARSE: Record<
  string,
  { label: string; coarse: B7ManDayCoarse }
> = {
  b7_v2_lt3: { label: "3일 미만", coarse: "lt12" },
  b7_v2_3to6: { label: "3~6일", coarse: "lt12" },
  b7_v2_7to11: { label: "7~11일", coarse: "lt12" },
  b7_v2_ge12: { label: "12일 이상", coarse: "ge12" },
  b7_v2_unknown: { label: "모름", coarse: "unknown" },
};

const A2_V2_TIER: Record<string, SizeTier> = {
  a2_v2_1: "small",
  a2_v2_2: "small",
  a2_v2_3: "mid",
  a2_v2_4: "mid",
  a2_v2_5: "mid",
  a2_v2_6: "large",
};

const A2_V1_TIER: Record<string, SizeTier> = {
  "1": "small",
  "2": "mid",
  "3": "large",
  "4": "large",
  "5": "large",
};

export function harmonizeSizeTier(
  a2Value: string,
  surveyVersion: string
): SizeTier | null {
  if (surveyVersion === "v2") return A2_V2_TIER[a2Value] ?? null;
  return A2_V1_TIER[a2Value] ?? null;
}

/** v1 B4 → 조대 기간 (v1·v2 혼합 분석 전용) */
export function harmonizeB4DurationV1(value: string): B4DurationCoarse | null {
  return B4_V1_TO_COARSE[value]?.coarse ?? null;
}

/** v2 B4 → 동일 조대 기간 */
export function harmonizeB4DurationV2(value: string): B4DurationCoarse | null {
  return B4_V2_TO_COARSE[value]?.coarse ?? null;
}

export function harmonizeB4Duration(
  value: string,
  surveyVersion: string
): B4DurationCoarse | null {
  return surveyVersion === "v2"
    ? harmonizeB4DurationV2(value)
    : harmonizeB4DurationV1(value);
}

/** v1 B7 → 조대 man-day (중첩 구간 1·2·3 → lt12 통합) */
export function harmonizeB7ManDayV1(value: string): B7ManDayCoarse | null {
  return B7_V1_TO_COARSE[value]?.coarse ?? null;
}

/** v2 B7 → 동일 조대 man-day */
export function harmonizeB7ManDayV2(value: string): B7ManDayCoarse | null {
  return B7_V2_TO_COARSE[value]?.coarse ?? null;
}

export function harmonizeB7ManDay(
  value: string,
  surveyVersion: string
): B7ManDayCoarse | null {
  return surveyVersion === "v2"
    ? harmonizeB7ManDayV2(value)
    : harmonizeB7ManDayV1(value);
}
