import type { Option, Question, ShowIf } from "./questions";
import {
  TOP3_QUESTION_ID,
  type CDisplayOrder,
} from "./display-order";

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
