import type { ReportEmailPayload } from "@/lib/report-email";
import { sendReportByUid, type ReportSendResult } from "@/lib/send-report-by-uid";
import { sendReportEmail } from "@/lib/send-report";

const RESEND_KEY = "proali_resend_at_";

export type ResendReportResult = ReportSendResult & {
  rateLimited?: boolean;
};

function mergeFailure(
  a: ResendReportResult,
  b: ResendReportResult
): ResendReportResult {
  return {
    sent: false,
    status: "failed",
    statusCode: a.statusCode ?? b.statusCode,
    error: a.error ?? b.error,
    rateLimited: a.rateLimited || b.rateLimited,
  };
}

/** T-18: 15분당 1회 재발송 (이미 발송 성공한 경우만) */
export async function resendReportEmail(
  submissionUid: string,
  payload?: Pick<ReportEmailPayload, "to" | "company" | "result">,
  options?: { force?: boolean }
): Promise<ResendReportResult> {
  const key = `${RESEND_KEY}${submissionUid}`;

  if (!options?.force) {
    try {
      const last = localStorage.getItem(key);
      if (last && Date.now() - Number(last) < 15 * 60 * 1000) {
        return { sent: false, status: "failed", rateLimited: true };
      }
    } catch {
      // localStorage 불가 시 서버 레이트리밋에 의존
    }
  }

  try {
    const uidRes = await sendReportByUid(submissionUid, payload?.to?.trim());
    if (uidRes.sent) {
      try {
        localStorage.setItem(key, String(Date.now()));
      } catch {
        // 무시
      }
      return uidRes;
    }

    let lastFailure = uidRes;

    if (payload) {
      const directRes = await sendReportEmail({
        to: payload.to,
        company: payload.company,
        result: payload.result,
        submissionUid,
      });
      if (directRes.sent) {
        try {
          localStorage.setItem(key, String(Date.now()));
        } catch {
          // 무시
        }
        return directRes;
      }
      lastFailure = mergeFailure(lastFailure, directRes);

      const res = await fetch("/api/resend-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...payload,
          submission_uid: submissionUid,
          force: options?.force === true,
        }),
      });
      const data = (await res.json()) as { sent?: boolean; error?: string };
      if (res.status === 429) {
        return { sent: false, status: "failed", rateLimited: true };
      }
      if (res.ok && data.sent) {
        try {
          localStorage.setItem(key, String(Date.now()));
        } catch {
          // 무시
        }
        return { sent: true, status: "sent" };
      }
      lastFailure = mergeFailure(lastFailure, {
        sent: false,
        status: "failed",
        statusCode: res.status,
        error: data.error,
      });
    }

    return lastFailure;
  } catch {
    return { sent: false, status: "failed", error: "네트워크 오류" };
  }
}
