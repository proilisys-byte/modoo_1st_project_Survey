import { loadEnvConfig } from "@next/env";
import { diagnose } from "../lib/scoring";
import { buildReportEmailHtml } from "../lib/report-email";

// .env.local 환경 변수 로드
loadEnvConfig(process.cwd());

function matrixFilled(rows: string[], value = 3): Record<string, number> {
  return Object.fromEntries(rows.map((id) => [id, value]));
}

/** 테스트용 가짜 답변 데이터 생성 (37개 필수 답변 완비) */
function getMockAnswers() {
  return {
    A1: "1",
    A2: "a2_v2_3",
    A3: ["1"],
    A4: "2",
    A5: "1",
    A6: "2",
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
    C5: { freq: 5, sev: 5 },
    C6: { freq: 2, sev: 2 },
    C7: { freq: 2, sev: 2 },
    C8: { freq: 2, sev: 2 },
    C9: ["C2", "C3", "C5"],
    D1: "2",
    D2: "2",
    D2A: ["none"],
    D3: ["1", "2"],
    D4_gate: "no",
    E1: matrixFilled(["a", "b", "c", "d", "e", "f"]),
    E2: matrixFilled(["a", "b", "c", "d", "e", "f"]),
    E3_gate: "no",
    E4: "1",
    E5: ["1", "2"],
    E6_gate: "no",
  };
}

async function run() {
  const targetEmail = process.argv[2]?.trim();
  if (!targetEmail) {
    console.error("오류: 수신할 이메일 주소를 입력해 주세요.");
    console.log("예시: npx tsx scripts/test-email-send.ts your-email@example.com");
    process.exit(1);
  }

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;

  if (!apiKey || !from) {
    console.error("오류: .env.local에 RESEND_API_KEY 또는 EMAIL_FROM이 설정되어 있지 않습니다.");
    process.exit(1);
  }

  console.log(`이메일 발송지: ${from}`);
  console.log(`수신 이메일: ${targetEmail}`);
  console.log("-----------------------------------------");
  console.log("1. 가짜 설문 데이터 채점 시작...");
  
  const mockAnswers = getMockAnswers();
  const diagnosisResult = diagnose(mockAnswers);

  console.log(`> 채점 완료! 총점: ${diagnosisResult.total}점 (${diagnosisResult.gradeName})`);
  
  console.log("2. 이메일 HTML 템플릿 생성 중...");
  const html = buildReportEmailHtml({
    company: "(주)프로알리스마트 테스트기업",
    result: diagnosisResult,
  });

  const subject = `[PRO ALI SMART 테스트] ISO 실행력 진단 리포트 — ${diagnosisResult.total}점 (${diagnosisResult.gradeName})`;

  console.log("3. Resend API로 발송 요청 중...");
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [targetEmail],
        subject,
        html,
      }),
    });

    const data = await res.text();
    if (res.ok) {
      console.log("-----------------------------------------");
      console.log("🎉 성공: 이메일 전송에 성공했습니다!");
      console.log(`응답 데이터: ${data}`);
    } else {
      console.error("-----------------------------------------");
      console.error(`❌ 실패: Resend API 서버가 오류를 반환했습니다. (HTTP ${res.status})`);
      console.error(`상세 에러 내용: ${data}`);
    }
  } catch (error) {
    console.error("-----------------------------------------");
    console.error("❌ 에러: API 요청 과정에서 네트워크 오류가 발생했습니다.", error);
  }
}

run();
