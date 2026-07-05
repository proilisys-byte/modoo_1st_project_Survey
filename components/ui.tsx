"use client";

/** 반도체 웨이퍼 장식 마크 — 정사각 컨테이너에 원형 클립으로 흰 배경 모서리를 제거 */
export function WaferMark({
  size = 28,
  className = "",
  opacity = 1,
}: {
  size?: number;
  className?: string;
  opacity?: number;
}) {
  return (
    <span
      aria-hidden
      className={`pointer-events-none inline-block overflow-hidden rounded-full ring-1 ring-brand-100 ${className}`}
      style={{ width: size, height: size, opacity }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/wafer.png"
        alt=""
        className="h-full w-full scale-105 object-cover"
      />
    </span>
  );
}

export function ProgressBar({
  label,
  percent,
}: {
  label: string;
  percent: number;
}) {
  return (
    <div className="sticky top-0 z-20 bg-white/90 backdrop-blur border-b border-slate-200">
      <div className="mx-auto max-w-2xl px-4 py-3">
        <div className="flex items-center justify-between mb-1.5">
          <span className="flex items-center gap-2 text-sm font-semibold text-brand-700">
            <WaferMark size={20} />
            {label}
          </span>
          <span className="text-xs text-ink-500 tabular-nums">
            {Math.round(percent)}%
          </span>
        </div>
        <div
          className="h-2 rounded-full bg-slate-200 overflow-hidden"
          role="progressbar"
          aria-valuenow={Math.round(percent)}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className="h-full rounded-full bg-brand-600 transition-all duration-300"
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>
    </div>
  );
}

export function OptionCard({
  selected,
  onClick,
  children,
  multi = false,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
  multi?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`w-full text-left rounded-xl border-2 px-4 py-3.5 text-[15px] leading-snug transition-colors active:scale-[0.99] ${
        selected
          ? "border-brand-600 bg-brand-50 text-brand-900 font-medium"
          : "border-slate-200 bg-white text-ink-700 hover:border-brand-200"
      }`}
    >
      <span className="flex items-start gap-3">
        <span
          aria-hidden
          className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center border-2 text-white text-xs ${
            multi ? "rounded-md" : "rounded-full"
          } ${
            selected ? "border-brand-600 bg-brand-600" : "border-slate-300 bg-white"
          }`}
        >
          {selected ? "✓" : ""}
        </span>
        <span>{children}</span>
      </span>
    </button>
  );
}

/** 1~5 척도 버튼 행 */
export function ScaleRow({
  value,
  onChange,
  labels,
  name,
}: {
  value: number | undefined;
  onChange: (v: number) => void;
  labels: string[];
  name: string;
}) {
  const short = (l: string) => l.replace(/\s*\(.*\)\s*$/, "");
  return (
    <div className="grid grid-cols-5 gap-1.5" role="radiogroup" aria-label={name}>
      {[1, 2, 3, 4, 5].map((n) => (
        <div key={n} className="flex flex-col items-center gap-1">
          <button
            type="button"
            role="radio"
            aria-checked={value === n}
            onClick={() => onChange(n)}
            className={`h-11 w-full rounded-lg border-2 text-base font-semibold transition-colors ${
              value === n
                ? "border-brand-600 bg-brand-600 text-white"
                : "border-slate-200 bg-white text-ink-700 hover:border-brand-300"
            }`}
          >
            {n}
          </button>
          <span
            className={`text-center text-[11px] leading-tight ${
              value === n ? "font-semibold text-brand-700" : "text-ink-500"
            }`}
          >
            {short(labels[n - 1])}
          </span>
        </div>
      ))}
    </div>
  );
}

export function ErrorText({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <p className="mt-2 text-sm font-medium text-red-600">
      이 문항에 응답해 주세요.
    </p>
  );
}
