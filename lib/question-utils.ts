import type { Option, Question, ShowIfRule } from "./questions";
import type { DualAnswer } from "./scoring";
import { SECTIONS } from "./questions";
import { evalShowIfRule } from "./show-if";
import {
  ATTENTION_QUESTION_ID,
  PAIN_QUESTION_IDS,
  type CDisplayOrder,
} from "./display-order";

const C_PAIN_SET = new Set<string>([
  ...PAIN_QUESTION_IDS,
  ATTENTION_QUESTION_ID,
]);

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
    case "rank": {
      const m = (v ?? {}) as Record<string, number>;
      const ranks = q.items.map((item) => m[item.id]).filter(Boolean);
      if (ranks.length !== q.items.length) return false;
      return new Set(ranks).size === q.items.length;
    }
    case "rankPick": {
      const rp = v as { first?: string; second?: string } | undefined;
      if (!rp?.first || !rp?.second) return false;
      return rp.first !== rp.second;
    }
    case "singleMatrix": {
      const m = (v ?? {}) as Record<string, string>;
      return q.rows.every((r) => typeof m[r.id] === "string" && m[r.id].length > 0);
    }
  }
}

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
    return evalShowIfRule(q.showIf as ShowIfRule, answers);
  }
  return true;
}

export function getVisibleQuestions(
  questions: Question[],
  answers: Record<string, unknown>
): Question[] {
  return questions.filter((q) => isQuestionVisible(q, answers));
}

/** F29=적극 검토 OR F34=신청 시 연락처 필수 */
export function isPhoneRequired(answers: Record<string, unknown>): boolean {
  return answers["F29"] === "1" || answers["F34"] === "1";
}

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

/** 섹션 C: C_pain 순서 + Q20·Deep Dive(정의 순) */
export function getOrderedSectionCQuestions(
  questions: Question[],
  displayOrder: CDisplayOrder
): Question[] {
  const map = new Map(questions.map((q) => [q.id, q]));
  const orderedPain = displayOrder.C_pain
    .map((id) => map.get(id))
    .filter((q): q is Question => q != null);
  const rest = questions.filter((q) => !C_PAIN_SET.has(q.id));
  return [...orderedPain, ...rest];
}
