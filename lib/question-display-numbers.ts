/**
 * Survey_Based_v03.md §3 표시 번호 — 메인 N, Deep Dive N-1 / N-2 / N-3
 * (순차 findIndex 번호와 무관하게 고정 라벨)
 */
import { SECTIONS } from "./questions";

const SPEC_LABELS: Record<string, string> = {
  A1: "1",
  A2: "2",
  A3: "3",
  A4: "4",
  A5: "5",
  A6: "6",
  "A6-1": "6-1",
  B1: "7",
  B2: "8",
  "B2-1": "8-1",
  "B2-2": "8-2",
  B3: "9",
  B3A: "10",
  q10_basis: "10-1",
  B4: "11",
  B6: "12",
  B7: "13",
  P14: "14",
  P15: "15",
  "P15-1": "15-1",
  P16: "16",
  P17: "17",
  P18: "18",
  C_ATT: "19",
  Q20: "20",
  "Q20-1": "20-1",
  "Q20-2": "20-2",
  D1: "21",
  D3: "22",
  "D3-1": "22-1",
  D4: "23",
  D5: "24",
  E25: "25",
  "E25-1": "25-1",
  "E25-2": "25-2",
  "E25-3": "25-3",
  E26: "26",
  F27: "27",
  F28: "28",
  F29: "29",
  "F29-1": "29-1",
  "F29-2": "29-2",
  F30: "30",
  F31: "31",
  F32: "32",
  "F32-1": "32-1",
  F33: "33",
  F34: "34",
};

/** F28-1_{barrier} → 28-1 */
function resolveLabel(id: string): string | undefined {
  if (SPEC_LABELS[id]) return SPEC_LABELS[id];
  if (id.startsWith("F28-1_")) return "28-1";
  return undefined;
}

const ALL_IDS = SECTIONS.flatMap((s) => s.questions.map((q) => q.id));

export const QUESTION_DISPLAY_LABEL: Record<string, string> = Object.fromEntries(
  ALL_IDS.map((id) => {
    const label = resolveLabel(id);
    return [id, label ?? id];
  })
);

export function getQuestionDisplayLabel(questionId: string): string {
  return QUESTION_DISPLAY_LABEL[questionId] ?? questionId;
}
