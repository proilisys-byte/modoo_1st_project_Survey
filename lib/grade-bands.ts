// T-16: 점수→등급→문구 — config/grade_bands.json 단일 소스
import gradeConfig from "@/config/grade_bands.json";

export type GradeCode = "A" | "B" | "C" | "D";

export type GradeBand = {
  min: number;
  code: GradeCode;
  internalName: string;
  name: string;
  plan: string;
};

export const GRADE_BANDS: GradeBand[] = gradeConfig.bands as GradeBand[];

export const GRADE_CONFIG_VERSION = gradeConfig.version;

export function resolveGrade(total: number): GradeBand {
  return GRADE_BANDS.find((g) => total >= g.min) ?? GRADE_BANDS[GRADE_BANDS.length - 1];
}
