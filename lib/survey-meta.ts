/** 현재 설문 배포 버전 — 신규 응답에 저장 (v1 응답은 수정하지 않음) */
export const SURVEY_VERSION = "v3";

/** 채점 규칙 버전 — config/scoring_rules.json (TOP3 동점 규칙 포함) */
export { SCORING_RULES_VERSION as SCORING_CONFIG_VERSION } from "./scoring-config";

/** 등급 밴드 버전 — config/grade_bands.json */
export { GRADE_CONFIG_VERSION } from "./grade-bands";
