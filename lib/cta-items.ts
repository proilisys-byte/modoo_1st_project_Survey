import type { CtaType } from "./supabase";

export type CtaItem = {
  type: CtaType;
  title: string;
  desc: string;
  badge?: string;
  primary?: boolean;
};

export const CTA_ITEMS: CtaItem[] = [
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

export function getSiteUrl(): string {
  const url = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (url) return url.replace(/\/$/, "");
  return "https://survey.proali.kr";
}

export function buildCtaApplyUrl(submissionUid: string, ctaType: CtaType): string {
  const base = getSiteUrl();
  const params = new URLSearchParams({
    uid: submissionUid,
    type: ctaType,
  });
  return `${base}/cta?${params.toString()}`;
}
