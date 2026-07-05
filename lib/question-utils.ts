import type { Option, Question, ShowIf } from "./questions";
import type { DualAnswer } from "./scoring";
import { SECTIONS } from "./questions";
import {
  TOP3_QUESTION_ID,
  type CDisplayOrder,
} from "./display-order";

export function isAnswered(
  q: Question,
  answers: Record<string, unknown>
): boolean {
  const v = answers[q.id];
  switch (q.type) {
    case "single": {
      if (typeof v !== "string" || v.length === 0) return false;
      const opt = q.options.find((o) => o.value === v);
      if (opt?.hasText) {
        const other = answers[`${q.id}_other_${opt.value}`];
        return typeof other === "string" && other.trim().length > 0;
      }
      return true;
    }
    case "multi": {
      if (!Array.isArray(v) || v.length === 0) return false;
      if (q.exact) return v.length === q.exact;
      return true;
    }
    case "dualScale": {
      const d = v as DualAnswer | undefined;
      if (typeof d?.freq !== "number") return false;
      // key 기준: C_ATT만 questions.ts sevOptional=true
      if ("sevOptional" in q && q.sevOptional) return true;
      return typeof d.sev === "number";
    }
    case "matrix5":
    case "priceMatrix": {
      const m = (v ?? {}) as Record<string, number>;
      return q.rows.every((r) => typeof m[r.id] === "number");
    }
    case "text":
      return !q.required || (typeof v === "string" && v.trim().length > 0);
  }
}

/** 제출 직전 전 섹션 검증 — localStorage contact(step) 우회 방지 */
export function findFirstUnansweredRequired(
  answers: Record<string, unknown>,
  displayOrder: CDisplayOrder | null
): string | null {
  for (const section of SECTIONS) {
    let qs = section.questions;
    if (section.id === "C" && displayOrder) {
      qs = getOrderedSectionCQuestions(qs, displayOrder);
    }
    const visible = getVisibleQuestions(qs, answers);
    const missing = visible.find((q) => q.required && !isAnswered(q, answers));
    if (missing) return missing.id;
  }
  return null;
}

export function isQuestionVisible(
  q: Question,
  answers: Record<string, unknown>
): boolean {
  if ("showIf" in q && q.showIf) {
    const cond = q.showIf as ShowIf;
    const ans = answers[cond.questionId];
    if ("exceptValues" in cond) {
      return typeof ans === "string" && !cond.exceptValues.includes(ans);
    }
    return ans === cond.value;
  }
  return true;
}

export function getVisibleQuestions(
  questions: Question[],
  answers: Record<string, unknown>
): Question[] {
  return questions.filter((q) => isQuestionVisible(q, answers));
}

/** E3=적극 검토 OR E6=신청 시 연락처 필수 */
export function isPhoneRequired(answers: Record<string, unknown>): boolean {
  return answers["E3"] === "1" || answers["E6"] === "1";
}

/** C9 보기 무작위 순서 적용 */
export function getShuffledMultiOptions(
  question: Question,
  valueOrder: string[] | undefined
): Option[] {
  if (question.type !== "multi" || !valueOrder?.length) {
    return question.type === "multi" ? question.options : [];
  }
  const byValue = new Map(question.options.map((o) => [o.value, o]));
  return valueOrder
    .map((v) => byValue.get(v))
    .filter((o): o is Option => o != null);
}

/** 섹션 C: C_pain 순서 + C9(마지막) */
export function getOrderedSectionCQuestions(
  questions: Question[],
  displayOrder: CDisplayOrder
): Question[] {
  const map = new Map(questions.map((q) => [q.id, q]));
  const ordered = displayOrder.C_pain
    .map((id) => map.get(id))
    .filter((q): q is Question => q != null);
  const c9 = map.get(TOP3_QUESTION_ID);
  return c9 ? [...ordered, c9] : ordered;
}
