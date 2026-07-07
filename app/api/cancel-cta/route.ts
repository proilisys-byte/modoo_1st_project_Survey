import { getSupabaseServerConfig } from "@/lib/supabase-server";
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const CTA_TYPES = new Set(["free_diagnosis", "consulting", "poc"]);

export async function DELETE(request: Request) {
  const config = getSupabaseServerConfig();
  if (!config || config.mode !== "service_role") {
    return NextResponse.json(
      {
        cancelled: false,
        error:
          "신청 해제 기능을 사용하려면 SUPABASE_SERVICE_ROLE_KEY 설정이 필요합니다.",
      },
      { status: 503 }
    );
  }

  let body: { submission_uid?: string; cta_type?: string };
  try {
    body = (await request.json()) as { submission_uid?: string; cta_type?: string };
  } catch {
    return NextResponse.json(
      { cancelled: false, error: "잘못된 요청입니다." },
      { status: 400 }
    );
  }

  const uid = body.submission_uid?.trim() ?? "";
  const ctaType = body.cta_type?.trim() ?? "";

  if (!uid || !CTA_TYPES.has(ctaType)) {
    return NextResponse.json(
      { cancelled: false, error: "잘못된 요청입니다." },
      { status: 400 }
    );
  }

  const admin = createClient(config.url, config.key);
  const { error } = await admin
    .from("cta_requests")
    .delete()
    .eq("submission_uid", uid)
    .eq("cta_type", ctaType);

  if (error) {
    console.error("cancel-cta:", error.message);
    return NextResponse.json(
      { cancelled: false, error: "신청 해제에 실패했습니다." },
      { status: 502 }
    );
  }

  return NextResponse.json({ cancelled: true });
}
