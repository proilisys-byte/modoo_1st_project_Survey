import type { DiagnosisResult } from "@/lib/scoring";

export type ReportEmailPayload = {
  to: string;
  company: string | null;
  result: DiagnosisResult;
};

/** 진단 결과 HTML 이메일 본문 생성 */
export function buildReportEmailHtml({
  company,
  result,
}: Omit<ReportEmailPayload, "to">): string {
  const companyLine = company
    ? `<p style="margin:0 0 16px;color:#334155;">${escapeHtml(company)}</p>`
    : "";

  const axesRows = result.axes
    .map((axis) => {
      const pct = Math.round((axis.score / axis.max) * 100);
      return `<tr>
        <td style="padding:8px 0;color:#334155;">${escapeHtml(axis.name)}</td>
        <td style="padding:8px 0;text-align:right;color:#64748b;">${Math.round(axis.score)} / ${axis.max}</td>
        <td style="padding:8px 0;width:120px;">
          <div style="background:#e2e8f0;border-radius:9999px;height:8px;overflow:hidden;">
            <div style="background:${pct >= 66 ? "#10b981" : pct >= 40 ? "#fbbf24" : "#f87171"};height:8px;width:${pct}%;"></div>
          </div>
        </td>
      </tr>`;
    })
    .join("");

  const riskItems = result.risks
    .map(
      (r, i) => `<li style="margin-bottom:12px;">
        <strong style="color:#0f172a;">${i + 1}. ${escapeHtml(r.short)}</strong>
        <p style="margin:4px 0 0;color:#334155;font-size:14px;line-height:1.5;">${escapeHtml(r.risk)}</p>
      </li>`
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="ko">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:'Malgun Gothic','Apple SD Gothic Neo',sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:24px 16px;">
    <div style="background:#fff;border-radius:16px;padding:32px 24px;border:1px solid #e2e8f0;">
      <p style="margin:0 0 4px;font-size:13px;font-weight:600;color:#2563eb;">PRO ALI SMART 무료진단</p>
      <h1 style="margin:0 0 16px;font-size:22px;color:#0f172a;">ISO 실행력 진단 리포트</h1>
      ${companyLine}
      <div style="background:linear-gradient(135deg,#1d4ed8,#1e3a8a);border-radius:16px;padding:24px;text-align:center;color:#fff;margin-bottom:24px;">
        <p style="margin:0 0 4px;font-size:13px;opacity:0.9;">ISO 실행력 점수 (100점 만점)</p>
        <p style="margin:0;font-size:48px;font-weight:800;">${result.total}</p>
        <p style="margin:8px 0 0;font-size:14px;background:rgba(255,255,255,0.15);display:inline-block;padding:6px 16px;border-radius:9999px;">${escapeHtml(result.gradeName)}</p>
      </div>
      <h2 style="margin:0 0 12px;font-size:16px;color:#0f172a;">영역별 현황</h2>
      <table style="width:100%;border-collapse:collapse;margin-bottom:24px;font-size:14px;">${axesRows}</table>
      <h2 style="margin:0 0 12px;font-size:16px;color:#0f172a;">지금 가장 신경 써야 할 3가지</h2>
      <ol style="margin:0 0 24px;padding-left:20px;color:#334155;">${riskItems || "<li>표시할 항목이 없습니다.</li>"}</ol>
      <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:12px;padding:16px;margin-bottom:24px;">
        <h2 style="margin:0 0 8px;font-size:16px;color:#1e3a8a;">그래서, 무엇부터 하면 좋을까요?</h2>
        <p style="margin:0;font-size:14px;line-height:1.6;color:#1e3a8a;">${escapeHtml(result.actionPlan)}</p>
      </div>
      <p style="margin:0;font-size:13px;color:#64748b;line-height:1.6;">
        본 리포트는 설문 응답을 바탕으로 자동 생성되었습니다.
        추가 상담·현장 진단은 <a href="https://survey.proali.kr/" style="color:#2563eb;">설문 결과 페이지</a>에서 신청하실 수 있습니다.
      </p>
    </div>
    <p style="margin:16px 0 0;text-align:center;font-size:12px;color:#94a3b8;">
      PRO ALI SMART · survey.proali.kr
    </p>
  </div>
</body>
</html>`;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
