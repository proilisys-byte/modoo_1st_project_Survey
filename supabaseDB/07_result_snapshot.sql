-- ============================================================
-- 07_result_snapshot.sql — 제출 시점 채점 스냅샷 (TOP3·도메인·burden)
-- Supabase SQL Editor에서 04/05 실행 후 수동 실행하세요.
-- ============================================================

alter table public.survey_responses
  add column if not exists result_snapshot jsonb;

comment on column public.survey_responses.result_snapshot is
  '제출 시점 고정: total, d1~d4, top3_computed[], pain_scores, scoring_config_version, recomputed=false';

-- 예시 구조:
-- {
--   "scoring_config_version": "v2",
--   "recomputed": false,
--   "computed_at": "2026-07-05T12:00:00Z",
--   "total": 72,
--   "grade_code": "B",
--   "d1": 22, "d2": 20, "d3": 15, "d4": 15,
--   "top3_computed": [{"id":"C4","burden":25,"short":"..."}],
--   "pain_scores": {"C1": 12, ...}
-- }

select column_name, data_type
from information_schema.columns
where table_schema = 'public'
  and table_name = 'survey_responses'
  and column_name = 'result_snapshot';
