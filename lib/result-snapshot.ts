import { PAIN_LABELS } from "./questions";
import type { DiagnosisResult, RiskItem } from "./scoring";
import { SCORING_RULES_VERSION } from "./scoring-config";

export type Top3SnapshotItem = {
  id: string;
  burden: number;
  short: string;
};

/** 제출 시점 채점 결과 고정 저장 (result_snapshot jsonb) */
export type ResultSnapshot = {
  scoring_config_version: string;
  recomputed: false;
  computed_at: string;
  total: number;
  grade_code: string;
  d1: number;
  d2: number;
  d3: number;
  d4: number;
  top3_computed: Top3SnapshotItem[];
  pain_scores: Record<string, number>;
};

export type ResolvedResult = {
  total: number;
  grade_code: string;
  d1: number;
  d2: number;
  d3: number;
  d4: number;
  top3_computed: Top3SnapshotItem[];
  pain_scores: Record<string, number>;
  scoring_config_version: string;
  recomputed: boolean;
  /** ResultView / 이메일용 — 스냅샷 또는 재계산 */
  diagnosis: DiagnosisResult;
};

function top3FromRisks(risks: RiskItem[]): Top3SnapshotItem[] {
  return risks.map((r) => ({
    id: r.id,
    burden: r.painScore,
    short: r.short,
  }));
}

export function buildResultSnapshot(
  diagnosis: DiagnosisResult,
  scoringConfigVersion: string = SCORING_RULES_VERSION
): ResultSnapshot {
  return {
    scoring_config_version: scoringConfigVersion,
    recomputed: false,
    computed_at: new Date().toISOString(),
    total: diagnosis.total,
    grade_code: diagnosis.gradeCode,
    d1: Math.round(diagnosis.axes[0].score),
    d2: Math.round(diagnosis.axes[1].score),
    d3: Math.round(diagnosis.axes[2].score),
    d4: Math.round(diagnosis.axes[3].score),
    top3_computed: top3FromRisks(diagnosis.risks),
    pain_scores: diagnosis.painScores,
  };
}

export function diagnosisFromSnapshot(snapshot: ResultSnapshot): DiagnosisResult {
  return {
    total: snapshot.total,
    gradeCode: snapshot.grade_code as DiagnosisResult["gradeCode"],
    gradeName: "",
    gradeInternalName: "",
    actionPlan: "",
    axes: [
      { name: "표준 실행력", score: snapshot.d1, max: 30 },
      { name: "부적합·CAPA 성숙도", score: snapshot.d2, max: 30 },
      { name: "부서 협업·환류", score: snapshot.d3, max: 20 },
      { name: "경영 가시성·데이터 관리", score: snapshot.d4, max: 20 },
    ],
    risks: snapshot.top3_computed.map((t) => ({
      id: t.id,
      short: t.short,
      risk: PAIN_LABELS[t.id]?.risk ?? "",
      painScore: t.burden,
    })),
    painScores: snapshot.pain_scores,
  };
}
