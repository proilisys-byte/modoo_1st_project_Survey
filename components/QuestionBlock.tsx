"use client";

import { useState } from "react";
import {
  FREQ_LABELS,
  SEV_LABELS,
  type Question,
  type Option,
} from "@/lib/questions";
import type { DualAnswer } from "@/lib/scoring";
import { isAnswered } from "@/lib/question-utils";
import { ErrorText, OptionCard, ScaleRow } from "./ui";

export { isAnswered };

type Props = {
  question: Question;
  index: number;
  answers: Record<string, unknown>;
  showError: boolean;
  onAnswer: (id: string, value: unknown) => void;
  shuffledOptions?: Option[];
};

function OtherInput({
  option,
  qid,
  answers,
  onAnswer,
}: {
  option: Option;
  qid: string;
  answers: Record<string, unknown>;
  onAnswer: (id: string, value: unknown) => void;
}) {
  const key = `${qid}_other_${option.value}`;
  return (
    <input
      type="text"
      value={(answers[key] as string) ?? ""}
      onChange={(e) => onAnswer(key, e.target.value)}
      placeholder="내용을 입력해 주세요"
      className="mt-2 w-full rounded-lg border-2 border-slate-200 px-3 py-2.5 text-[15px] focus:border-brand-500 focus:outline-none"
    />
  );
}

