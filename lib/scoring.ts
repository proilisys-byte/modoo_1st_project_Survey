// 설계서 10절 스코어링 로직
// 10.1 ISO 실행력 점수(100점) · 10.2 Pain Score · 10.4 등급→액션플랜

import { PAIN_LABELS } from "./questions";

export type DualAnswer = { freq: number; sev: number };
export type Answers = Record<string, unknown>;

/** 단일 선택 문항의 응답값 → 0(최악)~1(최선) 정규화 매핑 */
const SINGLE_GOODNESS: Record<string, Record<string, number>> = {
  // 축 1. 표준 실행력
  B2: { "1": 0, "2": 0.35, "3": 1, "4": 0.5 },
  // 축 2. 부적합·CAPA 성숙도
  B4: { "1": 1, "2": 0.7, "3": 0.4, "4": 0.2, "5": 0 },
  B5: { "1": 1, "2": 0.75, "3": 0.5, "4": 0.25, "5": 0, "6": 0.4 },
  B6: { "1": 1, "2": 0.6, "3": 0.2, "4": 0 },
  // 축 4. 경영 가시성·데이터 관리
  B3: { "1": 1, "2": 0.75, "3": 0.4, "4": 0.15, "5": 0, "6": 0.5 },
  B7: { "1": 1, "2": 0.7, "3": 0.4, "4": 0.15, "5": 0.3, "6": 0.2 },
  D2: { "1": 0.1, "2": 0.3, "3": 0.6, "4": 1, "5": 0.5 },
};

function singleGoodness(answers: Answers, id: string): number | null {
  const v = answers[id];
  if (typeof v !== "string") return null;
  const map = SINGLE_GOODNESS[id];
  return map && v in map ? map[v] : null;
}

export function painScore(answers: Answers, id: string): number | null {
  const v = answers[id] as DualAnswer | undefined;
  if (!v || typeof v.freq !== "number" || typeof v.sev !== "number") return null;
  return v.freq * v.sev; // 1~25
}

/** Pain Score(1~25) → 0(최악)~1(최선) 역산 */
function painGoodness(answers: Answers, id: string): number | null {
  const p = painScore(answers, id);
  return p === null ? null : 1 - (p - 1) / 24;
}

function axisScore(parts: (number | null)[], weight: number): number {
  const valid = parts.filter((v): v is number => v !== null);
  if (valid.length === 0) return weight * 0.5;
  const avg = valid.reduce((a, b) => a + b, 0) / valid.length;
  return avg * weight;
}

export type AxisResult = { name: string; score: number; max: number };

export type RiskItem = {
  id: string;
  short: string;
  risk: string;
  painScore: number;
};

export type GradeCode = "A" | "B" | "C" | "D";

export type Grade = {
  min: number;
  /** 관리자·분석용 내부 등급 코드 (설계서 10.4 등급 순서) */
  code: GradeCode;
  /** 관리자·리포트용 정식 등급명 (설계서 10.4) */
  internalName: string;
  /** 응답자 화면에 보여줄 친근한 문구 */
  name: string;
  plan: string;
};

export const GRADES: Grade[] = [
  {
    min: 80,
    code: "A",
    internalName: "AI 운영혁신 준비 기업",
    name: "잘 갖춰진 편이에요",
    plan: "품질 관리의 기본 틀이 잘 잡혀 있습니다. 이제 종이나 엑셀 대신 데이터로 품질을 실시간 관리하는 단계로 넘어가 보시길 권합니다.",
  },
  {
    min: 60,
    code: "B",
    internalName: "실행 체계 보완 필요 기업",
    name: "조금만 보완하면 돼요",
    plan: "기본은 갖췄지만 몇몇 영역이 약합니다. 위 \u2018영역별 현황\u2019에서 막대가 가장 짧은 영역부터 4주 정도 집중해 개선해 보시길 권합니다.",
  },
  {
    min: 40,
    code: "C",
    internalName: "ISO 실행 갭 고위험 기업",
    name: "실행이 서류를 못 따라가고 있어요",
    plan: "규정은 있지만 현장 실행이 따라가지 못하는 상태입니다. 매일 점검하는 체크시트와 불량 조치 이력 관리부터 시작하시길 권합니다.",
  },
  {
    min: 0,
    code: "D",
    internalName: "고객 Audit 리스크 집중관리 기업",
    name: "지금 바로 챙겨야 해요",
    plan: "지금 상태로는 고객사 심사나 거래 유지에 문제가 생길 수 있습니다. 전문가 상담을 통해 급한 개선 항목부터 함께 정리해 보시길 권합니다.",
  },
];

export type DiagnosisResult = {
  total: number;
  gradeCode: GradeCode;
  gradeName: string;
  gradeInternalName: string;
  actionPlan: string;
  axes: AxisResult[];
  risks: RiskItem[];
  painScores: Record<string, number>;
};

export function diagnose(answers: Answers): DiagnosisResult {
  const axes: AxisResult[] = [
    {
      name: "표준 실행력",
      max: 30,
      score: axisScore(
        [
          singleGoodness(answers, "B2"),
          painGoodness(answers, "C1"),
          painGoodness(answers, "C2"),
          painGoodness(answers, "C5"),
        ],
        30
      ),
    },
    {
      name: "부적합·CAPA 성숙도",
      max: 30,
      score: axisScore(
        [
          singleGoodness(answers, "B4"),
          singleGoodness(answers, "B5"),
          singleGoodness(answers, "B6"),
          painGoodness(answers, "C4"),
          painGoodness(answers, "C6"),
        ],
        30
      ),
    },
    {
      name: "부서 협업·환류",
      max: 20,
      score: axisScore(
        [painGoodness(answers, "C3"), painGoodness(answers, "C8")],
        20
      ),
    },
    {
      name: "경영 가시성·데이터 관리",
      max: 20,
      score: axisScore(
        [
          singleGoodness(answers, "B3"),
          singleGoodness(answers, "B7"),
          painGoodness(answers, "C7"),
          singleGoodness(answers, "D2"),
        ],
        20
      ),
    },
  ];

  const total = Math.round(axes.reduce((a, x) => a + x.score, 0));
  const grade = GRADES.find((g) => total >= g.min) ?? GRADES[GRADES.length - 1];

  const painScores: Record<string, number> = {};
  for (const id of Object.keys(PAIN_LABELS)) {
    const p = painScore(answers, id);
    if (p !== null) painScores[id] = p;
  }

  const risks: RiskItem[] = Object.entries(painScores)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([id, p]) => ({
      id,
      short: PAIN_LABELS[id].short,
      risk: PAIN_LABELS[id].risk,
      painScore: p,
    }));

  return {
    total,
    gradeCode: grade.code,
    gradeName: grade.name,
    gradeInternalName: grade.internalName,
    actionPlan: grade.plan,
    axes,
    risks,
    painScores,
  };
}

/** 주의 확인 문항 통과 여부 — 빈도에서 2를 선택해야 통과 */
export function attentionPassed(answers: Answers): boolean {
  const v = answers["C_ATT"] as DualAnswer | undefined;
  return v?.freq === 2;
}
