/**
 * Production smoke: send-report API + 설문 제출 E2E
 * 실행: npx tsx scripts/test-live-production.ts
 */
import { chromium } from "playwright";
import { createPainDisplayOrder } from "../lib/display-order";
import { diagnose } from "../lib/scoring";
import { SCORING_CONFIG_VERSION, SURVEY_VERSION } from "../lib/survey-meta";
import { STORAGE_KEY } from "../lib/survey-storage";

const BASE_URL = process.env.SURVEY_BASE_URL ?? "https://survey.proali.kr";
const TEST_EMAIL = process.env.TEST_EMAIL ?? "delivered@resend.dev";

function matrixFilled(rows: string[], value = 3): Record<string, number> {
  return Object.fromEntries(rows.map((id) => [id, value]));
}

function completeSurveyAnswers(): Record<string, unknown> {
  return {
    A1: "0",
    A2: "a2_v2_3",
    A3: ["1"],
    A4: "2",
    A5: "1",
    A6: "3",
    B1: "2",
    B2: "3",
    B3: "2",
    B3A: "2",
    q10_basis: "q10_basis_qty",
    B4: "b4_v2_lte1w",
    B6: "1",
    B7: "b7_v2_lt3",
    P14: { freq: 2, sev: 2 },
    P15: { freq: 2, sev: 2 },
    P16: { freq: 2, sev: 2 },
    P17: { freq: 2, sev: 2 },
    P18: { freq: 2, sev: 2 },
    C_ATT: { freq: 2 },
    Q20: { first: "sys_capa", second: "sys_delivery" },
    "Q20-1": "q20_1_defect",
    "Q20-2": "pref_qms",
    D1: "2",
    D3: ["1", "3"],
    D4: "d4_no",
    E25: {
      quality: "e25_unknown",
      production: "e25_unknown",
      delivery: "e25_unknown",
    },
    E26: "e26_none",
    F27: matrixFilled(["a", "b", "c"]),
    F28: ["f28_roi", "f28_staff", "f28_data"],
    "F28-1_f28_roi": "f28_1_roi_effect",
    F29: "4",
    F30: { a: 1, b: 2, c: 3, d: 4 },
    F31: "2",
    F32: "4",
    F34: "2",
  };
}

async function testSendReportApi(): Promise<boolean> {
  const result = diagnose(completeSurveyAnswers());
  const res = await fetch(`${BASE_URL}/api/send-report`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      to: TEST_EMAIL,
      company: "(주)프로알리 E2E 테스트",
      result,
    }),
  });
  const body = (await res.json()) as { sent?: boolean; error?: string };
  if (!res.ok || !body.sent) {
    console.error(`FAIL send-report HTTP ${res.status}: ${JSON.stringify(body)}`);
    return false;
  }
  console.log(`OK: send-report → sent=true (${TEST_EMAIL})`);
  return true;
}

async function testSurveySubmitE2e(): Promise<{ saved: boolean; emailOk: boolean }> {
  const displayOrder = createPainDisplayOrder();
  const savedState = {
    survey_version: SURVEY_VERSION,
    scoring_config_version: SCORING_CONFIG_VERSION,
    step: 7,
    answers: completeSurveyAnswers(),
    startedAt: Date.now() - 120_000,
    contact: {
      email: "",
      company: "",
      jobTitle: "",
      phone: "",
      consentRequired: false,
      marketingOptIn: false,
    },
    displayOrder,
  };

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto(BASE_URL, { waitUntil: "networkidle" });
  await page.evaluate(
    ([key, state]) => localStorage.setItem(key, JSON.stringify(state)),
    [STORAGE_KEY, savedState] as const
  );
  await page.reload({ waitUntil: "networkidle" });

  await page
    .getByRole("heading", { name: "끝까지 응답해 주셔서 감사합니다." })
    .waitFor({ timeout: 15_000 });

  await page.locator("#contact-email").fill(TEST_EMAIL);
  await page.locator("#contact-company").fill("(주)프로알리 E2E 테스트");
  await page.locator("#contact-job-title").fill("품질팀장");

  const boxes = page.locator('input[type="checkbox"]');
  for (let i = 0; i < (await boxes.count()); i++) {
    const box = boxes.nth(i);
    if (!(await box.isChecked())) await box.check();
  }

  await page.getByRole("button", { name: "진단 결과 확인하기" }).click();
  await page.getByText("ISO 실행력 점수").waitFor({ timeout: 30_000 });

  const pageText = await page.locator("body").innerText();
  await browser.close();

  const saved = !pageText.includes("응답이 서버에 저장되지 않았습니다");
  const emailOk =
    pageText.includes("발송되었습니다") ||
    pageText.includes("리포트 발송이 지연");

  if (!saved) {
    const errMatch = pageText.match(/저장되지 않았습니다[^\n]*/);
    console.error(`FAIL save: ${errMatch?.[0] ?? "unknown"}`);
  } else {
    console.log("OK: Supabase save succeeded");
  }

  if (!emailOk) console.error("FAIL: result page missing email status");
  else console.log(`OK: email status on result page (${pageText.includes("발송되었습니다") ? "sent" : "delayed"})`);

  return { saved, emailOk };
}

async function main() {
  console.log(`Target: ${BASE_URL}`);
  const emailApi = await testSendReportApi();
  const e2e = await testSurveySubmitE2e();

  if (!emailApi) {
    console.log("\n→ Vercel Production에 RESEND_API_KEY, EMAIL_FROM 등록 후 Redeploy 필요");
  }
  if (!e2e.saved || !e2e.emailOk) process.exit(1);
  if (!emailApi) process.exit(1);
  console.log("\nALL PASS");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
