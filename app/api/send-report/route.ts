import { buildReportEmailHtml, type ReportEmailPayload } from "@/lib/report-email";
import { getResendConfig } from "@/lib/resend-config";
import type { DiagnosisResult } from "@/lib/scoring";
import { NextResponse } from "next/server";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USER_FACING_ERROR =
  "리포트 발송이 지연되고 있습니다. 응답은 안전하게 저장되었으며, 준비되는 대로 입력하신 이메일로 보내드립니다.";

async function sendViaResend(
  apiKey: string,
  from: string,
  to: string,
  html: string,
  subject: string
): Promise<{ ok: true } | { ok: false; detail: string }> {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from, to: [to], subject, html }),
  });

  if (res.ok) return { ok: true };

  const detail = await res.text().catch(() => `HTTP ${res.status}`);
  return { ok: false, detail };
}

export async function POST(request: Request) {
  const config = getResendConfig();
  if (!config) {
    console.error("send-report: RESEND_API_KEY or EMAIL_FROM not configured");
    return NextResponse.json(
      { sent: false, error: USER_FACING_ERROR },
      { status: 503 }
    );
  }

  let body: ReportEmailPayload;
  try {
    body = (await request.json()) as ReportEmailPayload;
  } catch {
    return NextResponse.json({ sent: false, error: USER_FACING_ERROR }, { status: 400 });
  }

  const to = body.to?.trim() ?? "";
  if (!EMAIL_RE.test(to)) {
    return NextResponse.json({ sent: false, error: USER_FACING_ERROR }, { status: 400 });
  }

  const result = body.result as DiagnosisResult | undefined;
  if (!result || typeof result.total !== "number" || !Array.isArray(result.axes)) {
    return NextResponse.json({ sent: false, error: USER_FACING_ERROR }, { status: 400 });
  }

  const html = buildReportEmailHtml({
    company: body.company ?? null,
    result,
  });
  const subject = `[PRO ALI SMART] ISO 실행력 진단 리포트 — ${result.total}점 (${result.gradeName})`;

  let lastDetail = "";
  for (let attempt = 0; attempt < 2; attempt++) {
    if (attempt > 0) {
      await new Promise((r) => setTimeout(r, 1000));
    }
    const outcome = await sendViaResend(
      config.apiKey,
      config.from,
      to,
      html,
      subject
    );
    if (outcome.ok) {
      return NextResponse.json({ sent: true });
    }
    lastDetail = outcome.detail;
    console.error(`send-report attempt ${attempt + 1} failed:`, outcome.detail);
  }

  console.error("send-report: all attempts failed:", lastDetail);
  return NextResponse.json(
    { sent: false, error: USER_FACING_ERROR },
    { status: 502 }
  );
}
