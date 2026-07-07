// v03 스코어링 — P14~P18 Pain + B/E25 사실 문항
// C_ATT: attention_passed만, 채점 제외
// Q20 이후: 탐색용, 채점 제외

import { PAIN_LABELS } from "./questions";
import { PAIN_QUESTION_IDS } from "./display-order";
import { resolveGrade, type GradeCode } from "./grade-bands";

export type { GradeCode };

export const SCORING_PAIN_IDS = PAIN_QUESTION_IDS;

export function isScoringPainId(id: string): boolean {
  return (SCORING_PAIN_IDS as readonly string[]).includes(id);
}

export type DualAnswer = { freq: number; sev: number };
export type Answers = Record<string, unknown>;

const SINGLE_GOODNESS: Record<string, Record<string, number>> = {
  B2: { "1": 0, "2": 0.35, "3": 1, "4": 0.5 },
  B4: {
    b4_v2_lte1w: 1,
    b4_v2_1_2w: 0.75,
    b4_v2_2_4w: 0.5,
    b4_v2_gt4w: 0.35,
    b4_v2_effect_weak: 0.2,
    b4_v2_not_operated: 0,
  },
  B6: { "1": 1, "2": 0.6, "3": 0.2, "4": 0 },
  B3: { "1": 1, "2": 0.75, "3": 0.4, "4": 0.15, "5": 0, "6": 0.5 },
  B7: {
    b7_v2_lt3: 1,
    b7_v2_3to6: 0.7,
    b7_v2_7to11: 0.4,
    b7_v2_ge12: 0.15,
    b7_v2_unknown: 0.3,
    b7_v2_dedicated: 0.5,
  },
};

const E25_GOODNESS: Record<string, number> = {
  e25_manual: 0.1,
  e25_excel: 0.3,
  e25_gw: 0.5,
  e25_erp: 0.85,
  e25_mes: 0.85,
  e25_qms: 1,
  e25_outsrc: 0.5,
  e25_unknown: 0.4,
};

function singleGoodness(answers: Answers, id: string): number | null {
  const v = answers[id];
  if (typeof v !== "string") return null;
  const map = SINGLE_GOODNESS[id];
  return map && v in map ? map[v] : null;
}

function e25QualityGoodness(answers: Answers): number | null {
  const e25 = answers["E25"] as Record<string, string> | undefined;
  const q = e25?.quality;
  if (!q || typeof q !== "string") return null;
  return E25_GOODNESS[q] ?? null;
}

export function painScore(answers: Answers, id: string): number | null {
  const v = answers[id] as DualAnswer | undefined;
  if (!v || typeof v.freq !== "number" || typeof v.sev !== "number") return null;
  return v.freq * v.sev;
}

function painSev(answers: Answers, id: string): number {
  const v = answers[id] as DualAnswer | undefined;
  return typeof v?.sev === "number" ? v.sev : -1;
}

function canonicalPainIndex(id: string): number {
  const i = (SCORING_PAIN_IDS as readonly string[]).indexOf(id);
  return i >= 0 ? i : 999;
}

export function comparePainBurdenForTop3(
  aId: string,
  aBurden: number,
  bId: string,
  bBurden: number,
  answers: Answers
): number {
  if (bBurden !== aBurden) return bBurden - aBurden;
  const sevDiff = painSev(answers, bId) - painSev(answers, aId);
  if (sevDiff !== 0) return sevDiff;
  return canonicalPainIndex(aId) - canonicalPainIndex(bId);
}

export function buildPainScores(answers: Answers): Record<string, number> {
  const painScores: Record<string, number> = {};
  for (const id of SCORING_PAIN_IDS) {
    const p = painScore(answers, id);
    if (p !== null) painScores[id] = p;
  }
  return painScores;
}

export function buildTop3Risks(answers: Answers): RiskItem[] {
  const painScores = buildPainScores(answers);
  return (SCORING_PAIN_IDS as readonly string[])
    .filter((id) => id in painScores)
    .sort((aId, bId) =>
      comparePainBurdenForTop3(
        aId,
        painScores[aId],
        bId,
        painScores[bId],
        answers
      )
    )
    .slice(0, 3)
    .map((id) => ({
      id,
      short: PAIN_LABELS[id].short,
      risk: PAIN_LABELS[id].risk,
      painScore: painScores[id],
    }));
}

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
          painGoodness(answers, "P14"),
          painGoodness(answers, "P16"),
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
          singleGoodness(answers, "B6"),
          painGoodness(answers, "P15"),
        ],
        30
      ),
    },
    {
      name: "부서 협업·환류",
      max: 20,
      score: axisScore([painGoodness(answers, "P17")], 20),
    },
    {
      name: "경영 가시성·데이터 관리",
      max: 20,
      score: axisScore(
        [
          singleGoodness(answers, "B3"),
          singleGoodness(answers, "B7"),
          painGoodness(answers, "P18"),
          e25QualityGoodness(answers),
        ],
        20
      ),
    },
  ];

  const total = Math.round(axes.reduce((a, x) => a + x.score, 0));
  const grade = resolveGrade(total);
  const painScores = buildPainScores(answers);
  const risks = buildTop3Risks(answers);

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

export function attentionPassed(answers: Answers): boolean {
  const v = answers["C_ATT"] as DualAnswer | undefined;
  return v?.freq === 2;
}