export default function QuestionBlock({
  question: q,
  index,
  answers,
  showError,
  onAnswer,
  shuffledOptions,
}: Props) {
  const unanswered = showError && q.required && !isAnswered(q, answers);
  const [limitNotice, setLimitNotice] = useState(false);

  return (
    <div
      id={`q-${q.id}`}
      className={`rounded-2xl bg-white p-5 shadow-sm border ${
        unanswered ? "border-red-300" : "border-slate-100"
      } ${"attention" in q && q.attention ? "border-amber-300 bg-amber-50/50" : ""}`}
    >
      <p className="mb-4 font-semibold text-[16px] leading-relaxed">
        <span className="mr-1.5 text-brand-600">{index}.</span>
        {q.title}
        {!q.required && (
          <span className="ml-1.5 text-xs font-normal text-ink-500">(선택)</span>
        )}
      </p>

      {"note" in q && q.note && (
        <p className="-mt-2 mb-4 text-sm text-ink-500">{q.note}</p>
      )}

      {q.type === "single" && (
        <div className="space-y-2">
          {q.options.map((op) => {
            const selected = answers[q.id] === op.value;
            return (
              <div key={op.value}>
                <OptionCard
                  selected={selected}
                  onClick={() => onAnswer(q.id, op.value)}
                >
                  {op.label}
                </OptionCard>
                {op.hasText && selected && (
                  <OtherInput
                    option={op}
                    qid={q.id}
                    answers={answers}
                    onAnswer={onAnswer}
                  />
                )}
              </div>
            );
          })}
        </div>
      )}

      {q.type === "multi" && (
        <div className="space-y-2">
          {(() => {
            const options = shuffledOptions ?? q.options;
            return (
              <>
          {q.exact && (
            <p className="text-xs font-medium text-brand-700 -mt-2 mb-2">
              {((answers[q.id] as string[]) ?? []).length}/{q.exact} 선택됨
            </p>
          )}
          <p className="text-xs text-ink-500 -mt-2 mb-2">
            {q.exact
              ? `정확히 ${q.exact}개를 선택해 주세요`
              : q.max
                ? `최대 ${q.max}개까지 선택 가능`
                : "해당하는 항목을 모두 선택해 주세요"}
          </p>
          {options.map((op) => {
            const list = (answers[q.id] as string[]) ?? [];
            const selected = list.includes(op.value);
            const limit = q.exact ?? q.max;
            const exclusive = op.exclusive === true;
            const exclusiveValues = q.options
              .filter((o) => o.exclusive)
              .map((o) => o.value);
            return (
              <div key={op.value}>
                <OptionCard
                  multi
                  selected={selected}
                  onClick={() => {
                    if (selected) {
                      onAnswer(
                        q.id,
                        list.filter((v) => v !== op.value)
                      );
                      setLimitNotice(false);
                      return;
                    }
                    if (exclusive) {
                      onAnswer(q.id, [op.value]);
                      setLimitNotice(false);
                      return;
                    }
                    const base = list.filter((v) => !exclusiveValues.includes(v));
                    if (limit !== undefined && base.length >= limit) {
                      setLimitNotice(true);
                      return;
                    }
                    onAnswer(q.id, [...base, op.value]);
                    setLimitNotice(false);
                  }}
                >
                  {op.label}
                </OptionCard>
                {op.hasText && selected && (
                  <OtherInput
                    option={op}
                    qid={q.id}
                    answers={answers}
                    onAnswer={onAnswer}
                  />
                )}
              </div>
            );
          })}
          {limitNotice && (q.exact ?? q.max) !== undefined && (
            <p className="mt-1 text-sm font-medium text-amber-600">
              {q.exact
                ? `정확히 ${q.exact}개를 선택해야 다음으로 진행할 수 있습니다.`
                : `최대 ${q.max}개까지만 선택할 수 있습니다. 변경하시려면 선택한 항목을 먼저 해제해 주세요.`}
            </p>
          )}
              </>
            );
          })()}
        </div>
      )}

      {q.type === "dualScale" && (
        <div className="space-y-4">
          {"attention" in q && q.attention && (
            <p className="text-xs text-ink-500 -mt-2">
              업무 영향도는 선택하지 않아도 됩니다.
            </p>
          )}
          {"tag" in q && q.tag && (
            <span className="inline-block rounded-full bg-slate-100 px-2.5 py-0.5 text-xs text-ink-500 -mt-2">
              {q.tag}
            </span>
          )}
          <div>
            <p className="mb-2 text-sm font-semibold text-ink-700">발생 빈도</p>
            <ScaleRow
              name={`${q.id} 발생 빈도`}
              labels={FREQ_LABELS}
              value={(answers[q.id] as DualAnswer | undefined)?.freq}
              onChange={(n) =>
                onAnswer(q.id, {
                  ...((answers[q.id] as DualAnswer) ?? {}),
                  freq: n,
                })
              }
            />
          </div>
          <div>
            <p className="mb-2 text-sm font-semibold text-ink-700">
              업무 영향도
              {"sevOptional" in q && q.sevOptional && (
                <span className="ml-1 text-xs font-normal text-ink-500">
                  (선택)
                </span>
              )}
            </p>
            <ScaleRow
              name={`${q.id} 업무 영향도`}
              labels={SEV_LABELS}
              value={(answers[q.id] as DualAnswer | undefined)?.sev}
              onChange={(n) =>
                onAnswer(q.id, {
                  ...((answers[q.id] as DualAnswer) ?? {}),
                  sev: n,
                })
              }
            />
          </div>
        </div>
      )}

      {q.type === "matrix5" && (
        <div className="space-y-5">
          <p className="text-xs text-ink-500 -mt-2">
            1 = {q.scaleHint.low} ~ 5 = {q.scaleHint.high}
          </p>
          {q.rows.map((row) => {
            const m = (answers[q.id] ?? {}) as Record<string, number>;
            return (
              <div key={row.id}>
                <p className="mb-2 text-sm font-medium text-ink-700">
                  {row.label}
                </p>
                <div className="grid grid-cols-5 gap-1.5">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      type="button"
                      aria-pressed={m[row.id] === n}
                      onClick={() => onAnswer(q.id, { ...m, [row.id]: n })}
                      className={`h-10 rounded-lg border-2 text-sm font-semibold transition-colors ${
                        m[row.id] === n
                          ? "border-brand-600 bg-brand-600 text-white"
                          : "border-slate-200 bg-white text-ink-700 hover:border-brand-300"
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {q.type === "priceMatrix" && (
        <div className="space-y-5">
          {q.rows.map((row) => {
            const m = (answers[q.id] ?? {}) as Record<string, number>;
            return (
              <div key={row.id}>
                <p className="mb-2 text-sm font-medium text-ink-700">
                  {row.label}
                </p>
                <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
                  {q.bands.map((band, i) => (
                    <button
                      key={band}
                      type="button"
                      aria-pressed={m[row.id] === i}
                      onClick={() => onAnswer(q.id, { ...m, [row.id]: i })}
                      className={`rounded-lg border-2 px-2 py-2.5 text-[13px] font-medium transition-colors ${
                        m[row.id] === i
                          ? "border-brand-600 bg-brand-600 text-white"
                          : "border-slate-200 bg-white text-ink-700 hover:border-brand-300"
                      }`}
                    >
                      {band}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {q.type === "text" && (
        <textarea
          value={(answers[q.id] as string) ?? ""}
          onChange={(e) => onAnswer(q.id, e.target.value)}
          placeholder={q.placeholder}
          rows={4}
          className="w-full rounded-xl border-2 border-slate-200 px-4 py-3 text-[15px] focus:border-brand-500 focus:outline-none resize-y"
        />
      )}

      <ErrorText show={unanswered} />
    </div>
  );
}
