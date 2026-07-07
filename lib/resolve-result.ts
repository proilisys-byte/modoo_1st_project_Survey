import { diagnose, type Answers, type DiagnosisResult } from "./scoring";
import {
  buildResultSnapshot,
  diagnosisFromSnapshot,
  type ResultSnapshot,
  type ResolvedResult,
} from "./result-snapshot";

export function resolveResult(
  row: {
    answers: Answers;
    result_snapshot?: ResultSnapshot | null;
    scoring_config_version?: string | null;
  },
  gradeNames?: Pick<DiagnosisResult, "gradeName" | "gradeInternalName" | "actionPlan">
): ResolvedResult {
  const snap = row.result_snapshot;
  if (
    snap &&
    snap.recomputed === false &&
    typeof snap.total === "number" &&
    Array.isArray(snap.top3_computed)
  ) {
    const diagnosis = diagnosisFromSnapshot(snap);
    if (gradeNames) {
      diagnosis.gradeName = gradeNames.gradeName;
      diagnosis.gradeInternalName = gradeNames.gradeInternalName;
      diagnosis.actionPlan = gradeNames.actionPlan;
    }
    return {
      total: snap.total,
      grade_code: snap.grade_code,
      d1: snap.d1,
      d2: snap.d2,
      d3: snap.d3,
      d4: snap.d4,
      top3_computed: snap.top3_computed,
      pain_scores: snap.pain_scores,
      scoring_config_version: snap.scoring_config_version,
      recomputed: false,
      diagnosis,
    };
  }

  const diagnosis = diagnose(row.answers);
  const built = buildResultSnapshot(
    diagnosis,
    row.scoring_config_version ?? undefined
  );
  return {
    total: built.total,
    grade_code: built.grade_code,
    d1: built.d1,
    d2: built.d2,
    d3: built.d3,
    d4: built.d4,
    top3_computed: built.top3_computed,
    pain_scores: built.pain_scores,
    scoring_config_version: built.scoring_config_version,
    recomputed: true,
    diagnosis,
  };
}
