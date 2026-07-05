import type { CDisplayOrder } from "./display-order";
import { SCORING_CONFIG_VERSION, SURVEY_VERSION } from "./survey-meta";

export const STORAGE_KEY = "proali_survey_v2";

export type SavedContact = {
  email: string;
  company: string;
  jobTitle: string;
  phone: string;
  consentRequired: boolean;
  marketingOptIn: boolean;
};

export type SavedState = {
  survey_version: string;
  scoring_config_version: string;
  step: number;
  answers: Record<string, unknown>;
  startedAt: number | null;
  contact: SavedContact;
  displayOrder: CDisplayOrder | null;
};

export type SavedStatePayload = Omit<
  SavedState,
  "survey_version" | "scoring_config_version"
>;

/** 저장된 진행 상태가 현재 설문·채점 버전과 일치하는지 */
export function isSavedStateVersionValid(
  s: Partial<SavedState> | null | undefined
): boolean {
  if (!s) return false;
  return (
    s.survey_version === SURVEY_VERSION &&
    s.scoring_config_version === SCORING_CONFIG_VERSION
  );
}

export function readSavedState(): SavedState | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<SavedState>;
    if (!isSavedStateVersionValid(parsed)) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    if (
      typeof parsed.step !== "number" ||
      parsed.step <= 0 ||
      !parsed.answers ||
      typeof parsed.answers !== "object"
    ) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return parsed as SavedState;
  } catch {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
    return null;
  }
}

export function writeSavedState(payload: SavedStatePayload): void {
  if (typeof localStorage === "undefined") return;
  const full: SavedState = {
    ...payload,
    survey_version: SURVEY_VERSION,
    scoring_config_version: SCORING_CONFIG_VERSION,
  };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(full));
  } catch {
    // 시크릿 모드 등 — 설문 진행은 계속
  }
}

export function clearSavedState(): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
