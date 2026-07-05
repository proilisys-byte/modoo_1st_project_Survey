"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { FREQ_LABELS, SECTIONS, SEV_LABELS } from "@/lib/questions";
import { attentionPassed, diagnose, type DiagnosisResult } from "@/lib/scoring";
import { submitCtaRequest, submitResponse, type CtaType } from "@/lib/supabase";
import QuestionBlock, { isAnswered } from "./QuestionBlock";
import ResultView from "./ResultView";
import { ProgressBar, WaferMark } from "./ui";

const STORAGE_KEY = "proali_survey_v1";

// step: 0 = 인트로, 1~5 = 섹션 A~E, 6 = 연락처, 7 = 결과
const CONTACT_STEP = SECTIONS.length + 1;
const RESULT_STEP = SECTIONS.length + 2;

type SavedState = {
  step: number;
  answers: Record<string, unknown>;
  startedAt: number | null;
  contact: Contact;
};

type Contact = {
  email: string;
  company: string;
  phone: string;
  reportConsent: boolean;
};

const EMPTY_CONTACT: Contact = {
  email: "",
  company: "",
  phone: "",
  reportConsent: false,
};

export default function SurveyApp() {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [contact, setContact] = useState<Contact>(EMPTY_CONTACT);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [privacyConsent, setPrivacyConsent] = useState(false);
  const [showError, setShowError] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<DiagnosisResult | null>(null);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | undefined>();
  const [resumed, setResumed] = useState(false);
  const [submissionUid, setSubmissionUid] = useState("");
  const restoredRef = useRef(false);

  // 이어하기: 저장된 진행 상태 복원
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const s = JSON.parse(raw) as SavedState;
        if (s.step > 0 && s.step < RESULT_STEP) {
          setStep(s.step);
          setAnswers(s.answers ?? {});
          setContact(s.contact ?? EMPTY_CONTACT);
          setStartedAt(s.startedAt);
          setPrivacyConsent(true);
          setResumed(true);
        }
      }
    } catch {
      // 저장 데이터가 손상된 경우 처음부터 시작
    }
    restoredRef.current = true;
  }, []);

  // 섹션별 이탈 저장: 상태 변경 시 로컬 저장
  useEffect(() => {
    if (!restoredRef.current || step === 0 || step >= RESULT_STEP) return;
    const s: SavedState = { step, answers, startedAt, contact };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
    } catch {
      // 저장 불가(시크릿 모드 등)여도 설문 진행은 계속
    }
  }, [step, answers, startedAt, contact]);

  const onAnswer = useCallback((id: string, value: unknown) => {
    setAnswers((prev) => ({ ...prev, [id]: value }));
  }, []);

  const goto = (next: number) => {
    setShowError(false);
    setStep(next);
    window.scrollTo({ top: 0 });
  };

  const start = () => {
    if (!privacyConsent) {
      setShowError(true);
      return;
    }
    setStartedAt(Date.now());
    goto(1);
  };

  const nextSection = () => {
    const section = SECTIONS[step - 1];
    const firstUnanswered = section.questions.find(
      (q) => q.required && !isAnswered(q, answers)
    );
    if (firstUnanswered) {
      setShowError(true);
      document
        .getElementById(`q-${firstUnanswered.id}`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    goto(step + 1);
  };

  const phoneRequired =
    answers["E3"] === "1" || answers["E3"] === "2" || answers["E6"] === "1";

  const contactValid =
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.email.trim()) &&
    contact.reportConsent &&
    (!phoneRequired || contact.phone.trim().length >= 9);

  const submit = async () => {
    if (!contactValid) {
      setShowError(true);
      return;
    }
    setSubmitting(true);
    const diagnosis = diagnose(answers);
    const uid =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `uid-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setSubmissionUid(uid);
    const duration = startedAt
      ? Math.round((Date.now() - startedAt) / 1000)
      : 0;
    const res = await submitResponse({
      submission_uid: uid,
      answers,
      email: contact.email.trim(),
      company: contact.company.trim() || null,
      phone: contact.phone.trim() || null,
      score: diagnosis.total,
      grade: diagnosis.gradeName,
      grade_code: diagnosis.gradeCode,
      grade_internal: diagnosis.gradeInternalName,
      pain_scores: diagnosis.painScores,
      attention_passed: attentionPassed(answers),
      duration_seconds: duration,
      user_agent: navigator.userAgent,
    });
    setSaved(res.saved);
    setSaveError(res.error);
    setResult(diagnosis);
    setSubmitting(false);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // 무시
    }
    goto(RESULT_STEP);
  };

  const handleCtaRequest = async (ctaType: CtaType, phone: string) => {
    if (!result) return { saved: false, error: "결과 정보가 없습니다." };
    if (phone.trim() && phone.trim() !== contact.phone) {
      setContact((prev) => ({ ...prev, phone: phone.trim() }));
    }
    return submitCtaRequest({
      submission_uid: submissionUid,
      cta_type: ctaType,
      email: contact.email.trim(),
      company: contact.company.trim() || null,
      phone: phone.trim() || contact.phone.trim() || null,
      score: result.total,
      grade_code: result.gradeCode,
    });
  };

  // ── 결과 ──
  if (step === RESULT_STEP && result) {
    return (
      <ResultView
        result={result}
        email={contact.email}
        initialPhone={contact.phone}
        saved={saved}
        saveError={saveError}
        onCtaRequest={handleCtaRequest}
      />
    );
  }

  // ── 인트로 ──
  if (step === 0) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10">
        <div className="relative overflow-hidden rounded-3xl bg-white p-6 sm:p-10 shadow-sm border border-slate-100">
          <WaferMark
            size={140}
            opacity={0.18}
            className="!absolute -right-10 -top-10 !ring-0"
          />
          <p className="relative text-sm font-semibold text-brand-600">
            제조기업 ISO 9001 실행력 · AI 운영혁신 준비도 무료진단
          </p>
          <h1 className="relative mt-3 text-2xl sm:text-3xl font-bold leading-snug">
            우리 회사의 ISO 9001,
            <br />
            심사용 문서로만 남아 있지 않습니까?
          </h1>
          <p className="mt-4 text-[15px] text-ink-700">
            본 진단은 반도체 제조 현장에서 33년간 생산, 품질, 개선 시스템을
            운영해 온 전문가가 설계했습니다. 8분 투자로 다음을 확인하실 수
            있습니다.
          </p>
          <ul className="mt-5 space-y-3">
            {[
              ["ISO 실행력 점수", "100점 만점, 동종업계 비교"],
              ["품질·납기·고객 Audit 리스크 TOP 3", "우선 관리 대상 진단"],
              ["개선 우선순위", "지금 바로 착수할 수 있는 항목"],
            ].map(([title, desc]) => (
              <li key={title} className="flex gap-3">
                <span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-600 text-[11px] font-bold text-white">
                  ✓
                </span>
                <p className="text-[15px]">
                  <span className="font-semibold">{title}</span>
                  <span className="text-ink-500"> — {desc}</span>
                </p>
              </li>
            ))}
          </ul>
          <p className="mt-5 text-sm text-ink-500">
            응답 내용은 통계 목적으로만 사용되며, 회사명은 익명 처리됩니다. 진단
            리포트는 입력하신 이메일로 즉시 발송됩니다.
          </p>

          <label className="mt-6 flex cursor-pointer items-start gap-3 rounded-xl border-2 border-slate-200 p-4 has-[:checked]:border-brand-600 has-[:checked]:bg-brand-50">
            <input
              type="checkbox"
              checked={privacyConsent}
              onChange={(e) => setPrivacyConsent(e.target.checked)}
              className="mt-1 h-4 w-4 accent-brand-600"
            />
            <span className="text-sm text-ink-700">
              개인정보 수집·이용에 동의합니다
              <span className="block text-xs text-ink-500 mt-0.5">
                이메일·직무·산업군 / 진단 리포트 발송 및 통계 분석 목적 / 1년
                보관 후 파기
              </span>
            </span>
          </label>
          {showError && !privacyConsent && (
            <p className="mt-2 text-sm font-medium text-red-600">
              진행하려면 개인정보 수집·이용에 동의해 주세요.
            </p>
          )}

          {resumed && (
            <p className="mt-4 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-sm text-amber-800">
              이전에 작성하던 응답이 있습니다. 아래 버튼을 누르면 이어서
              진행합니다.
            </p>
          )}

          <button
            type="button"
            onClick={start}
            className="mt-6 w-full rounded-xl bg-brand-600 py-4 text-base font-bold text-white transition-colors hover:bg-brand-700 active:scale-[0.99]"
          >
            {resumed ? "이어서 진단하기" : "무료 진단 시작하기 (약 8분)"}
          </button>
          <p className="mt-3 text-center text-xs text-ink-500">
            총 37문항 · 모바일에서도 편하게 응답하실 수 있습니다
          </p>
        </div>
      </div>
    );
  }

  // ── 연락처 (마무리 화면) ──
  if (step === CONTACT_STEP) {
    const percent = (CONTACT_STEP / (CONTACT_STEP + 1)) * 100;
    return (
      <div className="pb-16">
        <ProgressBar label="마무리 — 진단 리포트 받기" percent={percent} />
        <div className="mx-auto max-w-2xl px-4 py-8">
          <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-100">
            <h2 className="text-xl font-bold">끝까지 응답해 주셔서 감사합니다.</h2>
            <p className="mt-2 text-[15px] text-ink-700">
              소중한 시간을 내어 주신 답변은 더 나은 진단을 위해 소중히
              활용하겠습니다.
            </p>
            <p className="mt-2 text-[15px] text-ink-700">
              귀사의 ISO 실행력 점수와 리스크 TOP 3가 담긴 진단 리포트를
              보내드립니다.
            </p>

            <div className="mt-6 space-y-4">
              <div>
                <label
                  htmlFor="contact-email"
                  className="mb-1.5 block text-sm font-semibold"
                >
                  이메일 <span className="text-red-500">*</span>
                </label>
                <input
                  id="contact-email"
                  type="email"
                  inputMode="email"
                  value={contact.email}
                  onChange={(e) =>
                    setContact({ ...contact, email: e.target.value })
                  }
                  placeholder="report@company.co.kr"
                  className="w-full rounded-xl border-2 border-slate-200 px-4 py-3 text-[15px] focus:border-brand-500 focus:outline-none"
                />
                {showError &&
                  !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.email.trim()) && (
                    <p className="mt-1.5 text-sm font-medium text-red-600">
                      올바른 이메일 주소를 입력해 주세요.
                    </p>
                  )}
              </div>

              <div>
                <label
                  htmlFor="contact-company"
                  className="mb-1.5 block text-sm font-semibold"
                >
                  회사명{" "}
                  <span className="font-normal text-xs text-ink-500">
                    (선택 — 미입력 시 업종 평균과만 비교)
                  </span>
                </label>
                <input
                  id="contact-company"
                  type="text"
                  value={contact.company}
                  onChange={(e) =>
                    setContact({ ...contact, company: e.target.value })
                  }
                  placeholder="회사명"
                  className="w-full rounded-xl border-2 border-slate-200 px-4 py-3 text-[15px] focus:border-brand-500 focus:outline-none"
                />
              </div>

              <div>
                <label
                  htmlFor="contact-phone"
                  className="mb-1.5 block text-sm font-semibold"
                >
                  연락처{" "}
                  {phoneRequired ? (
                    <span className="text-red-500">*</span>
                  ) : (
                    <span className="font-normal text-xs text-ink-500">
                      (선택)
                    </span>
                  )}
                </label>
                <input
                  id="contact-phone"
                  type="tel"
                  inputMode="tel"
                  value={contact.phone}
                  onChange={(e) =>
                    setContact({ ...contact, phone: e.target.value })
                  }
                  placeholder="010-0000-0000"
                  className="w-full rounded-xl border-2 border-slate-200 px-4 py-3 text-[15px] focus:border-brand-500 focus:outline-none"
                />
                {phoneRequired && (
                  <p className="mt-1.5 text-xs text-ink-500">
                    PoC 검토 또는 전문가 자문을 신청하셔서 연락처가 필요합니다.
                  </p>
                )}
                {showError &&
                  phoneRequired &&
                  contact.phone.trim().length < 9 && (
                    <p className="mt-1.5 text-sm font-medium text-red-600">
                      연락처를 입력해 주세요.
                    </p>
                  )}
              </div>

              <label className="flex cursor-pointer items-start gap-3 rounded-xl border-2 border-slate-200 p-4 has-[:checked]:border-brand-600 has-[:checked]:bg-brand-50">
                <input
                  type="checkbox"
                  checked={contact.reportConsent}
                  onChange={(e) =>
                    setContact({ ...contact, reportConsent: e.target.checked })
                  }
                  className="mt-0.5 h-4 w-4 accent-brand-600"
                />
                <span className="text-sm text-ink-700">
                  진단 리포트 및 관련 자료 수신에 동의합니다.
                </span>
              </label>
              {showError && !contact.reportConsent && (
                <p className="text-sm font-medium text-red-600">
                  리포트 수신에 동의해 주세요.
                </p>
              )}
            </div>

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => goto(step - 1)}
                className="rounded-xl border-2 border-slate-200 px-5 py-3.5 text-sm font-semibold text-ink-700 hover:border-brand-300"
              >
                이전
              </button>
              <button
                type="button"
                onClick={submit}
                disabled={submitting}
                className="flex-1 rounded-xl bg-brand-600 py-3.5 text-base font-bold text-white transition-colors hover:bg-brand-700 disabled:opacity-60"
              >
                {submitting ? "제출 중..." : "진단 결과 확인하기"}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── 섹션 A~E ──
  const section = SECTIONS[step - 1];
  const percent = (step / (CONTACT_STEP + 1)) * 100;
  let questionNumber = SECTIONS.slice(0, step - 1).reduce(
    (n, s) => n + s.questions.length,
    0
  );

  return (
    <div className="pb-16">
      <ProgressBar
        label={`${section.name} / 5 — ${section.heading}`}
        percent={percent}
      />
      <div className="mx-auto max-w-2xl px-4 py-6">
        {section.intro && (
          <div className="mb-5 rounded-2xl border border-brand-100 bg-brand-50 p-4 text-sm leading-relaxed text-brand-900 whitespace-pre-line">
            {section.intro}
          </div>
        )}

        {section.id === "C" && (
          <div className="mb-5 rounded-2xl bg-white p-5 shadow-sm border border-slate-100">
            <p className="mb-3 text-sm font-bold">척도 기준 안내</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="mb-1.5 text-xs font-semibold text-brand-700">
                  발생 빈도
                </p>
                <ul className="space-y-1 text-xs text-ink-700">
                  {FREQ_LABELS.map((label, i) => (
                    <li key={label} className="flex gap-1.5">
                      <span className="w-3 shrink-0 font-bold text-brand-600 tabular-nums">
                        {i + 1}
                      </span>
                      <span>{label}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="mb-1.5 text-xs font-semibold text-brand-700">
                  업무 영향도
                </p>
                <ul className="space-y-1 text-xs text-ink-700">
                  {SEV_LABELS.map((label, i) => (
                    <li key={label} className="flex gap-1.5">
                      <span className="w-3 shrink-0 font-bold text-brand-600 tabular-nums">
                        {i + 1}
                      </span>
                      <span>{label}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-4">
          {section.questions.map((q) => {
            questionNumber += 1;
            return (
              <QuestionBlock
                key={q.id}
                question={q}
                index={questionNumber}
                answers={answers}
                showError={showError}
                onAnswer={onAnswer}
              />
            );
          })}
        </div>

        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={() => goto(step - 1)}
            className="rounded-xl border-2 border-slate-200 bg-white px-5 py-3.5 text-sm font-semibold text-ink-700 hover:border-brand-300"
          >
            이전
          </button>
          <button
            type="button"
            onClick={nextSection}
            className="flex-1 rounded-xl bg-brand-600 py-3.5 text-base font-bold text-white transition-colors hover:bg-brand-700 active:scale-[0.99]"
          >
            {step === SECTIONS.length ? "마지막 단계로" : "다음 섹션"}
          </button>
        </div>
      </div>
    </div>
  );
}
