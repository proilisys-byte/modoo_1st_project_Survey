import { config } from "dotenv";
import { resolve } from "path";
import { CTA_ITEMS } from "../lib/cta-items";
import { sendCtaAdminNotification } from "../lib/cta-notify-email";
import type { CtaType } from "../lib/supabase";

config({ path: resolve(process.cwd(), ".env.local") });

const TYPES: CtaType[] = ["free_diagnosis", "consulting", "poc"];

async function run() {
  const to = process.env.CTA_NOTIFY_EMAIL?.trim();
  if (!to) {
    console.error("오류: .env.local에 CTA_NOTIFY_EMAIL=proili.sys@gmail.com 을 추가하세요.");
    process.exit(1);
  }

  for (const ctaType of TYPES) {
    const title = CTA_ITEMS.find((c) => c.type === ctaType)?.title ?? ctaType;
    const ok = await sendCtaAdminNotification({
      submissionUid: `test-uid-${ctaType}-${Date.now()}`,
      ctaType,
      email: "test@example.com",
      applicantName: "홍길동",
      company: "(주)테스트기업",
      jobTitle: "품질팀장",
      phone: "010-1234-5678",
      score: 82,
      gradeCode: "B",
    });
    if (!ok) {
      console.error(`FAIL: ${title}`);
      process.exit(1);
    }
    console.log(`OK: ${title} → ${to}`);
    await new Promise((r) => setTimeout(r, 800));
  }
}

run();
