-- ============================================================
-- 02_rls_policies.sql — RLS 활성화 + 접근 정책
-- 기준 문서: docs/DB_구현_정의서.md §5
-- 멱등: 여러 번 실행해도 안전합니다.
--
-- 보안 모델:
--   anon 키(브라우저 노출)     → INSERT만 허용
--   SELECT / UPDATE / DELETE  → 정책 없음 = 전부 거부
--   조회·관리                  → Supabase 대시보드 또는 service_role 키에서만
-- ============================================================

-- ── survey_responses ──
alter table public.survey_responses enable row level security;

drop policy if exists "anon can insert responses" on public.survey_responses;
create policy "anon can insert responses"
  on public.survey_responses
  for insert
  to anon
  with check (true);

-- ── cta_requests ──
alter table public.cta_requests enable row level security;

drop policy if exists "anon can insert cta" on public.cta_requests;
create policy "anon can insert cta"
  on public.cta_requests
  for insert
  to anon
  with check (true);
