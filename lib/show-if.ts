import type { ShowIf } from "./questions";

function asStringArray(v: unknown): string[] {
  if (Array.isArray(v)) return v.filter((x): x is string => typeof x === "string");
  return [];
}

function rankFirst(v: unknown): string | null {
  const arr = asStringArray(v);
  return arr[0] ?? null;
}

/** 단일 showIf 조건 평가 */
export function evalShowIf(
  cond: ShowIf,
  answers: Record<string, unknown>
): boolean {
  const ans = answers[cond.questionId];

  if ("exceptValues" in cond) {
    return typeof ans === "string" && !cond.exceptValues.includes(ans);
  }
  if ("value" in cond) {
    return ans === cond.value;
  }
  if ("anyOf" in cond) {
    if (typeof ans === "string") return cond.anyOf.includes(ans);
    if (Array.isArray(ans)) return cond.anyOf.some((v) => ans.includes(v));
    return false;
  }
  if ("includes" in cond) {
    return asStringArray(ans).includes(cond.includes);
  }
  if ("minIncludes" in cond) {
    return asStringArray(ans).length >= cond.minIncludes;
  }
  if ("rankFirst" in cond) {
    return rankFirst(ans) === cond.rankFirst;
  }
  if ("notValue" in cond) {
    return ans !== cond.notValue;
  }
  if ("values" in cond) {
    return typeof ans === "string" && cond.values.includes(ans);
  }
  if ("answered" in cond && cond.answered) {
    if (ans === undefined || ans === null || ans === "") return false;
    if (Array.isArray(ans)) return ans.length > 0;
    if (typeof ans === "object") return Object.keys(ans as object).length > 0;
    return true;
  }
  return true;
}

/** 복합 showIf (and/or) */
export type ShowIfRule =
  | ShowIf
  | { and: ShowIfRule[] }
  | { or: ShowIfRule[] };

export function evalShowIfRule(
  rule: ShowIfRule | undefined,
  answers: Record<string, unknown>
): boolean {
  if (!rule) return true;
  if ("and" in rule) return rule.and.every((r) => evalShowIfRule(r, answers));
  if ("or" in rule) return rule.or.some((r) => evalShowIfRule(r, answers));
  return evalShowIf(rule, answers);
}
