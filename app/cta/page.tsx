"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { CTA_ITEMS } from "@/lib/cta-items";
import type { CtaType } from "@/lib/supabase";

const VALID_TYPES = new Set(CTA_ITEMS.map((c) => c.type));

function CtaApplyContent() {
  const params = useSearchParams();
  const uid = params.get("uid")?.trim() ?? "";
  const type = params.get("type")?.trim() ?? "";
  const ctaType = VALID_TYPES.has(type as CtaType) ? (type as CtaType) : null;
  const item = ctaType ? CTA_ITEMS.find((c) => c.type === ctaType) : null;

  const [phone, setPhone] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">(
    "idle"
  );
  const [error, setError] = useState<string | undefined>();

  const apply = async () => {
    if (!uid || !ctaType) return;
    setState("loading");
    setError(undefined);
    try {
      const res = await fetch("/api/cta-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          submission_uid: uid,
          cta_type: ctaType,
          phone: phone.trim() || undefined,
        }),
      });
      const data = (await res.json()) as { saved?: boolean; error?: string };
      if (!res.ok || !data.saved) {
        setState("error");
        setError(data.error ?? "신청에 실패했습니다.");
        return;
      }
      setState("done");
    } catch {
      setState("error");
      setError("네트워크 오류가 발생했습니다.");
    }
  };

  if (!uid || !item) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <h1 className="text-xl font-bold text-slate-900">잘못된 링크입니다</h1>
        <p className="mt-3 text-sm text-slate-600">
          이메일의 버튼을 다시 눌러 주시거나, 설문 결과 페이지에서 신청해
          주세요.
        </p>
        <Link
          href="/"
          className="mt-6 inline-block rounded-lg bg-brand-600 px-5 py-3 text-sm font-bold text-white hover:bg-brand-700"
        >
          설문 홈으로
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-10">
      <p className="text-sm font-semibold text-brand-600">PRO ALI SMART</p>
      <h1 className="mt-1 text-2xl font-bold text-slate-900">{item.title}</h1>
      <p className="mt-3 text-sm leading-relaxed text-slate-600">{item.desc}</p>

      {state === "done" ? (
        <div className="mt-8 rounded-2xl border-2 border-emerald-200 bg-emerald-50 p-6 text-center">
          <p className="font-semibold text-emerald-800">✓ 신청이 접수되었습니다</p>
          <p className="mt-2 text-sm text-emerald-700">
            담당자가 순차적으로 연락드리겠습니다.
          </p>
        </div>
      ) : (
        <>
          <div className="mt-6">
            <label
              htmlFor="cta-phone"
              className="mb-1.5 block text-sm font-semibold text-slate-800"
            >
              연락받으실 번호{" "}
              <span className="font-normal text-slate-500">(선택·변경 가능)</span>
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
          <button
            type="button"
            onClick={apply}
            disabled={state === "loading"}
            className={`mt-4 w-full rounded-xl py-3.5 text-sm font-bold text-white transition-colors disabled:opacity-70 ${
              item.primary
                ? "bg-brand-600 hover:bg-brand-700"
                : "bg-slate-800 hover:bg-slate-900"
            }`}
          >
            {state === "loading" ? "신청 중..." : `${item.title}하기`}
          </button>
          {state === "error" && error && (
            <p className="mt-3 text-sm text-amber-700">{error}</p>
          )}
        </>
      )}

      <p className="mt-8 text-center text-xs text-slate-500">
        <Link href="/" className="text-brand-600 hover:underline">
          설문 홈으로 돌아가기
        </Link>
      </p>
    </div>
  );
}

export default function CtaPage() {
  return (
    <main className="min-h-screen bg-slate-50">
      <Suspense
        fallback={
          <div className="py-16 text-center text-sm text-slate-500">
            불러오는 중...
          </div>
        }
      >
        <CtaApplyContent />
      </Suspense>
    </main>
  );
}
