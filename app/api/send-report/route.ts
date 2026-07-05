import { buildReportEmailHtml, type ReportEmailPayload } from "@/lib/report-email";
import type { DiagnosisResult } from "@/lib/scoring";
import { NextResponse } from "next/server";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;

  if (!apiKey || !from) {
    return NextResponse.json(
      { sent: false, error: "이메일 발송 설정 미완료 (RESEND_API_KEY, EMAIL_FROM)" },
      { status: 503 }
    );
  }

  let body: ReportEmailPayload;
  try {
    body = (await request.json()) as ReportEmailPayload;
  } catch {
    return NextResponse.json({ sent: false, error: "잘못된 요청입니다." }, { status: 400 });
  }

  const to = body.to?.trim() ?? "";
  if (!EMAIL_RE.test(to)) {
    return NextResponse.json({ sent: false, error: "올바른 이메일 주소가 아닙니다." }, { status: 400 });
  }

  const result = body.result as DiagnosisResult | undefined;
  if (!result || typeof result.total !== "number" || !Array.isArray(result.axes)) {
    return NextResponse.json({ sent: false, error: "진단 결과 데이터가 없습니다." }, { status: 400 });
  }

  const html = buildReportEmailHtml({
    company: body.company ?? null,
    result,
  });

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject: `[PRO ALI SMART] ISO 실행력 진단 리포트 — ${result.total}점 (${result.gradeName})`,
      html,
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    console.error("Resend error:", res.status, detail);
    return NextResponse.json(
      { sent: false, error: "이메일 발송에 실패했습니다." },
      { status: 502 }
    );
  }

  return NextResponse.json({ sent: true });
}
