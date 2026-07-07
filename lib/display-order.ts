/** 섹션 C Pain 항목 id (P14~P18) */
export const PAIN_QUESTION_IDS = [
  "P14",
  "P15",
  "P16",
  "P17",
  "P18",
] as const;

export const ATTENTION_QUESTION_ID = "C_ATT";

/** Q20 시스템 우선순위 — 채점 제외, 탐색용 */
export const SYSTEM_RANK_QUESTION_ID = "Q20";

/** DB c_display_order jsonb 구조 */
export type CDisplayOrder = {
  /** P14~P18 + C_ATT 표시 순서 */
  C_pain: string[];
};

/** P14~P18 고정 순서 + C_ATT(19번)를 P18(18번) 뒤에 배치 */
export const CANONICAL_C_PAIN_ORDER: string[] = [
  ...PAIN_QUESTION_IDS,
  ATTENTION_QUESTION_ID,
];

export function buildSectionCPainOrder(): string[] {
  return [...CANONICAL_C_PAIN_ORDER];
}

export function createPainDisplayOrder(): CDisplayOrder {
  return { C_pain: buildSectionCPainOrder() };
}

export function createDisplayOrder(partial?: Partial<CDisplayOrder>): CDisplayOrder {
  return {
    C_pain: partial?.C_pain ?? buildSectionCPainOrder(),
  };
}

export function ensureDisplayOrder(
  current: CDisplayOrder | null | undefined
): CDisplayOrder {
  if (
    current?.C_pain?.length === CANONICAL_C_PAIN_ORDER.length &&
    current.C_pain.every((id, i) => id === CANONICAL_C_PAIN_ORDER[i])
  ) {
    return { C_pain: current.C_pain };
  }
  return createDisplayOrder(current ?? undefined);
}
