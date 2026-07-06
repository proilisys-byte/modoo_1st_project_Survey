// Survey_Baseed_v02 + 탐색형 Deep Dive (v3)
// 메인 50항 + 조건부 Deep Dive + 연락·동의 6항
import {
  DEEP_DIVE_A,
  DEEP_DIVE_B,
  DEEP_DIVE_C,
  DEEP_DIVE_D,
  DEEP_DIVE_E,
} from "./questions-deep-dive";
import { SECTION_F_QUESTIONS } from "./questions-section-f";

export type Option = {
  value: string;
  label: string;
  /** 선택 시 자유 기입란 노출 (기타 등) */
  hasText?: boolean;
  /** 선택 시 같은 문항의 다른 보기를 모두 해제 (T-11) */
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
  | { questionId: string; answered: true };

export type ShowIfRule = ShowIf | { and: ShowIfRule[] } | { or: ShowIfRule[] };

export type SingleQuestion = {
  id: string;
  type: "single";
  title: string;
  note?: string;
  options: Option[];
  required: boolean;
  showIf?: ShowIfRule;
  /** F0-3-2 등: 다른 문항 선택값을 제외한 보기만 노출 */
  optionsFrom?: string;
};

export type MultiQuestion = {
  id: string;
  type: "multi";
  title: string;
  note?: string;
  options: Option[];
  /** 최대 선택 수 (없으면 무제한) */
  max?: number;
  /** 정확히 n개 선택 강제 */
  exact?: number;
  required: boolean;
  showIf?: ShowIfRule;
};

/** 4항목 순위 매기기 (1~4위, 중복 불가) */
export type RankQuestion = {
  id: string;
  type: "rank";
  title: string;
  note?: string;
  items: { id: string; label: string }[];
  required: boolean;
  showIf?: ShowIfRule;
};

/** 빈도(1~5) × 영향도(1~5) 이중 척도 */
export type DualScaleQuestion = {
  id: string;
  type: "dualScale";
  title: string;
  /** 검증 대상 태그 (예: "P1 · ISO 실행 갭") */
  tag?: string;
  /** 주의 확인 문항 여부 — 빈도에서 2를 선택해야 통과 */
  attention?: boolean;
  /** 업무 영향도 입력 비필수 (T-14, C_ATT) */
  sevOptional?: boolean;
  required: boolean;
};

/** 여러 항목을 동일한 5점 척도로 평가 */
export type Matrix5Question = {
  id: string;
  type: "matrix5";
  title: string;
  scaleHint: { low: string; high: string };
  rows: { id: string; label: string }[];
  required: boolean;
};

/** Van Westendorp 간이형 — 항목별 금액대 선택 */
export type PriceMatrixQuestion = {
  id: string;
  type: "priceMatrix";
  title: string;
  rows: { id: string; label: string }[];
  bands: string[];
  required: boolean;
};

export type TextQuestion = {
  id: string;
  type: "text";
  title: string;
  placeholder?: string;
  required: boolean;
};

export type Question =
  | SingleQuestion
  | MultiQuestion
  | DualScaleQuestion
  | Matrix5Question
  | PriceMatrixQuestion
  | RankQuestion
  | TextQuestion;

export type Section = {
  id: string;
  name: string;
  heading: string;
  /** 섹션 상단 안내 문안 */
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
  "10만 원 미만",
  "10만~30만 원 미만",
  "30만~50만 원 미만",
  "50만~100만 원 미만",
  "100만~200만 원 미만",
  "200만 원 이상",
];

export const SECTIONS: Section[] = [
  {
    id: "A",
    name: "섹션 A",
    heading: "기업·응답자 프로파일",
    intro: "귀사와 응답자님에 대한 기본 정보입니다. 통계 분류 목적으로만 사용됩니다.",
    questions: [
      {
        id: "A1",
        type: "single",
        title: "귀사의 주력 사업 분야는 무엇입니까?",
        required: true,
        options: [
          { value: "0", label: "반도체 제조" },
          { value: "1", label: "반도체 장비 제조" },
          { value: "2", label: "반도체 부품·소재 제조" },
          { value: "3", label: "반도체 장비·부품 가공/조립 협력 (1~3차)" },
          { value: "4", label: "자동차 부품" },
          { value: "5", label: "이차전지(배터리) 관련" },
          { value: "6", label: "전자·기계 일반" },
          { value: "7", label: "기타 제조", hasText: true },
        ],
      },
      {
        id: "A2",
        type: "single",
        title: "귀사의 상시 근로자 수는?",
        required: true,
        options: [
          { value: "a2_v2_1", label: "10명 미만" },
          { value: "a2_v2_2", label: "10~19명" },
          { value: "a2_v2_3", label: "20~49명" },
          { value: "a2_v2_4", label: "50~99명" },
          { value: "a2_v2_5", label: "100~299명" },
          { value: "a2_v2_6", label: "300명 이상" },
        ],
      },
      {
        id: "A3",
        type: "multi",
        title: "귀사가 보유한 인증을 모두 선택해 주십시오.",
        required: true,
        options: [
          { value: "1", label: "ISO 9001 (품질)" },
          { value: "2", label: "ISO 14001 (환경)" },
          { value: "3", label: "ISO 45001 (안전보건)" },
          { value: "4", label: "IATF 16949 (자동차)" },
          { value: "5", label: "고객사 자체 인증 (삼성·SK 등 협력사 인증)" },
          { value: "8", label: "ESG 관련 인증·평가" },
          { value: "9", label: "ISO 53001 (ESG 경영시스템)" },
          { value: "6", label: "없음", exclusive: true },
          { value: "7", label: "인증 취득이 필요하다 (검토·준비 중)", hasText: true },
        ],
      },
      {
        id: "A4",
        type: "single",
        title: "귀사의 주요 고객은 어떤 형태입니까?",
        required: true,
        options: [
          { value: "1", label: "대기업 직납 (원청과 직접 거래)" },
          { value: "2", label: "1차 협력사에 납품 (당사는 2차)" },
          { value: "3", label: "2차 협력사에 납품 (당사는 3차 이하)" },
          { value: "4", label: "해외 고객 직수출" },
          { value: "5", label: "내수 일반 시장" },
        ],
      },
      {
        id: "A5",
        type: "single",
        title: "응답자님의 직무는 무엇입니까?",
        required: true,
        options: [
          { value: "1", label: "품질 (QA/QC)" },
          { value: "2", label: "제조/생산" },
          { value: "3", label: "개발/기술" },
          { value: "4", label: "생산관리/구매" },
          { value: "5", label: "경영진 (임원 이상)" },
          { value: "6", label: "영업/마케팅/CS" },
          { value: "7", label: "기타", hasText: true },
        ],
      },
      {
        id: "A6",
        type: "single",
        title: "응답자님은 품질 관련 의사결정에 어느 정도 관여하십니까?",
        required: true,
        options: [
          { value: "1", label: "최종 결정권자다" },
          { value: "2", label: "결정에 직접 참여한다 (품의·기안 담당)" },
          { value: "3", label: "의견을 제시하는 수준이다" },
          { value: "4", label: "관여하지 않는다" },
        ],
      },
      ...DEEP_DIVE_A,
    ],
  },
  {
    id: "B",
    name: "섹션 B",
    heading: "품질운영 현황 진단",
    intro:
      "지난 1년간 귀사에서 실제로 발생한 이력을 여쭙습니다. 정확한 수치를 모르시면 가장 가까운 것을 선택해 주세요.",
    questions: [
      {
        id: "B1",
        type: "single",
        title:
          "지난 1년간, 고객사 Audit(수검) 또는 ISO 사후심사를 몇 회 받으셨습니까?",
        required: true,
        options: [
          { value: "1", label: "없음" },
          { value: "2", label: "1회" },
          { value: "3", label: "2~3회" },
          { value: "4", label: "4회 이상" },
          { value: "5", label: "모름" },
        ],
      },
      {
        id: "B2",
        type: "single",
        title:
          "가장 최근의 심사·Audit에서 \u201c문서(절차서)와 실제 업무 방식이 다르다\u201d는 취지의 지적을 받은 적이 있습니까?",
        required: true,
        options: [
          { value: "1", label: "있다 — 시정조치 요구까지 받았다" },
          { value: "2", label: "있다 — 구두 지적 수준이었다" },
          { value: "3", label: "없다" },
          { value: "4", label: "모름 / 해당 없음" },
        ],
      },
      {
        id: "B3",
        type: "single",
        title:
          "지난 1년간, 출하검사 불합격 또는 출하 후 고객 클레임(반품·선별·라인스톱 통보 포함)이 몇 건 발생했습니까?",
        required: true,
        options: [
          { value: "1", label: "없음" },
          { value: "2", label: "1~3건" },
          { value: "3", label: "4~10건" },
          { value: "4", label: "11건 이상" },
          { value: "5", label: "집계하지 않아 모름" },
          { value: "6", label: "기타", hasText: true },
        ],
      },
      {
        id: "B3A",
        type: "single",
        title:
          "지난 1년간, 생산 과정에서 불량·재작업·폐기로 처리된 비율(생산 수량 또는 제조원가 대비)은 대략 어느 정도입니까?",
        required: true,
        options: [
          { value: "1", label: "1% 미만" },
          { value: "2", label: "1~3%" },
          { value: "3", label: "3~5%" },
          { value: "4", label: "5~10%" },
          { value: "5", label: "10% 이상" },
          { value: "6", label: "집계하지 않아 모름" },
        ],
      },
      {
        id: "q10_basis",
        type: "single",
        title: "위 비율의 기준은?",
        note: "직전 문항(불량·재작업·폐기 비율)의 분모 기준입니다.",
        required: true,
        showIf: { questionId: "B3A", exceptValues: ["6"] },
        options: [
          { value: "q10_basis_qty", label: "수량 기준" },
          { value: "q10_basis_cost", label: "원가(금액) 기준" },
          { value: "q10_basis_gut", label: "감(感)으로 추정" },
        ],
      },
      {
        id: "B4",
        type: "single",
        title:
          "부적합(불량) 발생 시, 시정조치(CAPA) 보고서 1건을 완결하는 데 평균 얼마나 걸립니까? (원인분석 → 대책수립 → 효과확인까지)",
        required: true,
        // T-05 v2: b4_v2_* 신규 key (v1 "1"~"5" deprecated). 일수 절단 → lib/boundaries.ts
        options: [
          { value: "b4_v2_lte1w", label: "1주일 이내 (신속 종결)" },
          { value: "b4_v2_1_2w", label: "1~2주일" },
          { value: "b4_v2_2_4w", label: "2~4주일" },
          { value: "b4_v2_gt4w", label: "1개월(4주) 초과 (장기 미결)" },
          {
            value: "b4_v2_effect_weak",
            label: "보고서는 작성하지만 대책의 효과 검증(유효성 확인) 단계는 미흡하다",
          },
          {
            value: "b4_v2_not_operated",
            label: "회사 내 정식 시정조치(CAPA) 프로세스가 없거나 유명무실하다",
          },
        ],
      },
      {
        id: "B5",
        type: "single",
        title:
          "최근 발생한 부적합 중, 시정조치가 \u201c담당자 교육 실시\u201d 또는 \u201c작업표준 재교육\u201d으로 종결된 비율은 대략 어느 정도입니까?",
        required: true,
        options: [
          { value: "1", label: "10% 미만" },
          { value: "2", label: "10~30%" },
          { value: "3", label: "30~60%" },
          { value: "4", label: "60~80%" },
          { value: "5", label: "80% 이상" },
          { value: "6", label: "모름" },
        ],
      },
      {
        id: "B6",
        type: "single",
        title: "동일하거나 유사한 불량이 재발한 경험이 지난 1년 내 있습니까?",
        required: true,
        options: [
          { value: "1", label: "없다" },
          { value: "2", label: "1~2회 있다" },
          { value: "3", label: "3회 이상 있다" },
          { value: "4", label: "재발 여부를 추적할 수 있는 이력 체계가 없다" },
        ],
      },
      {
        id: "B7",
        type: "single",
        title:
          "내부심사 또는 고객사 Audit 준비(문서 정리·기록 보완·증빙 취합)에 담당자 기준 총 몇 일(man-day)이 투입됩니까? (1회 기준)",
        required: true,
        options: [
          { value: "b7_v2_lt3", label: "3일 미만" },
          { value: "b7_v2_3to6", label: "3~6일" },
          { value: "b7_v2_7to11", label: "7~11일" },
          { value: "b7_v2_ge12", label: "12일 이상" },
          { value: "b7_v2_unknown", label: "모름" },
          { value: "b7_v2_dedicated", label: "전담자 상주 (일수 산정 불가)" },
        ],
      },
      ...DEEP_DIVE_B,
    ],
  },
  {
    id: "C",
    name: "섹션 C",
    heading: "Pain Point 심층 진단",
    intro:
      "아래는 대부분의 제조기업이 겪는 상황들입니다. 귀사에서 얼마나 자주 발생하는지와, 발생 시 업무에 미치는 영향이 어느 정도인지를 각각 선택해 주십시오.",
    questions: [
      {
        id: "C1",
        type: "dualScale",
        title:
          "절차서·작업표준은 있지만, 납기가 급하면 절차를 생략하고 작업이 진행된다",
        tag: "ISO 실행 갭",
        required: true,
      },
      {
        id: "C2",
        type: "dualScale",
        title:
          "담당자가 바뀌면, 작업 기준과 방법이 문서가 아니라 담당자 개인에 따라 달라진다",
        tag: "표준화 부재",
        required: true,
      },
      {
        id: "C3",
        type: "dualScale",
        title:
          "출하검사에서 발견된 문제가 제조·개발 부서로 공유되지 않는다",
        tag: "부서 단절",
        required: true,
      },
      {
        id: "C4",
        type: "dualScale",
        title:
          "불량이 발생했을 때, 개발·제조·검사·출하 중 어느 단계에서 생겼는지 추적할 수 있는 기록이 없다",
        tag: "이력 추적",
        required: true,
      },
      {
        id: "C_ATT",
        type: "dualScale",
        title:
          "이 문항은 응답 품질 확인용입니다. '발생 빈도'에서 2번을 선택해 주십시오.",
        attention: true,
        sevOptional: true,
        required: true,
      },
      {
        id: "C5",
        type: "dualScale",
        title:
          "4M 변경(사람·설비·재료·방법)이 승인·기록 없이 현장에서 먼저 실행된다",
        tag: "변경점 관리",
        required: true,
      },
      {
        id: "C6",
        type: "dualScale",
        title:
          "CAPA/8D 보고서 작성이 부담스러워 원인분석보다 문서 마감에 급급하다",
        tag: "CAPA 부담",
        required: true,
      },
      {
        id: "C7",
        type: "dualScale",
        title:
          "경영진에게 품질 문제의 심각성(손실 비용·거래 리스크)을 숫자로 보여줄 자료가 없다",
        tag: "경영 보고",
        required: true,
      },
      {
        id: "C8",
        type: "dualScale",
        title:
          "고객사 Audit 지적사항에 대한 시정조치가 다음 Audit 전까지 방치된다",
        tag: "사후관리",
        required: true,
      },
      {
        id: "C9",
        type: "multi",
        title:
          "위 8가지 상황 중, 지금 당장 해결된다면 귀사에 가장 큰 이익이 되는 것 3가지를 골라 주십시오.",
        note: "선택 순서대로 1순위·2순위·3순위가 기록됩니다.",
        exact: 3,
        required: true,
        options: [
          { value: "C1", label: "납기 급하면 절차 생략" },
          { value: "C2", label: "담당자 교체 시 품질 문제" },
          { value: "C3", label: "출하검사 문제가 부서 간 공유 안 됨" },
          { value: "C4", label: "불량 발생 단계 추적 어려움" },
          { value: "C5", label: "4M 변경이 기록 없이 실행" },
          { value: "C6", label: "CAPA/8D 문서 마감에 급급" },
          { value: "C7", label: "경영진 보고용 숫자 자료 없음" },
          { value: "C8", label: "Audit 지적사항 방치" },
        ],
      },
      ...DEEP_DIVE_C,
    ],
  },
  {
    id: "D",
    name: "섹션 D",
    heading: "근본원인·업무부하 진단",
    intro: "품질 업무가 현장에서 실행되기 어려운 이유를 여쭙습니다.",
    questions: [
      {
        id: "D1",
        type: "single",
        title: "귀사에서 품질 업무를 전담하는 인원은 몇 명입니까? (겸직 제외)",
        required: true,
        options: [
          { value: "1", label: "없음 (전원 겸직)" },
          { value: "2", label: "1명" },
          { value: "3", label: "2~3명" },
          { value: "4", label: "4~5명" },
          { value: "5", label: "6명 이상" },
        ],
      },
      {
        id: "D2",
        type: "single",
        title: "ISO 문서·기록 관리는 현재 주로 어떤 도구로 하고 있습니까?",
        required: true,
        options: [
          { value: "1", label: "종이 양식 + 수기 작성" },
          { value: "2", label: "엑셀·한글·워드 파일 (공유폴더/이메일 관리)" },
          { value: "3", label: "그룹웨어·ERP의 일부 기능" },
          { value: "4", label: "전문 QMS 소프트웨어" },
          { value: "5", label: "외부 컨설팅사에 위탁" },
        ],
      },
      {
        id: "D2A",
        type: "multi",
        title:
          "귀사에서 현재 운영 중이거나 도입했던 현장·품질 혁신활동을 모두 선택해 주십시오.",
        note: "실질적으로 활동이 이어지고 있는 것을 기준으로 선택해 주세요.",
        required: true,
        options: [
          { value: "5s", label: "5S (정리·정돈·청소·청결·습관화)" },
          { value: "3jung", label: "3정 (정품·정량·정위치)" },
          { value: "tpm", label: "TPM (전사적 설비보전)" },
          { value: "tqm", label: "TQM (전사적 품질경영)" },
          { value: "6sigma", label: "6시그마 (6 Sigma)" },
          { value: "lean", label: "린 생산·개선제안 활동 (Kaizen 등)" },
          { value: "none", label: "특별한 혁신활동을 하고 있지 않다", exclusive: true },
          { value: "etc", label: "기타", hasText: true },
        ],
      },
      {
        id: "D3",
        type: "multi",
        title:
          "ISO 절차가 현장에서 지켜지지 않는 가장 큰 이유는 무엇이라고 보십니까? (2개까지 선택)",
        max: 2,
        required: true,
        options: [
          { value: "1", label: "납기 압박 — 절차를 다 지키면 납기를 못 맞춘다" },
          {
            value: "2",
            label: "절차서가 우리 회사 실정과 맞지 않는다 (인증용으로만 작성됨)",
          },
          {
            value: "3",
            label: "현장 인원이 절차의 존재나 내용을 모른다 (교육 부족)",
          },
          { value: "4", label: "지켰는지 확인하는 사람·체계가 없다" },
          { value: "5", label: "경영진이 품질보다 생산량·납기를 우선시한다" },
          { value: "6", label: "절차 자체는 지켜지고 있다 (해당 없음)", exclusive: true },
        ],
      },
      ...DEEP_DIVE_D,
      {
        id: "D4_gate",
        type: "single",
        title: "외부 ISO 컨설팅을 받아본 적이 있습니까?",
        required: true,
        options: [
          { value: "yes", label: "있다" },
          { value: "no", label: "없다" },
        ],
      },
      {
        id: "D4_pain",
        type: "single",
        title: "가장 아쉬웠던 점은 무엇입니까?",
        required: true,
        showIf: { questionId: "D4_gate", value: "yes" },
        options: [
          { value: "1", label: "우리 업종(반도체/제조) 현장을 잘 모른다" },
          { value: "2", label: "문서 양식만 주고 실행 방법은 알려주지 않는다" },
          { value: "3", label: "컨설팅 종료 후 유지가 안 된다" },
          { value: "4", label: "비용 대비 효과가 불분명하다" },
          {
            value: "q29_v2_satisfied",
            label: "특별히 아쉬운 점은 없었다 (만족)",
          },
        ],
      },
      {
        id: "D5",
        type: "text",
        title:
          "(선택) 품질·ISO 운영과 관련해 \u201c이것 하나만 해결돼도 살겠다\u201d 싶은 업무가 있다면 적어 주십시오.",
        placeholder: "자유롭게 적어 주세요 (선택 사항)",
        required: false,
      },
    ],
  },
  {
    id: "F",
    name: "섹션 F",
    heading: "IT·시스템 아키텍처 및 도입 탐색",
    intro:
      "귀사의 현재 정보관리 방식과 향후 도입 방향을 파악하기 위한 문항입니다. 특정 제품을 가정하지 않고, 귀사 상황에 가장 가까운 것을 선택해 주십시오.",
    questions: SECTION_F_QUESTIONS,
  },
  {
    id: "E",
    name: "섹션 E",
    heading: "솔루션 수용도·지불의사",
    intro:
      "만약 아래와 같은 서비스가 있다면 귀사에 얼마나 도움이 될지 여쭤보고 싶습니다.\n\n[이런 서비스입니다] ISO 9001 규정을 우리 회사 공정에 맞는 '매일 쓰는 점검표(체크시트)'로 자동으로 바꿔 주고, 불량(부적합)이 생기면 시정조치 보고서(CAPA·8D) 초안을 AI가 대신 작성해 주며, 부서별 조치 진행 상황과 품질 리스크를 경영진용 보고서로 한눈에 정리해 주는 소프트웨어입니다.",
    questions: [
      {
        id: "E1",
        type: "matrix5",
        title: "다음 각 기능이 귀사 업무에 도움이 되는 정도를 평가해 주십시오.",
        scaleHint: { low: "전혀 도움 안 됨", high: "매우 도움 됨" },
        required: true,
        rows: [
          { id: "a", label: "ISO 조항 → 우리 회사 맞춤 일일 체크시트 자동 변환" },
          { id: "b", label: "부적합 발생 시 CAPA/8D 보고서 초안 자동 작성" },
          { id: "c", label: "불량 원인의 발생 단계(개발/제조/검사/출하) 추적" },
          { id: "d", label: "부서별 시정조치 담당·기한 할당 및 진행 알림" },
          { id: "e", label: "경영진용 품질 리스크·손실비용 월간 리포트 자동 생성" },
          { id: "f", label: "내부심사·고객 Audit 대비 문서·기록 자동 점검" },
        ],
      },
      {
        id: "E2",
        type: "single",
        title:
          "이런 서비스를 도입한다면, 도입 결정까지 가장 큰 장애물은 무엇이겠습니까?",
        required: true,
        options: [
          { value: "1", label: "예산 확보 (경영진 설득)" },
          {
            value: "2",
            label: "현장 인원의 사용 정착 (또 하나의 시스템이 될 우려)",
          },
          { value: "3", label: "기존 ERP/그룹웨어와의 중복" },
          { value: "4", label: "회사 데이터(공정·불량 정보) 외부 유출 우려" },
          { value: "5", label: "효과에 대한 확신 부족 (검증 사례 필요)" },
          { value: "6", label: "장애물 없음" },
          { value: "7", label: "기타", hasText: true },
        ],
      },
      ...DEEP_DIVE_E.filter((q) => q.id.startsWith("E2-1")),
      {
        id: "E3",
        type: "single",
        title:
          "도입 전 4~6주간 실제 데이터로 효과를 검증하는 유료 시범 적용(PoC)이 있다면, 참여를 검토할 의향이 있습니까?",
        required: true,
        options: [
          { value: "1", label: "적극 검토하겠다 (담당자 연락 요청)" },
          { value: "2", label: "조건(비용·범위)을 보고 검토하겠다" },
          { value: "3", label: "무료라면 검토하겠다" },
          { value: "4", label: "당분간 계획 없다" },
        ],
      },
      ...DEEP_DIVE_E.filter((q) => q.id === "E3-1"),
      {
        id: "E4",
        type: "priceMatrix",
        title:
          "(가격 수용도 — 월 구독 기준) 위 서비스의 월 이용료에 대해 여쭙습니다.",
        bands: PRICE_BANDS,
        required: true,
        rows: [
          { id: "a", label: "이 금액이면 너무 싸서 품질이 의심된다" },
          { id: "b", label: "이 금액이면 합리적이어서 도입을 긍정 검토하겠다" },
          {
            id: "c",
            label: "이 금액부터는 비싸다고 느끼지만 효과가 확실하면 고려하겠다",
          },
          { id: "d", label: "이 금액부터는 너무 비싸서 검토 대상에서 제외하겠다" },
        ],
      },
      {
        id: "E5",
        type: "single",
        title: "4~6주 유료 PoC 비용으로 수용 가능한 범위는?",
        required: true,
        options: [
          { value: "1", label: "100만 원 미만" },
          { value: "2", label: "100만~300만 원 미만" },
          { value: "3", label: "300만~500만 원 미만" },
          { value: "4", label: "500만~1,000만 원 미만" },
          { value: "5", label: "1,000만 원 이상" },
          { value: "6", label: "유료 PoC는 검토하지 않음" },
        ],
      },
      {
        id: "E5A",
        type: "text",
        title:
          "(선택) 지금 우리 회사에서 가장 답답하고 가려운 부분, 꼭 해결하고 싶은 문제가 있다면 무엇이든 편하게 적어 주십시오.",
        placeholder:
          "예: 매번 반복되는 같은 불량, 심사철마다 밤새우는 서류 작업, 부서 간 소통 문제 등 (선택 사항)",
        required: false,
      },
      {
        id: "E6",
        type: "single",
        title:
          "진단 리포트와 함께, 33년 경력 반도체 품질 전문가의 1회 무료 전화 자문(20분)을 신청하시겠습니까?",
        required: true,
        options: [
          { value: "1", label: "신청한다" },
          { value: "2", label: "리포트만 받겠다" },
        ],
      },
    ],
  },
];

/** C1~C8 문항 id → 결과 페이지에 쉬운 말로 보여줄 리스크 설명 */
export const PAIN_LABELS: Record<string, { short: string; risk: string }> = {
  C1: {
    short: "바쁘면 정해진 순서를 건너뜁니다",
    risk: "일정이 촉박할 때 작업 절차가 생략되는 경우가 있습니다. 이런 패턴이 반복되면 서류와 현장 실행 간 차이가 커지기 쉽습니다.",
  },
  C2: {
    short: "기준이 문서가 아니라 사람에게 있습니다",
    risk: "담당자가 바뀌면 일하는 방식이 함께 바뀝니다. 이런 구조에서는 인수인계 시점마다 품질 편차가 생기기 쉽습니다.",
  },
  C3: {
    short: "부서끼리 문제가 공유되지 않습니다",
    risk: "출하검사에서 찾은 문제가 제조·개발 부서로 전달되지 않고 있습니다. 공유가 막히면 같은 불량이 되풀이되기 쉽습니다.",
  },
  C4: {
    short: "불량 발생 단계를 추적할 기록이 없습니다",
    risk: "문제가 개발·제조·검사·출하 중 어디서 생겼는지 확인할 기록이 없습니다. 원인 규명이 늦어지고 재발 차단이 어려워집니다.",
  },
  C5: {
    short: "바뀐 내용을 기록 없이 현장에서 먼저 씁니다",
    risk: "사람·설비·재료·작업방법이 승인·기록 없이 바뀌는 경우가 있습니다. 추적과 재현이 어려워지면 작은 변경도 품질 리스크로 이어지기 쉽습니다.",
  },
  C6: {
    short: "원인 분석보다 서류 마감에 급급합니다",
    risk: "시정조치 보고서 작성에 시간을 많이 쓰다 보면, 원인 분석이 충분히 이루어지지 않을 수 있습니다. 같은 유형의 문제가 반복되기 쉽습니다.",
  },
  C7: {
    short: "품질 문제를 숫자로 보여줄 자료가 없습니다",
    risk: "품질 문제로 생기는 손실을 숫자로 정리하기 어렵다면, 경영 논의에서 개선 우선순위가 낮게 잡히기 쉽습니다.",
  },
  C8: {
    short: "지적받은 사항이 다음 심사까지 방치됩니다",
    risk: "고객사 Audit 지적사항의 시정이 지연되면, 다음 심사·평가에서 불리하게 작용할 수 있습니다.",
  },
};

export const TOTAL_REQUIRED_COUNT = SECTIONS.flatMap((s) => s.questions).filter(
  (q) => q.required
).length;
