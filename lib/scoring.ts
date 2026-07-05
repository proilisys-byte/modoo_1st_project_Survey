// 설계서 10절 스코어링 로직
// 10.1 ISO 실행력 점수(100점) · 10.2 Pain Score · 10.4 등급→액션플랜
//
// T-14: 채점·벤치마크 제외 문항
// - C_ATT (주의확인): 도메인 점수·Pain TOP3·pain_scores 모두 제외.
//   attention_passed(boolean)만 저장 — 빈도 2 선택 여부, 오답이어도 제출 허용.
// - C9 (TOP3 자가선택): 점수 계산 제외, answers JSON에만 저장.
//
// TOP3(computed) 동점 규칙 (burden = freq x sev):
//   1) burden 내림차순  2) 동점 -> sev 내림차순  3) 동점 -> C1->C8 canonical
// C_ATT 제외: SCORING_PAIN_IDS(C1~C8) whitelist — C_pain 배열 index/slice 아님.
// DB 확정(2026-07): C1=1×1(burden 1), C2~C8=2×2(burden 4) → TOP3=C2,C3,C4 정상.
//   (C1 sev 미저장 가설 기각 — submit 구멍·동점 규칙은 예방 조치로 유지)

import { PAIN_LABELS } from "./questions";
import {
  PAIN_QUESTION_IDS,
} from "./display-order";
import { resolveGrade, type GradeCode } from "./grade-bands";

export type { GradeCode };

/** 채점·TOP3·pain_scores 대상 — C1~C8 key만 (C_ATT/C9 제외, index 아님) */
export const SCORING_PAIN_IDS = PAIN_QUESTION_IDS;

export function isScoringPainId(id: string): boolean {
  return (SCORING_PAIN_IDS as readonly string[]).includes(id);
}

export type DualAnswer = { freq: number; sev: number };
export type Answers = Record<string, unknown>;

/** 단일 선택 문항의 응답값 → 0(최악)~1(최선) 정규화 매핑 */
const SINGLE_GOODNESS: Record<string, Record<string, number>> = {
  // 축 1. 표준 실행력
  B2: { "1": 0, "2": 0.35, "3": 1, "4": 0.5 },
  // 축 2. 부적합·CAPA 성숙도
  // v2 상호배타 기간 구간 (v1 key "1"~"3" deprecated — lib/boundaries.ts 7/14/28일 절단)
  B4: {
    b4_v2_lte1w: 1,
    b4_v2_1_2w: 0.75,
    b4_v2_2_4w: 0.5,
    b4_v2_gt4w: 0.35,
    b4_v2_effect_weak: 0.2,
    b4_v2_not_operated: 0,
  },
  B5: { "1": 1, "2": 0.75, "3": 0.5, "4": 0.25, "5": 0, "6": 0.4 },
  B6: { "1": 1, "2": 0.6, "3": 0.2, "4": 0 },
  // 축 4. 경영 가시성·데이터 관리
  B3: { "1": 1, "2": 0.75, "3": 0.4, "4": 0.15, "5": 0, "6": 0.5 },
  // v2 상호배타 구간 (v1 key 1~6 deprecated — harmonize.ts 참조)
  B7: {
    b7_v2_lt3: 1,
    b7_v2_3to6: 0.7,
    b7_v2_7to11: 0.4,
    b7_v2_ge12: 0.15,
    b7_v2_unknown: 0.3,
  },
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
  return v.freq * v.sev; // 1~25 burden
}

function painSev(answers: Answers, id: string): number {
  const v = answers[id] as DualAnswer | undefined;
  return typeof v?.sev === "number" ? v.sev : -1;
}

function canonicalPainIndex(id: string): number {
  const i = (SCORING_PAIN_IDS as readonly string[]).indexOf(id);
  return i >= 0 ? i : 999;
}

/** TOP3 burden 정렬 — 동점: sev desc, then C1->C8 */
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

export type Grade = {
  min: number;
  code: GradeCode;
  internalName: string;
  name: string;
  plan: string;
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

/** 주의 확인 문항 통과 여부 — 빈도에서 2를 선택해야 통과 */
export function attentionPassed(answers: Answers): boolean {
  const v = answers["C_ATT"] as DualAnswer | undefined;
  return v?.freq === 2;
}
