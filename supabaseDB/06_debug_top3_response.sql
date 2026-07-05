-- ============================================================
-- 06_debug_top3_response.sql — TOP3 진단용 최근 테스트 응답 조회
-- Supabase SQL Editor에서 실행 후 결과를 붙여넣으세요.
-- ============================================================

-- P0: c_display_order 컬럼 없으면 insert 실패 (05_c_display_order.sql 수동 실행)
select column_name, data_type
from information_schema.columns
where table_schema = 'public'
  and table_name = 'survey_responses'
  and column_name = 'c_display_order';

-- P0: 최근 응답 존재 여부
select count(*) as total_rows,
       max(created_at) as latest_created_at
from public.survey_responses;

-- 최근 테스트 응답 1건
with latest as (
  select *
  from public.survey_responses
  -- where email ilike '%test%'  -- 테스트 계정 필터
  order by created_at desc
  limit 1
)
select
  id,
  submission_uid,
  created_at,
  survey_version,
  scoring_config_version,
  duration_seconds,
  attention_passed,
  psm_inconsistent,
  score,
  grade_code,
  c_display_order,
  answers -> 'C1' as c1_raw,
  answers -> 'C2' as c2_raw,
  answers -> 'C3' as c3_raw,
  answers -> 'C4' as c4_raw,
  answers -> 'C5' as c5_raw,
  answers -> 'C6' as c6_raw,
  answers -> 'C7' as c7_raw,
  answers -> 'C8' as c8_raw,
  answers -> 'C_ATT' as c_att_raw,
  answers -> 'C9' as c9_self_top3,
  pain_scores,
  (answers -> 'C1' ->> 'freq')::int as c1_freq,
  (answers -> 'C1' ->> 'sev')::int as c1_sev,
  (answers -> 'C1' ->> 'freq')::int * (answers -> 'C1' ->> 'sev')::int as c1_burden_calc,
  (pain_scores ->> 'C1') as c1_burden_stored,
  (answers -> 'C2' ->> 'freq')::int * (answers -> 'C2' ->> 'sev')::int as c2_burden_calc,
  (pain_scores ->> 'C2') as c2_burden_stored,
  (answers -> 'C3' ->> 'freq')::int * (answers -> 'C3' ->> 'sev')::int as c3_burden_calc,
  (pain_scores ->> 'C3') as c3_burden_stored,
  (answers -> 'C4' ->> 'freq')::int * (answers -> 'C4' ->> 'sev')::int as c4_burden_calc,
  (pain_scores ->> 'C4') as c4_burden_stored,
  (answers -> 'C5' ->> 'freq')::int * (answers -> 'C5' ->> 'sev')::int as c5_burden_calc,
  (pain_scores ->> 'C5') as c5_burden_stored,
  (answers -> 'C6' ->> 'freq')::int * (answers -> 'C6' ->> 'sev')::int as c6_burden_calc,
  (pain_scores ->> 'C6') as c6_burden_stored,
  (answers -> 'C7' ->> 'freq')::int * (answers -> 'C7' ->> 'sev')::int as c7_burden_calc,
  (pain_scores ->> 'C7') as c7_burden_stored,
  (answers -> 'C8' ->> 'freq')::int * (answers -> 'C8' ->> 'sev')::int as c8_burden_calc,
  (pain_scores ->> 'C8') as c8_burden_stored,
  case
    when answers -> 'C1' ->> 'sev' is null then 'C1 sev missing -> excluded from pain_scores'
    else 'ok'
  end as c1_sev_check
from latest;

-- TOP3 추정 (DB 컬럼 없음): burden desc -> sev desc -> C1..C8
with latest as (
  select pain_scores, answers
  from public.survey_responses
  order by created_at desc
  limit 1
),
expanded as (
  select
    key as pain_id,
    (value)::int as burden,
    (answers -> key ->> 'sev')::int as sev
  from latest,
  lateral jsonb_each_text(latest.pain_scores) as t(key, value)
)
select pain_id, burden, sev
from expanded
order by burden desc, sev desc nulls last, pain_id asc
limit 3;
