-- ============================================================
-- 03_verify.sql — 구축 결과 검증
-- 01, 02 실행 후 이 파일을 실행해 결과를 확인합니다.
-- 조회만 하므로 데이터에 영향이 없습니다.
-- ============================================================

-- ── 1. 테이블 존재 + RLS 활성화 확인 ──
-- 기대 결과: 2행, 두 행 모두 rls_enabled = true
select
  tablename,
  rowsecurity as rls_enabled
from pg_tables
where schemaname = 'public'
  and tablename in ('survey_responses', 'cta_requests')
order by tablename;

-- ── 2. RLS 정책 확인 ──
-- 기대 결과: 2행 — 두 테이블 모두 cmd = INSERT, roles = {anon}
select
  tablename,
  policyname,
  cmd,
  roles
from pg_policies
where schemaname = 'public'
order by tablename;

-- ── 3. 컬럼 구조 확인 ──
-- 기대 결과: survey_responses 15개 컬럼, cta_requests 9개 컬럼
select
  table_name,
  column_name,
  data_type,
  is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name in ('survey_responses', 'cta_requests')
order by table_name, ordinal_position;

-- ── 4. 인덱스 확인 ──
-- 기대 결과: PK 2개 + idx_* 4개
select
  tablename,
  indexname
from pg_indexes
where schemaname = 'public'
  and tablename in ('survey_responses', 'cta_requests')
order by tablename, indexname;

-- ── 5. 저장 건수 확인 (운영 중 수시 사용) ──
select
  (select count(*) from public.survey_responses) as responses_count,
  (select count(*) from public.cta_requests)     as cta_count;
