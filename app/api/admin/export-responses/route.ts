import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import {
  rowsToCsv,
  rowsToJsonl,
  toAnalysisExport,
  type SurveyResponseRow,
} from "@/lib/export-responses";

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

function checkAdmin(request: Request): boolean {
  const secret = process.env.ADMIN_EXPORT_SECRET;
  if (!secret) return false;
  const auth = request.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  return token.length > 0 && token === secret;
}

/** T-17: PII 제외 응답 export (관리자 Bearer ADMIN_EXPORT_SECRET 필수) */
export async function GET(request: Request) {
  if (!checkAdmin(request)) return unauthorized();

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!serviceKey || !supabaseUrl) {
    return NextResponse.json(
      { error: "Supabase service role not configured" },
      { status: 503 }
    );
  }

  const { searchParams } = new URL(request.url);
  const format = searchParams.get("format") ?? "jsonl";
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "5000", 10), 10000);

  const admin = createClient(supabaseUrl, serviceKey);
  const { data, error } = await admin
    .from("survey_responses")
    .select(
      [
        "id",
        "submission_uid",
        "created_at",
        "answers",
        "score",
        "grade_code",
        "pain_scores",
        "attention_passed",
        "duration_seconds",
        "survey_version",
        "scoring_config_version",
        "psm_inconsistent",
        "started_at",
        "submitted_at",
        "consent_required",
        "marketing_opt_in",
        "email_status",
        "c_display_order",
        "benchmark_version",
        "result_snapshot",
      ].join(",")
    )
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("export-responses:", error);
    return NextResponse.json({ error: "Export query failed" }, { status: 500 });
  }

  const records = (data ?? []).map((row) =>
    toAnalysisExport(row as unknown as SurveyResponseRow)
  );

  if (format === "csv") {
    const body = rowsToCsv(records);
    return new NextResponse(body, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="survey_export.csv"',
      },
    });
  }

  const body = rowsToJsonl(records);
  return new NextResponse(body, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Content-Disposition": 'attachment; filename="survey_export.jsonl"',
    },
  });
}
