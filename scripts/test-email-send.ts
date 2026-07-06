import { loadEnvConfig } from "@next/env";
import { diagnose } from "../lib/scoring";
import { buildReportEmailHtml } from "../lib/report-email";

loadEnvConfig(process.cwd());

function matrixFilled(rows: string[], value = 3): Record<string, number> {
  return Object.fromEntries(rows.map((id) => [id, value]));
}

/** v3 최소 필수 답변 (채점·이메일 HTML 생성용) */
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
    B5: "2",
    B6: "1",
    B7: "b7_v2_lt3",
    C1: { freq: 2, sev: 2 },
    C2: { freq: 3, sev: 4 },
    C3: { freq: 4, sev: 3 },
    C4: { freq: 2, sev: 2 },
    C_ATT: { freq: 2 },
    C5: { freq: 3, sev: 3 },
    C6: { freq: 2, sev: 2 },
    C7: { freq: 2, sev: 2 },
    C8: { freq: 2, sev: 2 },
    C9: ["C2", "C3", "C5"],
    "C9-1_C2": "c9_1_handover",
    "C9-2": "c9_2_recur",
    F4: { f4_a: 1, f4_b: 2, f4_c: 3, f4_d: 4 },
    D1: "2",
    D2: "3",
    D2A: ["none"],
    D3: ["1", "3"],
    D4_gate: "no",
    "F0-Q1": "f0_q_excel",
    "F0-Q2": "f0_p_excel",
    "F0-Q3": "f0_d_excel",
    "F0-3": "pref_saas",
    "F0-3-1": ["f0_3_1_ux"],
    "F0-3-2": "pref_qms",
    "F0-4": "data_onprem",
    "F5-1": ["f5_1_roi", "f5_1_staff", "f5_1_ref"],
    F6: "mvp_capa",
    "F6-1": "f6_1_poc",
    "F6-2": ["f6_2_capa", "f6_2_audit"],
    "F5-2": "f5_2_exec",
    E1: matrixFilled(["a", "b", "c", "d", "e", "f"]),
    E2: "5",
    E3: "2",
    "E3-1": ["e3_1_capa", "e3_1_roi"],
    E4: { a: 1, b: 2, c: 3, d: 4 },
    E5: "2",
    E6: "2",
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
