import { CTA_ITEMS } from "@/lib/cta-items";
import { sendCtaAdminNotification } from "@/lib/cta-notify-email";
import type { CtaType } from "@/lib/supabase";
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
const CTA_TYPES = new Set(CTA_ITEMS.map((c) => c.type));

export async function POST(request: Request) {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();

  if (!serviceKey || !supabaseUrl) {
    return NextResponse.json(
      { saved: false, error: "서버 설정이 완료되지 않았습니다." },
      { status: 503 }
    );
  }

  let body: { submission_uid?: string; cta_type?: string; phone?: string };
  try {
    body = (await request.json()) as {
      submission_uid?: string;
      cta_type?: string;
      phone?: string;
    };
  } catch {
    return NextResponse.json(
      { saved: false, error: "잘못된 요청입니다." },
      { status: 400 }
    );
  }

  const uid = body.submission_uid?.trim() ?? "";
  const ctaType = body.cta_type?.trim() ?? "";
  const phoneOverride = body.phone?.trim() ?? "";

  if (!uid || !CTA_TYPES.has(ctaType as CtaType)) {
    return NextResponse.json(
      { saved: false, error: "잘못된 요청입니다." },
      { status: 400 }
    );
  }

  const admin = createClient(supabaseUrl, serviceKey);
  const { data: row, error: fetchError } = await admin
    .from("survey_responses")
    .select("email, contact_name, company, job_title, phone, score, grade_code")
    .eq("submission_uid", uid)
    .maybeSingle();

  if (fetchError || !row) {
    return NextResponse.json(
      { saved: false, error: "응답 정보를 찾을 수 없습니다." },
      { status: 404 }
    );
  }

  const phone =
    phoneOverride.length >= 9
      ? phoneOverride
      : typeof row.phone === "string" && row.phone.trim().length >= 9
        ? row.phone.trim()
        : null;

  const { error: insertError } = await admin.from("cta_requests").insert({
    submission_uid: uid,
    cta_type: ctaType,
    email: row.email,
    company: row.company,
    phone,
    score: row.score,
    grade_code: row.grade_code,
  });

  if (insertError) {
    console.error("cta-request POST:", insertError.message);
    return NextResponse.json(
      { saved: false, error: "신청 저장에 실패했습니다." },
      { status: 502 }
    );
  }

  const applicantName =
    typeof row.contact_name === "string" && row.contact_name.trim().length > 0
      ? row.contact_name.trim()
      : null;
  const jobTitle =
    typeof row.job_title === "string" && row.job_title.trim().length > 0
      ? row.job_title.trim()
      : null;

  void sendCtaAdminNotification({
    submissionUid: uid,
    ctaType: ctaType as CtaType,
    email: row.email,
    applicantName,
    company: row.company,
    jobTitle,
    phone,
    score: row.score,
    gradeCode: row.grade_code,
  }).catch((err) => console.error("cta-request notify:", err));

  return NextResponse.json({ saved: true });
}
