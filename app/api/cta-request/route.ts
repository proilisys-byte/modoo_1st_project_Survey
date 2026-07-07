import { CTA_ITEMS } from "@/lib/cta-items";
import { sendCtaAdminNotification } from "@/lib/cta-notify-email";
import { getSupabaseServerConfig } from "@/lib/supabase-server";
import type { CtaType } from "@/lib/supabase";
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const CTA_TYPES = new Set(CTA_ITEMS.map((c) => c.type));

type CtaRequestBody = {
  submission_uid?: string;
  cta_type?: string;
  phone?: string;
  email?: string;
  company?: string | null;
  contact_name?: string | null;
  job_title?: string | null;
  score?: number;
  grade_code?: string;
};

type CtaRow = {
  email: string;
  company: string | null;
  phone: string | null;
  score: number;
  grade_code: string;
  contact_name: string | null;
  job_title: string | null;
};

function normalizePhone(
  phoneOverride: string,
  rowPhone: string | null | undefined
): string | null {
  if (phoneOverride.length >= 9) return phoneOverride;
  if (typeof rowPhone === "string" && rowPhone.trim().length >= 9) {
    return rowPhone.trim();
  }
  return null;
}

function clientPayloadValid(body: CtaRequestBody): boolean {
  return (
    typeof body.email === "string" &&
    body.email.trim().length > 0 &&
    typeof body.score === "number" &&
    Number.isFinite(body.score) &&
    typeof body.grade_code === "string" &&
    body.grade_code.trim().length > 0
  );
}

function rowFromClient(body: CtaRequestBody, phone: string | null): CtaRow {
  return {
    email: body.email!.trim(),
    company:
      typeof body.company === "string" && body.company.trim().length > 0
        ? body.company.trim()
        : null,
    phone,
    score: body.score!,
    grade_code: body.grade_code!.trim(),
    contact_name:
      typeof body.contact_name === "string" && body.contact_name.trim().length > 0
        ? body.contact_name.trim()
        : null,
    job_title:
      typeof body.job_title === "string" && body.job_title.trim().length > 0
        ? body.job_title.trim()
        : null,
  };
}

async function loadRowFromDb(
  uid: string,
  body: CtaRequestBody,
  phoneOverride: string
): Promise<CtaRow | null> {
  const config = getSupabaseServerConfig();
  if (!config || config.mode !== "service_role") return null;

  const admin = createClient(config.url, config.key);
  let { data, error } = await admin
    .from("survey_responses")
    .select("email, contact_name, company, job_title, phone, score, grade_code")
    .eq("submission_uid", uid)
    .maybeSingle();

  if (error?.message?.includes("contact_name")) {
    ({ data, error } = await admin
      .from("survey_responses")
      .select("email, company, job_title, phone, score, grade_code")
      .eq("submission_uid", uid)
      .maybeSingle());
  }

  if (error || !data) return null;

  return {
    email: data.email,
    company: data.company,
    phone: normalizePhone(phoneOverride, data.phone),
    score: data.score,
    grade_code: data.grade_code,
    contact_name:
      "contact_name" in data &&
      typeof data.contact_name === "string" &&
      data.contact_name.trim().length > 0
        ? data.contact_name.trim()
        : typeof body.contact_name === "string" && body.contact_name.trim().length > 0
          ? body.contact_name.trim()
          : null,
    job_title:
      typeof data.job_title === "string" && data.job_title.trim().length > 0
        ? data.job_title.trim()
        : null,
  };
}

export async function POST(request: Request) {
  const config = getSupabaseServerConfig();
  if (!config) {
    return NextResponse.json(
      { saved: false, error: "서버 설정이 완료되지 않았습니다." },
      { status: 503 }
    );
  }

  let body: CtaRequestBody;
  try {
    body = (await request.json()) as CtaRequestBody;
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

  const phone = normalizePhone(phoneOverride, null);

  let row = await loadRowFromDb(uid, body, phoneOverride);
  if (!row) {
    if (!clientPayloadValid(body)) {
      return NextResponse.json(
        {
          saved: false,
          error:
            config.mode === "anon"
              ? "응답 정보를 찾을 수 없습니다. 결과 페이지에서 다시 신청해 주세요."
              : "응답 정보를 찾을 수 없습니다.",
        },
        { status: 404 }
      );
    }
    row = rowFromClient(body, phone);
  } else if (phoneOverride.length >= 9) {
    row = { ...row, phone: phoneOverride };
  }

  const db = createClient(config.url, config.key);
  const { error: insertError } = await db.from("cta_requests").insert({
    submission_uid: uid,
    cta_type: ctaType,
    email: row.email,
    company: row.company,
    phone: row.phone,
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

  void sendCtaAdminNotification({
    submissionUid: uid,
    ctaType: ctaType as CtaType,
    email: row.email,
    applicantName: row.contact_name,
    company: row.company,
    jobTitle: row.job_title,
    phone: row.phone,
    score: row.score,
    gradeCode: row.grade_code,
  }).catch((err) => console.error("cta-request notify:", err));

  return NextResponse.json({ saved: true });
}
