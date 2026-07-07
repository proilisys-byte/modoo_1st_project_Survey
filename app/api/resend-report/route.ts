import { buildReportEmailHtml, type ReportEmailPayload } from "@/lib/report-email";
import { getResendConfig } from "@/lib/resend-config";
import type { DiagnosisResult } from "@/lib/scoring";
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USER_MSG =
  "리포트 발송이 지연되고 있습니다. 응답은 안전하게 저장되었으며, 준비되는 대로 입력하신 이메일로 보내드립니다.";
const RATE_LIMIT_MS = 15 * 60 * 1000;

const resendAt = new Map<string, number>();

async function sendViaResend(
  apiKey: string,
  from: string,
  to: string,
  html: string,
  subject: string
): Promise<boolean> {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from, to: [to], subject, html }),
  });
  if (!res.ok) {
    console.error("resend-report:", await res.text().catch(() => res.status));
  }
  return res.ok;
}

export async function POST(request: Request) {
  const config = getResendConfig();
  if (!config) {
    return NextResponse.json({ sent: false, error: USER_MSG }, { status: 503 });
  }
  const { apiKey, from } = config;

  let body: ReportEmailPayload & { submission_uid?: string };
  try {
    body = (await request.json()) as ReportEmailPayload & {
      submission_uid?: string;
    };
  } catch {
    return NextResponse.json({ sent: false, error: USER_MSG }, { status: 400 });
  }

  const uid = body.submission_uid?.trim() ?? "";
  if (uid) {
    const last = resendAt.get(uid) ?? 0;
    if (Date.now() - last < RATE_LIMIT_MS) {
      return NextResponse.json(
        { sent: false, error: "15분에 한 번만 재발송할 수 있습니다." },
        { status: 429 }
      );
    }
  }

  const to = body.to?.trim() ?? "";
  if (!EMAIL_RE.test(to)) {
    return NextResponse.json({ sent: false, error: USER_MSG }, { status: 400 });
  }

  const result = body.result as DiagnosisResult | undefined;
  if (!result || typeof result.total !== "number") {
    return NextResponse.json({ sent: false, error: USER_MSG }, { status: 400 });
  }

  const html = buildReportEmailHtml({
    company: body.company ?? null,
    result,
  });
  const subject = `[PRO ALI SMART] ISO 실행력 진단 리포트 — ${result.total}점 (${result.gradeName})`;

  let sent = await sendViaResend(apiKey, from, to, html, subject);
  if (!sent) {
    await new Promise((r) => setTimeout(r, 1000));
    sent = await sendViaResend(apiKey, from, to, html, subject);
  }

  if (!sent) {
    return NextResponse.json({ sent: false, error: USER_MSG }, { status: 502 });
  }

  if (uid) resendAt.set(uid, Date.now());

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  if (uid && serviceKey && supabaseUrl) {
    const admin = createClient(supabaseUrl, serviceKey);
    const { error } = await admin
      .from("survey_responses")
      .update({ email_status: "sent" })
      .eq("submission_uid", uid);
    if (error) console.error("resend-report: email_status update failed", error);
  }

  return NextResponse.json({ sent: true });
}
