"use client";

import { useEffect, useRef, useState } from "react";
import type { DiagnosisResult } from "@/lib/scoring";
import type { CtaType } from "@/lib/supabase";
import { WaferMark } from "./ui";
type CtaState = "idle" | "loading" | "done" | "error";

const CTA_ITEMS: {
  type: CtaType;
  title: string;
  desc: string;
  badge?: string;
  primary?: boolean;
}[] = [
  {
    type: "free_diagnosis",
    title: "무료 현장 진단 신청",
    desc: "신청 기업 중 선정된 3곳에 한해, 전문가가 직접 현장을 방문해 무료로 심층 진단해 드립니다.",
    badge: "선정 3곳 한정",
    primary: true,
  },
  {
    type: "consulting",
    title: "전문가 상담 신청",
    desc: "33년 경력 반도체 품질 전문가와 20분 무료 전화 상담으로 우리 회사 상황을 짚어봅니다.",
  },
  {
    type: "poc",
    title: "유료 PoC 문의",
    desc: "4~6주간 실제 데이터로 개선 효과를 검증하는 시범 적용(PoC)을 문의합니다.",
  },
];

export default function ResultView({
  result,
  email,
  initialPhone,
  saved,
  saveError,
  emailSent,
  submissionUid,
  onResendReport,
  onCtaRequest,
  onCtaCancel,
}: {
  result: DiagnosisResult;
  email: string;
  initialPhone: string;
  saved: boolean;
  saveError?: string;
  emailSent: boolean;
  submissionUid: string;
  onResendReport: () => Promise<{ sent: boolean; rateLimited?: boolean }>;
  onCtaRequest: (
    ctaType: CtaType,
    phone: string
  ) => Promise<{ saved: boolean; error?: string }>;
  onCtaCancel: (
    ctaType: CtaType
  ) => Promise<{ cancelled: boolean; error?: string }>;
}) {
  const [phone, setPhone] = useState(initialPhone);
  const [ctaState, setCtaState] = useState<Record<CtaType, CtaState>>({
    free_diagnosis: "idle",
    consulting: "idle",
    poc: "idle",
  });
  const [ctaError, setCtaError] = useState<string | undefined>();
  const [resendState, setResendState] = useState<
    "idle" | "loading" | "done" | "limited"
  >("idle");
  const autoResendDone = useRef(false);

  useEffect(() => {
    if (!saved || emailSent || !submissionUid || autoResendDone.current) return;
    autoResendDone.current = true;
    (async () => {
      setResendState("loading");
      for (let attempt = 0; attempt < 3; attempt++) {
        if (attempt > 0) {
          await new Promise((r) => setTimeout(r, 2000));
        }
        const res = await onResendReport();
        if (res.rateLimited) {
          setResendState("limited");
          return;
        }
        if (res.sent) {
          setResendState("done");
          return;
        }
      }
      setResendState("idle");
    })();
  }, [saved, emailSent, submissionUid, onResendReport]);

  const handleResend = async () => {
    setResendState("loading");
    const res = await onResendReport();
    if (res.rateLimited) setResendState("limited");
    else if (res.sent) setResendState("done");
    else setResendState("idle");
  };
  const toggleCta = async (type: CtaType) => {
    const applied = ctaState[type] === "done";
    setCtaState((s) => ({ ...s, [type]: "loading" }));
    setCtaError(undefined);

    if (applied) {
      const res = await onCtaCancel(type);
      setCtaState((s) => ({
        ...s,
        [type]: res.cancelled ? "idle" : "done",
      }));
      if (!res.cancelled) setCtaError(res.error);
      return;
    }

    const res = await onCtaRequest(type, phone);
    setCtaState((s) => ({ ...s, [type]: res.saved ? "done" : "error" }));
    if (!res.saved) setCtaError(res.error);
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 space-y-6">
      <div className="text-center">
        <p className="text-sm font-semibold text-brand-600">진단 완료</p>
        <h1 className="mt-1 text-2xl font-bold">우리 회사 ISO 실행력 진단 결과</h1>
      </div>

      {/* 총점 + 등급 */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-700 to-brand-900 p-8 text-center text-white shadow-lg">
        <WaferMark
          size={120}
          opacity={0.28}
          className="!absolute -left-8 -bottom-8 !ring-0"
        />
        <p className="relative text-sm text-brand-100">
          ISO 실행력 점수 (100점 만점)
        </p>
        <p className="relative my-2 text-6xl font-extrabold tabular-nums">
          {result.total}
        </p>
        <p className="relative inline-block rounded-full bg-white/15 px-4 py-1.5 text-sm font-semibold">
          {result.gradeName}
        </p>
      </div>

      {/* 4개 축 */}
      <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-100">
        <h2 className="mb-1 font-bold">영역별로 보는 우리 회사 현황</h2>
        <p className="mb-4 text-xs text-ink-500">
          막대가 길수록(초록색일수록) 잘 되고 있는 영역, 짧을수록(빨간색일수록)
          보완이 필요한 영역입니다.
        </p>
        <div className="space-y-4">
          {result.axes.map((axis) => {
            const pct = (axis.score / axis.max) * 100;
            return (
              <div key={axis.name}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="font-medium text-ink-700">{axis.name}</span>
                  <span className="tabular-nums text-ink-500">
                    {Math.round(axis.score)} / {axis.max}
                  </span>
                </div>
                <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      pct >= 66
                        ? "bg-emerald-500"
                        : pct >= 40
                          ? "bg-amber-400"
                          : "bg-red-400"
                    }`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 리스크 TOP 3 */}
      <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-100">
        <h2 className="mb-1 font-bold">지금 가장 신경 써야 할 3가지</h2>
        <p className="mb-4 text-xs text-ink-500">
          &lsquo;얼마나 자주 겪는지&rsquo;와 &lsquo;겪을 때 얼마나 힘든지&rsquo;를
          함께 계산해, 귀사에 가장 부담이 큰 순서로 뽑았습니다.
        </p>
        <ol className="space-y-3">
          {result.risks.map((r, i) => (
            <li
              key={r.id}
              className="flex gap-3 rounded-xl border border-slate-100 bg-slate-50 p-4"
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-red-500 text-sm font-bold text-white">
                {i + 1}
              </span>
              <div>
                <p className="font-semibold text-[15px]">{r.short}</p>
                <p className="mt-1 text-sm leading-relaxed text-ink-700">
                  {r.risk}
                </p>
                <p className="mt-2 flex items-center gap-1.5 text-xs text-ink-500">
                  <span>체감 부담 정도</span>
                  <span className="font-semibold text-red-600 tabular-nums">
                    {r.painScore}
                  </span>
                  <span>/ 25점 (높을수록 부담이 큼)</span>
                </p>
              </div>
            </li>
          ))}
          {result.risks.length === 0 && (
            <li className="text-sm text-ink-500">
              표시할 항목이 없습니다.
            </li>
          )}
        </ol>
      </div>

      {/* 액션 플랜 */}
      <div className="rounded-2xl border-2 border-brand-100 bg-brand-50 p-6">
        <h2 className="mb-2 font-bold text-brand-900">
          그래서, 무엇부터 하면 좋을까요?
        </h2>
        <p className="text-[15px] leading-relaxed text-brand-900">
          {result.actionPlan}
        </p>
      </div>

      {/* CTA — 신청 저장 */}
      <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-100">
        <h2 className="font-bold">다음 단계로 진행해 보세요</h2>
        <p className="mt-1 text-xs text-ink-500">
          아래에서 원하는 지원을 신청하시면 담당자가 순차적으로 연락드립니다. 신청
          후 다시 클릭하면 신청을 해제할 수 있습니다.
        </p>

        <div className="mt-4">
          <label
            htmlFor="cta-phone"
            className="mb-1.5 block text-sm font-semibold"
          >
            연락받으실 번호{" "}
            <span className="font-normal text-xs text-ink-500">
              (전화 상담·PoC·현장 진단 시 필요)
            </span>
          </label>
          <input
            id="cta-phone"
            type="tel"
            inputMode="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="010-0000-0000"
            className="w-full rounded-xl border-2 border-slate-200 px-4 py-3 text-[15px] focus:border-brand-500 focus:outline-none"
          />
        </div>

        <div className="mt-4 space-y-3">
          {CTA_ITEMS.map((item) => {
            const state = ctaState[item.type];
            const done = state === "done";
            return (
              <div
                key={item.type}
                className={`rounded-xl border-2 p-4 ${
                  item.primary
                    ? "border-brand-200 bg-brand-50"
                    : "border-slate-200 bg-white"
                }`}
              >
                <div className="mb-1 flex items-center gap-2">
                  <p className="font-semibold text-[15px]">{item.title}</p>
                  {item.badge && (
                    <span className="rounded-full bg-red-500 px-2 py-0.5 text-[11px] font-bold text-white">
                      {item.badge}
                    </span>
                  )}
                </div>
                <p className="mb-3 text-sm text-ink-500">{item.desc}</p>
                <button
                  type="button"
                  onClick={() => toggleCta(item.type)}
                  disabled={state === "loading"}
                  className={`w-full rounded-lg py-3 text-sm font-bold transition-colors disabled:opacity-70 ${
                    done
                      ? "bg-emerald-500 text-white hover:bg-emerald-600"
                      : item.primary
                        ? "bg-brand-600 text-white hover:bg-brand-700"
                        : "border-2 border-brand-600 text-brand-700 hover:bg-brand-50"
                  }`}
                >
                  {done
                    ? "✓ 신청됨 — 클릭하면 신청 해제"
                    : state === "loading"
                      ? "처리 중..."
                      : `${item.title}하기`}
                </button>
              </div>
            );
          })}
        </div>

        {ctaError && (
          <p className="mt-3 text-sm text-amber-700">
            신청·해제 처리에 실패했습니다{ctaError ? ` — ${ctaError}` : ""}. 잠시
            후 다시 시도해 주세요.
          </p>
        )}
      </div>

      {/* 리포트 발송 안내 */}
      <div className="rounded-2xl bg-white p-6 text-center shadow-sm border border-slate-100">
        <p className="text-[15px] font-semibold text-brand-700">
          끝까지 응답해 주셔서 감사합니다.
        </p>
        {saved ? (
          emailSent || resendState === "done" ? (
            <p className="mt-2 text-[15px]">
              상세 진단 리포트가{" "}
              <span className="font-semibold text-brand-700">{email}</span> 으로
              발송되었습니다. 메일함(스팸함 포함)을 확인해 주세요.
            </p>
          ) : (
            <>
              <p className="mt-2 text-sm text-amber-700">
                리포트 발송이 지연되고 있습니다. 응답은 안전하게 저장되었으며,
                준비되는 대로 입력하신 이메일로 보내드립니다. 화면의 진단 결과는
                정상입니다.
              </p>
              {submissionUid && (
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={resendState === "loading"}
                  className="mt-4 rounded-lg border-2 border-brand-600 px-4 py-2 text-sm font-semibold text-brand-700 hover:bg-brand-50 disabled:opacity-60"
                >
                  {resendState === "loading"
                    ? "재발송 중..."
                    : "이메일이 오지 않았나요? 재발송"}
                </button>
              )}
              {resendState === "limited" && (
                <p className="mt-2 text-xs text-amber-700">
                  15분에 한 번만 재발송할 수 있습니다.
                </p>
              )}
            </>
          )
        ) : (          <p className="mt-2 text-sm text-amber-700">
            응답이 서버에 저장되지 않았습니다
            {saveError ? ` — ${saveError}` : ""}. 화면의 진단 결과는 정상이며,
            관리자에게 문의해 주세요.
          </p>
        )}
      </div>
    </div>
  );
}
