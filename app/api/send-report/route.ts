import type { ReportEmailPayload } from "@/lib/report-email";
import {
  deliverReportEmail,
  REPORT_EMAIL_USER_ERROR,
} from "@/lib/send-report-core";
import type { DiagnosisResult } from "@/lib/scoring";
import { NextResponse } from "next/server";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  let body: ReportEmailPayload;
  try {
    body = (await request.json()) as ReportEmailPayload;
  } catch {
    return NextResponse.json(
      { sent: false, error: REPORT_EMAIL_USER_ERROR },
      { status: 400 }
    );
  }

  const to = body.to?.trim() ?? "";
  if (!EMAIL_RE.test(to)) {
    return NextResponse.json(
      { sent: false, error: REPORT_EMAIL_USER_ERROR },
      { status: 400 }
    );
  }

  const result = body.result as DiagnosisResult | undefined;
  if (!result || typeof result.total !== "number" || !Array.isArray(result.axes)) {
    return NextResponse.json(
      { sent: false, error: REPORT_EMAIL_USER_ERROR },
      { status: 400 }
    );
  }

  const outcome = await deliverReportEmail({
    to,
    company: body.company ?? null,
    result,
    submissionUid: body.submissionUid ?? null,
  });

  if (!outcome.sent) {
    return NextResponse.json(
      { sent: false, error: REPORT_EMAIL_USER_ERROR },
      { status: outcome.detail === "resend_not_configured" ? 503 : 502 }
    );
  }

  return NextResponse.json({ sent: true });
}
