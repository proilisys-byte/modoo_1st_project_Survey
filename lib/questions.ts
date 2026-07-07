// Survey_Based_v03 — 32 메인 + Deep Dive + 연락·동의 6항
export type Option = {
  value: string;
  label: string;
  hasText?: boolean;
  exclusive?: boolean;
};

export type ShowIf =
  | { questionId: string; value: string }
  | { questionId: string; exceptValues: string[] }
  | { questionId: string; anyOf: string[] }
  | { questionId: string; includes: string }
  | { questionId: string; minIncludes: number }
  | { questionId: string; rankFirst: string }
  | { questionId: string; notValue: string }
  | { questionId: string; values: string[] }
  | { questionId: string; answered: true }
  | { questionId: string; painThreshold: { freqGte?: number; sevGte?: number } }
  | { questionId: string; matrixAnyRowAnyOf: string[] }
  | { questionId: string; rankPickFirstAnswered: true }
  | { questionId: string; rankPickFirstNot: string };

export type ShowIfRule = ShowIf | { and: ShowIfRule[] } | { or: ShowIfRule[] };

export type SingleQuestion = {
  id: string;
  type: "single";
  title: string;
  note?: string;
  options: Option[];
  required: boolean;
  showIf?: ShowIfRule;
  optionsFrom?: string;
};

export type MultiQuestion = {
  id: string;
  type: "multi";
  title: string;
  note?: string;
  options: Option[];
  max?: number;
  exact?: number;
  required: boolean;
  showIf?: ShowIfRule;
};

export type RankQuestion = {
  id: string;
  type: "rank";
  title: string;
  note?: string;
  items: { id: string; label: string }[];
  required: boolean;
  showIf?: ShowIfRule;
};

/** 1순위·2순위 선택 (서로 다른 보기 2개) */
export type RankPickQuestion = {
  id: string;
  type: "rankPick";
  title: string;
  note?: string;
  options: Option[];
  required: boolean;
  showIf?: ShowIfRule;
};

/** 행별 단일 선택 매트릭스 (공통 열 보기) */
export type SingleMatrixQuestion = {
  id: string;
  type: "singleMatrix";
  title: string;
  note?: string;
  rows: { id: string; label: string }[];
  options: Option[];
  required: boolean;
  showIf?: ShowIfRule;
};

export type DualScaleQuestion = {
  id: string;
  type: "dualScale";
  title: string;
  tag?: string;
  attention?: boolean;
  sevOptional?: boolean;
  required: boolean;
  showIf?: ShowIfRule;
};

export type Matrix5Question = {
  id: string;
  type: "matrix5";
  title: string;
  scaleHint: { low: string; high: string };
  rows: { id: string; label: string }[];
  required: boolean;
  showIf?: ShowIfRule;
};

export type PriceMatrixQuestion = {
  id: string;
  type: "priceMatrix";
  title: string;
  rows: { id: string; label: string }[];
  bands: string[];
  required: boolean;
  showIf?: ShowIfRule;
};

export type TextQuestion = {
  id: string;
  type: "text";
  title: string;
  placeholder?: string;
  required: boolean;
  showIf?: ShowIfRule;
};

export type Question =
  | SingleQuestion
  | MultiQuestion
  | DualScaleQuestion
  | Matrix5Question
  | PriceMatrixQuestion
  | RankQuestion
  | RankPickQuestion
  | SingleMatrixQuestion
  | TextQuestion;

export type Section = {
  id: string;
  name: string;
  heading: string;
  intro?: string;
  questions: Question[];
};

export const FREQ_LABELS = [
  "거의 없음 (연 1회 이하)",
  "가끔 (분기 1~2회)",
  "종종 (월 1~2회)",
  "자주 (주 1회 수준)",
  "상시 (거의 매일)",
];

export const SEV_LABELS = [
  "무시 가능 (담당자 선에서 처리)",
  "경미 (부서 내 추가 업무 발생)",
  "상당 (타 부서 협의·일정 조정 필요)",
  "심각 (납기 지연·고객 통보 발생)",
  "치명적 (거래 관계·매출에 직접 타격)",
];

export const PRICE_BANDS = [
  "10만원 미만",
  "10만~30만원 미만",
  "30만~50만원 미만",
  "50만~100만원 미만",
  "100만~200만원 미만",
  "200만원 이상",
];

export { SECTIONS, PAIN_LABELS } from "./questions-v03-sections";
