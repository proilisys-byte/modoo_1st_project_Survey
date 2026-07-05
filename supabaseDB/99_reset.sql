-- ============================================================
-- 99_reset.sql — ⚠️ 전체 삭제 (재구축용)
--
-- 경고: 두 테이블과 저장된 모든 응답·신청 데이터가 영구 삭제됩니다.
-- 실데이터가 쌓인 후에는 실행 전 반드시 백업을 확인하세요.
--   (Dashboard → Database → Backups)
--
-- 용도: 초기 구축 단계에서 스키마를 처음부터 다시 만들 때만 사용.
-- 실행 후 01_schema.sql → 02_rls_policies.sql 순으로 재구축합니다.
-- ============================================================

drop table if exists public.survey_responses cascade;
drop table if exists public.cta_requests cascade;
