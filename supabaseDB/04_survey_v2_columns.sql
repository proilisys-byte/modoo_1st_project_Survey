-- ============================================================
-- 04_survey_v2_columns.sql — T-17 스키마 보강 (v2 배포)
-- 기존 survey_responses 컬럼은 유지, 분석·v2 메타 필드 추가
-- Supabase SQL Editor에서 01~02 실행 후 이 파일을 실행하세요.
-- ============================================================

alter table public.survey_responses
  add column if not exists survey_version text,
  add column if not exists started_at timestamptz,
  add column if not exists submitted_at timestamptz,
  add column if not exists consent_required boolean,
  add column if not exists marketing_opt_in boolean,
  add column if not exists email_status text,
  add column if not exists psm_inconsistent boolean default false,
  add column if not exists scoring_config_version text,
  add column if not exists benchmark_version text;

-- email_error: 서버 전용(관리자 API·배치에서만 기록). 클라이언트 insert 정책으로는 쓰지 않음
alter table public.survey_responses
  add column if not exists email_error text;

comment on column public.survey_responses.survey_version is 'v1 | v2 — 문항 개정 버전';
comment on column public.survey_responses.email_status is 'pending | sent | failed';
comment on column public.survey_responses.marketing_opt_in is 'false면 마케팅 발송 대상 제외';
comment on column public.survey_responses.psm_inconsistent is 'E4 PSM 금액 순서 역전 플래그';
comment on column public.survey_responses.scoring_config_version is '채점 설정 버전 (analysis/config/scoring_config.yaml)';

-- phone: T-03 조건부 수집 — 미입력 허용
alter table public.survey_responses
  alter column phone drop not null;

-- v2 컬럼 존재 확인 (03_verify.sql 패턴)
select column_name, data_type
from information_schema.columns
where table_schema = 'public'
  and table_name = 'survey_responses'
  and column_name in (
    'survey_version', 'started_at', 'submitted_at',
    'consent_required', 'marketing_opt_in', 'email_status',
    'psm_inconsistent', 'scoring_config_version'
  )
order by column_name;
