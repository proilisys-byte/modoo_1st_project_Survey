import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "개인정보처리방침 | PRO ALI SMART 무료진단",
  description: "PRO ALI SMART ISO 실행력 무료진단 서비스 개인정보처리방침",
};

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <Link
        href="/"
        className="text-sm font-semibold text-brand-600 hover:text-brand-700"
      >
        ← 진단 홈으로
      </Link>

      <article className="mt-6 rounded-2xl bg-white p-6 sm:p-10 shadow-sm border border-slate-100">
        <h1 className="text-2xl font-bold">개인정보처리방침</h1>
        <p className="mt-2 text-sm text-ink-500">시행일: 2026년 7월 5일</p>

        <div className="mt-8 space-y-8 text-[15px] leading-relaxed text-ink-700">
          <section>
            <h2 className="mb-2 text-lg font-bold text-ink-900">
              1. 개인정보의 처리 목적
            </h2>
            <p>
              PRO ALI SMART(이하 &ldquo;회사&rdquo;)는 「개인정보 보호법」에 따라
              아래 목적을 위해 최소한의 개인정보를 처리합니다.
            </p>
            <ul className="mt-3 list-disc space-y-1 pl-5">
              <li>ISO 실행력 무료진단 설문 응답 수집 및 결과 산출</li>
              <li>진단 리포트 이메일 발송</li>
              <li>무료 현장 진단·전문가 상담·PoC 등 후속 지원 신청 접수 및 연락</li>
              <li>응답 통계 분석 및 서비스 품질 개선 (익명·집계 형태)</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-bold text-ink-900">
              2. 처리하는 개인정보 항목
            </h2>
            <ul className="list-disc space-y-1 pl-5">
              <li>
                <strong>필수:</strong> 이메일 주소, 설문 응답 내용(직무·산업군·품질
                운영 관련 응답 포함)
              </li>
              <li>
                <strong>선택:</strong> 회사명, 연락처(전화번호)
              </li>
              <li>
                <strong>자동 수집:</strong> 응답 소요 시간, 브라우저 정보(user agent),
                제출 시각
              </li>
            </ul>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-bold text-ink-900">
              3. 보유 및 이용 기간
            </h2>
            <p>
              수집일로부터 <strong>3년</strong>간 보관 후 지체 없이 파기합니다.
              다만, 관련 법령에 따라 보존이 필요한 경우 해당 기간 동안 보관할 수
              있습니다.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-bold text-ink-900">
              4. 개인정보의 제3자 제공
            </h2>
            <p>
              회사는 원칙적으로 이용자의 개인정보를 제3자에게 제공하지 않습니다.
              다만, 이용자가 후속 지원(상담·현장 진단 등)을 신청한 경우, 해당
              업무 수행을 위해 담당자가 연락드릴 수 있습니다.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-bold text-ink-900">
              5. 개인정보 처리 위탁
            </h2>
            <p>서비스 운영을 위해 아래 업체에 처리를 위탁합니다.</p>
            <div className="mt-3 overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-2 text-left font-semibold">수탁업체</th>
                    <th className="px-4 py-2 text-left font-semibold">위탁 업무</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr>
                    <td className="px-4 py-2">Supabase Inc.</td>
                    <td className="px-4 py-2">설문 응답 데이터 저장 (DB)</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2">Vercel Inc.</td>
                    <td className="px-4 py-2">웹 서비스 호스팅</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2">Resend Inc.</td>
                    <td className="px-4 py-2">진단 리포트 이메일 발송</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-bold text-ink-900">
              6. 정보주체의 권리
            </h2>
            <p>
              이용자는 언제든지 개인정보 열람·정정·삭제·처리 정지를 요청할 수
              있습니다. 아래 문의처로 연락해 주시면 지체 없이 조치하겠습니다.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-bold text-ink-900">
              7. 개인정보의 안전성 확보 조치
            </h2>
            <ul className="list-disc space-y-1 pl-5">
              <li>데이터베이스 접근 통제(행 수준 보안, RLS 정책 적용)</li>
              <li>전송 구간 암호화(HTTPS)</li>
              <li>접근 권한 최소화 및 API 키 등 비밀정보 환경변수 분리</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-bold text-ink-900">
              8. 개인정보 보호책임자 및 문의
            </h2>
            <ul className="list-none space-y-1">
              <li>
                <strong>담당:</strong> PRO ALI SMART 개인정보보호 담당
              </li>
              <li>
                <strong>이메일:</strong>{" "}
                <a
                  href="mailto:privacy@proali.kr"
                  className="text-brand-600 underline"
                >
                  privacy@proali.kr
                </a>
              </li>
              <li>
                <strong>웹사이트:</strong>{" "}
                <a
                  href="https://survey.proali.kr/"
                  className="text-brand-600 underline"
                >
                  https://survey.proali.kr/
                </a>
              </li>
            </ul>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-bold text-ink-900">
              9. 방침의 변경
            </h2>
            <p>
              본 방침이 변경되는 경우 웹사이트를 통해 공지합니다. 변경된 방침은
              게시일로부터 효력이 발생합니다.
            </p>
          </section>
        </div>
      </article>
    </div>
  );
}
