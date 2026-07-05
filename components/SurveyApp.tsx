"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { FREQ_LABELS, SECTIONS, SEV_LABELS, type Question } from "@/lib/questions";
import {
  createPainDisplayOrder,
  ensureC9OptionOrder,
  type CDisplayOrder,
} from "@/lib/display-order";
import {
  getOrderedSectionCQuestions,
  getShuffledMultiOptions,
  getVisibleQuestions,
  isAnswered,
  isPhoneRequired,
  findFirstUnansweredRequired,
} from "@/lib/question-utils";
import { isPsmInconsistent } from "@/lib/psm";
import { attentionPassed, diagnose, type DiagnosisResult } from "@/lib/scoring";
import { SCORING_CONFIG_VERSION, SURVEY_VERSION } from "@/lib/survey-meta";
import { buildResultSnapshot } from "@/lib/result-snapshot";
import { submitCtaRequest, submitResponse, type CtaType } from "@/lib/supabase";
import { sendReportEmail } from "@/lib/send-report";
import { resendReportEmail } from "@/lib/resend-report";
import QuestionBlock from "./QuestionBlock";
import ResultView from "./ResultView";
import { ProgressBar, WaferMark } from "./ui";

const STORAGE_KEY = "proali_survey_v2";

// step: 0 = 인트로, 1~5 = 섹션 A~E, 6 = 연락처, 7 = 결과
const CONTACT_STEP = SECTIONS.length + 1;
const RESULT_STEP = SECTIONS.length + 2;

type SavedState = {
  step: number;
  answers: Record<string, unknown>;
  startedAt: number | null;
  contact: Contact;
  displayOrder: CDisplayOrder | null;
};

function resolveSectionQuestions(
  sectionId: string,
  questions: Question[],
  answers: Record<string, unknown>,
  displayOrder: CDisplayOrder | null
): Question[] {
  let qs = questions;
  if (sectionId === "C" && displayOrder) {
    qs = getOrderedSectionCQuestions(questions, displayOrder);
  }
  return getVisibleQuestions(qs, answers);
}

function countQuestionsBefore(
  stepIndex: number,
  answers: Record<string, unknown>,
  displayOrder: CDisplayOrder | null
): number {
  let n = 0;
  for (let i = 0; i < stepIndex; i++) {
    const s = SECTIONS[i];
    n += resolveSectionQuestions(s.id, s.questions, answers, displayOrder).length;
  }
  return n;
}

type Contact = {
  email: string;
  company: string;
  jobTitle: string;
  phone: string;
  consentRequired: boolean;
  marketingOptIn: boolean;
};

