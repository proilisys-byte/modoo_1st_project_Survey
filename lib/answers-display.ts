import {
  FREQ_LABELS,
  PRICE_BANDS,
  SEV_LABELS,
  SECTIONS,
  type Question,
} from "./questions";
import type { DualAnswer } from "./scoring";

function optionLabel(q: Question, value: string): string {
  if (q.type === "single" || q.type === "multi") {
    return q.options.find((o) => o.value === value)?.label ?? value;
  }
  return value;
}

function formatSingle(
  q: Question,
  value: unknown,
  answers: Record<string, unknown>
): string {
  if (typeof value !== "string") return "";
  let label = optionLabel(q, value);
  const opt =
    q.type === "single" ? q.options.find((o) => o.value === value) : undefined;
  if (opt?.hasText) {
    const other = answers[`${q.id}_other_${value}`];
    if (typeof other === "string" && other.trim()) {
      label = `${label}: ${other.trim()}`;
    }
  }
  return label;
}

function formatMulti(
  q: Question,
  value: unknown,
  answers: Record<string, unknown>
): string {
  if (q.type !== "multi") return "";
  const list = Array.isArray(value)
    ? value.filter((v): v is string => typeof v === "string")
    : [];
  return list
    .map((v, i) => {
      const base = optionLabel(q, v);
      const opt = q.options.find((o) => o.value === v);
      if (opt?.hasText) {
        const other = answers[`${q.id}_other_${v}`];
        if (typeof other === "string" && other.trim()) {
          return `${i + 1}순위 ${base}: ${other.trim()}`;
        }
      }
      if (q.id === "C9" && q.exact === 3) {
        return `${i + 1}순위 ${base}`;
      }
      return base;
    })
    .join(" | ");
}

function formatDual(value: unknown): string {
  const d = value as DualAnswer | undefined;
  if (!d || typeof d.freq !== "number") return "";
  const freq = FREQ_LABELS[d.freq - 1] ?? String(d.freq);
  if (typeof d.sev !== "number") return `빈도: ${freq}`;
  const sev = SEV_LABELS[d.sev - 1] ?? String(d.sev);
  return `빈도: ${freq} / 영향: ${sev}`;
}

function formatMatrix5(q: Question, value: unknown): string {
  if (q.type !== "matrix5") return "";
  const m = (value ?? {}) as Record<string, number>;
  return q.rows
    .map((r) => `${r.label}: ${m[r.id] ?? "-"}`)
    .join(" | ");
}

function formatPriceMatrix(q: Question, value: unknown): string {
  if (q.type !== "priceMatrix") return "";
  const m = (value ?? {}) as Record<string, number>;
  return q.rows
    .map((r) => {
      const idx = m[r.id];
      const band = typeof idx === "number" ? PRICE_BANDS[idx] : "-";
      return `${r.label}: ${band}`;
    })
    .join(" | ");
}

function formatRank(q: Question, value: unknown): string {
  if (q.type !== "rank") return "";
  const m = (value ?? {}) as Record<string, number>;
  return q.items
    .map((item) => {
      const rank = m[item.id];
      return rank ? `${rank}위 ${item.label}` : `${item.label}: -`;
    })
    .join(" | ");
}

function formatQuestion(
  q: Question,
  answers: Record<string, unknown>
): string | Record<string, string> {
  const value = answers[q.id];
  if (value === undefined || value === null || value === "") return "";

  switch (q.type) {
    case "single":
      return formatSingle(q, value, answers);
    case "multi":
      return formatMulti(q, value, answers);
    case "dualScale":
      return formatDual(value);
    case "matrix5":
      return formatMatrix5(q, value);
    case "priceMatrix":
      return formatPriceMatrix(q, value);
    case "rank":
      return formatRank(q, value);
    case "text":
      return typeof value === "string" ? value : "";
  }
}

/** Supabase Table Editor용 — 응답 코드를 한글 라벨로 변환 */
export function buildAnswersDisplay(
  answers: Record<string, unknown>
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  const allQuestions = SECTIONS.flatMap((s) => s.questions);

  for (const q of allQuestions) {
    const formatted = formatQuestion(q, answers);
    if (formatted === "" || formatted === undefined) continue;
    out[q.id] = formatted;
  }

  // 기타 입력 키 (answers에만 있는 _other_ 필드)
  for (const [key, val] of Object.entries(answers)) {
    if (key.includes("_other_") && typeof val === "string" && val.trim()) {
      out[key] = val.trim();
    }
  }

  return out;
}
