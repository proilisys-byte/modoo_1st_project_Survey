import { config } from "dotenv";
import { resolve } from "path";
import { sendCtaAdminNotification } from "../lib/cta-notify-email";

config({ path: resolve(process.cwd(), ".env.local") });

async function run() {
  if (!process.env.CTA_NOTIFY_EMAIL?.trim()) {
    console.error("오류: .env.local에 CTA_NOTIFY_EMAIL=proili.sys@gmail.com 을 추가하세요.");
    process.exit(1);
  }

  const ok = await sendCtaAdminNotification({
    submissionUid: `test-uid-${Date.now()}`,
    ctaType: "free_diagnosis",
    email: "test@example.com",
    applicantName: "홍길동",
    company: "(주)테스트기업",
    jobTitle: "품질팀장",
    phone: "010-1234-5678",
    score: 82,
    gradeCode: "B",
  });

  if (!ok) {
    console.error("FAIL: CTA 관리자 알림 발송 실패 (RESEND_API_KEY, EMAIL_FROM 확인)");
    process.exit(1);
  }
  console.log(`OK: CTA admin notify sent → ${process.env.CTA_NOTIFY_EMAIL}`);
}

run();