const EMPTY_CONTACT: Contact = {
  email: "",
  company: "",
  jobTitle: "",
  phone: "",
  consentRequired: false,
  marketingOptIn: false,
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
  const [emailSent, setEmailSent] = useState(false);
  const [resumed, setResumed] = useState(false);
  const [submissionUid, setSubmissionUid] = useState("");
  const [displayOrder, setDisplayOrder] = useState<CDisplayOrder | null>(null);
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
          const raw = s.contact as Partial<Contact & { reportConsent?: boolean }>;
          setContact({
            ...EMPTY_CONTACT,
            ...raw,
            consentRequired: raw.consentRequired ?? raw.reportConsent ?? false,
            marketingOptIn: raw.marketingOptIn ?? false,
          });
          setDisplayOrder(s.displayOrder ?? null);
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
    const s: SavedState = { step, answers, startedAt, contact, displayOrder };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
    } catch {
      // 저장 불가(시크릿 모드 등)여도 설문 진행은 계속
    }
  }, [step, answers, startedAt, contact, displayOrder]);

  // T-12: C9 보기 순서 확정 시 state·localStorage 동기화
  useEffect(() => {
    if (!displayOrder) return;
    const next = ensureC9OptionOrder(displayOrder);
    if (next.C9_options && !displayOrder.C9_options) {
      setDisplayOrder(next);
    }
  }, [displayOrder]);

  const onAnswer = useCallback((id: string, value: unknown) => {
    setAnswers((prev) => {
      const next = { ...prev, [id]: value };
      if (id === "D4_gate" && value === "no") {
        delete next["D4_pain"];
      }
      if (id === "B3A" && value === "6") {
        delete next["q10_basis"];
      }
      return next;
    });
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
    setDisplayOrder(createPainDisplayOrder());
    goto(1);
  };

  const nextSection = () => {
    const section = SECTIONS[step - 1];
    const visibleQs = resolveSectionQuestions(
      section.id,
      section.questions,
      answers,
      displayOrder
    );
    const firstUnanswered = visibleQs.find(
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

  const phoneRequired = isPhoneRequired(answers);

  const contactValid =
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.email.trim()) &&
    contact.consentRequired &&
    contact.jobTitle.trim().length >= 1 &&
    (!phoneRequired || contact.phone.trim().length >= 9);

  const submit = async () => {
    if (!contactValid) {
      setShowError(true);
      return;
    }
    const missingId = findFirstUnansweredRequired(answers, displayOrder);
    if (missingId) {
      setShowError(true);
      setSubmitting(false);
      document
        .getElementById(`q-${missingId}`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    setSubmitting(true);
    const diagnosis = diagnose(answers);
    const resultSnapshot = buildResultSnapshot(diagnosis, SCORING_CONFIG_VERSION);
    const uid =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `uid-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setSubmissionUid(uid);
    const duration = startedAt
      ? Math.round((Date.now() - startedAt) / 1000)
      : 0;
    const submittedAt = new Date().toISOString();
    const startedAtIso = startedAt ? new Date(startedAt).toISOString() : null;
    const phoneTrimmed = contact.phone.trim();

    const emailRes = await sendReportEmail({
      to: contact.email.trim(),
      company: contact.company.trim() || null,
      result: diagnosis,
    });
    setEmailSent(emailRes.sent);

    const res = await submitResponse({
      submission_uid: uid,
      answers,
      email: contact.email.trim(),
      company: contact.company.trim() || null,
      job_title: contact.jobTitle.trim(),
      phone: phoneTrimmed.length >= 9 ? phoneTrimmed : null,
      score: diagnosis.total,
      grade: diagnosis.gradeName,
      grade_code: diagnosis.gradeCode,
      grade_internal: diagnosis.gradeInternalName,
      pain_scores: diagnosis.painScores,
      attention_passed: attentionPassed(answers),
      duration_seconds: duration,
      user_agent: navigator.userAgent,
      survey_version: SURVEY_VERSION,
      started_at: startedAtIso,
      submitted_at: submittedAt,
      consent_required: contact.consentRequired,
      marketing_opt_in: contact.marketingOptIn,
      email_status: emailRes.status,
      psm_inconsistent: isPsmInconsistent(answers),
      scoring_config_version: SCORING_CONFIG_VERSION,
      c_display_order: displayOrder,
      result_snapshot: resultSnapshot,
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
        emailSent={emailSent}
        submissionUid={submissionUid}
        company={contact.company.trim() || null}
        onResendReport={async () =>
          resendReportEmail(submissionUid, {
            to: contact.email.trim(),
            company: contact.company.trim() || null,
            result,
          })
        }
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
            운영해 온 전문가가 설계했습니다. 약 10분 투자로 다음을 확인하실 수
            있습니다.
            {/* TODO: 유효 응답 50건 축적 시 duration_seconds 중앙값으로 문구 재조정 */}
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
              <Link href="/privacy" className="text-brand-600 underline">
                개인정보처리방침
              </Link>
              에 동의합니다
              <span className="block text-xs text-ink-500 mt-0.5">
                이메일, 직책, 연락처(선택*), 회사명(선택), 직무, 산업군 / 진단
                리포트 발송 및 통계 분석 목적 / 3년 보관 후 파기
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
            {resumed ? "이어서 진단하기" : "무료 진단 시작하기 (약 10분)"}
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
    const phoneRequired = isPhoneRequired(answers);
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
                  htmlFor="contact-job-title"
                  className="mb-1.5 block text-sm font-semibold"
                >
                  직책 <span className="text-red-500">*</span>
                </label>
                <input
                  id="contact-job-title"
                  type="text"
                  value={contact.jobTitle}
                  onChange={(e) =>
                    setContact({ ...contact, jobTitle: e.target.value })
                  }
                  placeholder="예: 품질팀장, QA 매니저, 생산부장"
                  className="w-full rounded-xl border-2 border-slate-200 px-4 py-3 text-[15px] focus:border-brand-500 focus:outline-none"
                />
                {showError && contact.jobTitle.trim().length < 1 && (
                  <p className="mt-1.5 text-sm font-medium text-red-600">
                    직책을 입력해 주세요.
                  </p>
                )}
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
                {!phoneRequired && (
                  <p className="mt-1.5 text-xs text-ink-500">
                    전화 상담·현장 진단·PoC를 신청하신 경우에만 필요합니다.
                  </p>
                )}
                {showError && phoneRequired && contact.phone.trim().length < 9 && (
                  <p className="mt-1.5 text-sm font-medium text-red-600">
                    연락처를 입력해 주세요.
                  </p>
                )}
              </div>

              <label className="flex cursor-pointer items-start gap-3 rounded-xl border-2 border-slate-200 p-4 has-[:checked]:border-brand-600 has-[:checked]:bg-brand-50">
                <input
                  type="checkbox"
                  checked={contact.consentRequired}
                  onChange={(e) =>
                    setContact({ ...contact, consentRequired: e.target.checked })
                  }
                  className="mt-0.5 h-4 w-4 accent-brand-600"
                />
                <span className="text-sm text-ink-700">
                  <span className="font-semibold text-red-600">[필수]</span>{" "}
                  진단 리포트 발송을 위한 개인정보 수집·이용에 동의합니다. (
                  <Link href="/privacy" className="text-brand-600 underline">
                    개인정보처리방침
                  </Link>
                  )
                </span>
              </label>
              {showError && !contact.consentRequired && (
                <p className="text-sm font-medium text-red-600">
                  필수 동의 항목에 체크해 주세요.
                </p>
              )}

              <label className="flex cursor-pointer items-start gap-3 rounded-xl border-2 border-slate-200 p-4 has-[:checked]:border-brand-600 has-[:checked]:bg-brand-50">
                <input
                  type="checkbox"
                  checked={contact.marketingOptIn}
                  onChange={(e) =>
                    setContact({ ...contact, marketingOptIn: e.target.checked })
                  }
                  className="mt-0.5 h-4 w-4 accent-brand-600"
                />
                <span className="text-sm text-ink-700">
                  <span className="font-semibold text-ink-500">[선택]</span>{" "}
                  개선 사례·세미나 등 관련 자료 수신에 동의합니다.
                </span>
              </label>
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
  const sectionDisplayOrder =
    section.id === "C" && displayOrder
      ? ensureC9OptionOrder(displayOrder)
      : displayOrder;
  const visibleQuestions = resolveSectionQuestions(
    section.id,
    section.questions,
    answers,
    sectionDisplayOrder
  );
  const percent = (step / (CONTACT_STEP + 1)) * 100;
  let questionNumber = countQuestionsBefore(step - 1, answers, sectionDisplayOrder);
  const psmWarning =
    section.id === "E" && isPsmInconsistent(answers);

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

        {psmWarning && (
          <div className="mb-5 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            금액 순서가 일반적인 패턴과 다릅니다. 다시 한번 확인해 주세요.
          </div>
        )}

        <div className="space-y-4">
          {visibleQuestions.map((q) => {
            questionNumber += 1;
            const shuffledOptions =
              q.id === "C9" && sectionDisplayOrder
                ? getShuffledMultiOptions(q, sectionDisplayOrder.C9_options)
                : undefined;
            return (
              <QuestionBlock
                key={q.id}
                question={q}
                index={questionNumber}
                answers={answers}
                showError={showError}
                onAnswer={onAnswer}
                shuffledOptions={shuffledOptions}
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
