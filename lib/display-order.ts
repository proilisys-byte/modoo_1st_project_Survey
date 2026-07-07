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

/** P14~P18 고정 순서 + C_ATT를 5번째(1-indexed) 고정 위치에 삽입 */
export function buildSectionCPainOrder(): string[] {
  const pain: string[] = [...PAIN_QUESTION_IDS];
  const order: string[] = [...pain];
  order.splice(4, 0, ATTENTION_QUESTION_ID);
  return order;
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
  if (current?.C_pain?.length === 6) {
    return { C_pain: current.C_pain };
  }
  return createDisplayOrder(current ?? undefined);
}
