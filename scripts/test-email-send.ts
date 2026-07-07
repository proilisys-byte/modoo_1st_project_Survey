import { loadEnvConfig } from "@next/env";
import { diagnose } from "../lib/scoring";
import { buildReportEmailHtml } from "../lib/report-email";

loadEnvConfig(process.cwd());

function matrixFilled(rows: string[], value = 3): Record<string, number> {
  return Object.fromEntries(rows.map((id) => [id, value]));
}

/** v03 최소 필수 답변 (채점·이메일 HTML 생성용) */
function getMockAnswers() {
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
    P15: { freq: 3, sev: 4 },
    P16: { freq: 4, sev: 3 },
    P17: { freq: 2, sev: 2 },
    P18: { freq: 2, sev: 2 },
    C_ATT: { freq: 2 },
    Q20: { first: "sys_capa", second: "sys_delivery" },
    "Q20-1": "q20_1_defect",
    "Q20-2": "pref_saas",
    D1: "2",
    D3: ["1", "3"],
    D4: "d4_no",
    E25: {
      quality: "e25_excel",
      production: "e25_mes",
      delivery: "e25_erp",
    },
    E26: "e26_onprem",
    F27: matrixFilled(["a", "b", "c"]),
    F28: ["f28_roi", "f28_staff", "f28_data"],
    "F28-1_f28_roi": "f28_1_roi_effect",
    F29: "2",
    "F29-1": ["f29_1_roi"],
    "F29-2": "f29_2_exec",
    F30: { a: 1, b: 2, c: 3, d: 4 },
    F31: "2",
    F32: "2",
    "F32-1": ["f32_1_capa", "f32_1_audit"],
    F34: "2",
  };
}

async function run() {
  const targetEmail = process.argv[2]?.trim() ?? "delivered@resend.dev";
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;

  if (!apiKey || !from) {
    console.error("오류: .env.local에 RESEND_API_KEY 또는 EMAIL_FROM이 설정되어 있지 않습니다.");
    process.exit(1);
  }

  console.log(`이메일 발송지: ${from}`);
  console.log(`수신 이메일: ${targetEmail}`);

  const diagnosisResult = diagnose(getMockAnswers());
  const html = buildReportEmailHtml({
    company: "(주)프로알리스마트 테스트기업",
    result: diagnosisResult,
  });
  const subject = `[PRO ALI SMART 테스트] ISO 실행력 진단 리포트 — ${diagnosisResult.total}점 (${diagnosisResult.gradeName})`;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from, to: [targetEmail], subject, html }),
  });

  const data = await res.text();
  if (!res.ok) {
    console.error(`FAIL HTTP ${res.status}: ${data}`);
    process.exit(1);
  }
  console.log(`OK: email sent (${data})`);
}

run();
