-- ============================================================
-- 05_c_display_order.sql — T-13/T-12 표시 순서 저장 컬럼
-- Supabase SQL Editor에서 04 실행 후 수동 실행하세요.
-- ============================================================

alter table public.survey_responses
  add column if not exists c_display_order jsonb;

comment on column public.survey_responses.c_display_order is
  'T-13 C_pain: C1~C8+C_ATT 표시순서 | T-12 C9_options: TOP3 보기 순서';

select column_name, data_type
from information_schema.columns
where table_schema = 'public'
  and table_name = 'survey_responses'
  and column_name = 'c_display_order';
