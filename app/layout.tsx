import type { Metadata, Viewport } from "next";
import SiteFooter from "@/components/SiteFooter";
import "./globals.css";

export const metadata: Metadata = {
  title: "제조기업 ISO 9001 실행력 · AI 운영혁신 준비도 무료진단",
  description:
    "10분 투자로 우리 회사의 ISO 실행력 점수, 품질·납기·고객 Audit 리스크 TOP 3, 개선 우선순위를 확인하세요. 33년 경력 반도체 품질 전문가가 설계한 무료 진단입니다.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />
      </head>
      <body className="min-h-screen antialiased flex flex-col">
        <div className="flex-1">{children}</div>
        <SiteFooter />
      </body>
    </html>
  );
}
