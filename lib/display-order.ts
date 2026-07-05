/** 섹션 C Pain 항목 id (C1~C8) — 내부 key 불변 */
export const PAIN_QUESTION_IDS = [
  "C1",
  "C2",
  "C3",
  "C4",
  "C5",
  "C6",
  "C7",
  "C8",
] as const;

export const ATTENTION_QUESTION_ID = "C_ATT";
export const TOP3_QUESTION_ID = "C9";

/** DB c_display_order jsonb 구조 */
export type CDisplayOrder = {
  /** C1~C8 + C_ATT 표시 순서 (C9 제외) */
  C_pain: string[];
  /** C9 보기 value(C1~C8) 표시 순서 — T-12 */
  C9_options?: string[];
};

function shuffle<T>(items: T[]): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** C1~C8 무작위 + C_ATT를 4~6번째(1-indexed) 임의 위치에 삽입 */
export function buildSectionCPainOrder(): string[] {
  const pain = shuffle([...PAIN_QUESTION_IDS]);
  const insertAt = 3 + Math.floor(Math.random() * 3); // 0-indexed 3|4|5 → 4~6번째
  const order: string[] = [...pain];
  order.splice(insertAt, 0, ATTENTION_QUESTION_ID);
  return order;
}

/** C9 보기 8개 무작위 순서 (value = C1~C8) */
export function buildC9OptionOrder(): string[] {
  return shuffle([...PAIN_QUESTION_IDS]);
}

export function createPainDisplayOrder(): CDisplayOrder {
  return { C_pain: buildSectionCPainOrder() };
}

export function ensureC9OptionOrder(order: CDisplayOrder): CDisplayOrder {
  if (order.C9_options?.length === PAIN_QUESTION_IDS.length) return order;
  return { ...order, C9_options: buildC9OptionOrder() };
}

export function createDisplayOrder(partial?: Partial<CDisplayOrder>): CDisplayOrder {
  return ensureC9OptionOrder({
    C_pain: partial?.C_pain ?? buildSectionCPainOrder(),
    C9_options: partial?.C9_options,
  });
}

export function ensureDisplayOrder(
  current: CDisplayOrder | null | undefined
): CDisplayOrder {
  if (current?.C_pain?.length === 9) {
    return {
      C_pain: current.C_pain,
      C9_options: current.C9_options ?? buildC9OptionOrder(),
    };
  }
  return createDisplayOrder(current ?? undefined);
}
