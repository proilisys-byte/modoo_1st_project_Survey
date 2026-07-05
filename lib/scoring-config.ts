/** 채점 규칙 단일 소스 — config/scoring_rules.json (등급 밴드와 별도) */
import rules from "@/config/scoring_rules.json";

export const SCORING_RULES_VERSION = rules.version;

export const TOP3_TIEBREAK = rules.top3_tiebreak as readonly string[];

export const SCORING_PAIN_IDS_FROM_CONFIG = rules.scoring_pain_ids as readonly string[];
