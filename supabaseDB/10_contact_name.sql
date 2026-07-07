-- ============================================================
-- 10_contact_name.sql — CTA 알림용 신청자 이름 컬럼
-- ============================================================

alter table public.survey_responses
  add column if not exists contact_name text;
