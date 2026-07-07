import { getResendConfig } from "@/lib/resend-config";
import { getSupabaseServerConfig } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

/** 운영 진단용 — 시크릿 값은 노출하지 않음 */
export async function GET() {
  const resend = getResendConfig();
  const supabase = getSupabaseServerConfig();

  const missing: string[] = [];
  if (!process.env.RESEND_API_KEY?.trim()) missing.push("RESEND_API_KEY");
  if (!process.env.EMAIL_FROM?.trim()) missing.push("EMAIL_FROM");
  if (!supabase) {
    missing.push("NEXT_PUBLIC_SUPABASE_URL");
    missing.push("NEXT_PUBLIC_SUPABASE_ANON_KEY or SUPABASE_SERVICE_ROLE_KEY");
  } else if (supabase.mode !== "service_role") {
    missing.push("SUPABASE_SERVICE_ROLE_KEY");
  }
  if (!process.env.CTA_NOTIFY_EMAIL?.trim()) missing.push("CTA_NOTIFY_EMAIL");

  return NextResponse.json({
    reportEmailReady: !!resend && supabase?.mode === "service_role",
    resendConfigured: !!resend,
    supabaseMode: supabase?.mode ?? null,
    missing,
  });
}
