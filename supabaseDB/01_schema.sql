-- ============================================================
-- 01_schema.sql — 테이블 + 인덱스 생성
-- 기준 문서: docs/DB_구현_정의서.md §4
-- 멱등: 여러 번 실행해도 안전합니다.
-- ============================================================

-- ── 설문 응답 저장 테이블 ──
create table if not exists public.survey_responses (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  submission_uid text,               -- 클라이언트 발급 UID (cta_requests와 연결 키)
  answers jsonb not null,            -- 전체 문항 응답 (문항 id -> 값)
  email text not null,
  company text,
  job_title text,
  phone text,
  score integer not null,            -- ISO 실행력 점수 (100점 만점)
  grade text not null,               -- 화면 표시용 친근한 문구
  grade_code text not null,          -- 관리자·분석용 등급 코드 (A/B/C/D)
  grade_internal text,               -- 정식 등급명 (설계서 10.4)
  pain_scores jsonb not null default '{}'::jsonb,  -- C1~C8 Pain Score (1~25)
  attention_passed boolean not null default false, -- 주의 확인 문항 통과 여부
  duration_seconds integer not null default 0,
  user_agent text
);

-- 기존 테이블에 컬럼이 없던 경우를 위한 보강 (최초 생성 시 무시됨)
alter table public.survey_responses
  add column if not exists submission_uid text,
  add column if not exists grade_code text,
  add column if not exists grade_internal text,
  add column if not exists job_title text;

-- ── 결과 페이지 CTA(무료진단·상담·PoC) 신청 저장 테이블 ──
create table if not exists public.cta_requests (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  submission_uid text,               -- survey_responses.submission_uid 와 연결
  cta_type text not null,            -- free_diagnosis | consulting | poc
  email text not null,
  company text,
  phone text,
  score integer,                     -- 신청 시점의 진단 점수 스냅샷
  grade_code text                    -- 신청 시점의 등급 스냅샷
);

-- ── 조회용 인덱스 (관리자 조회·응답-신청 연결용) ──
create index if not exists idx_survey_responses_created_at
  on public.survey_responses (created_at desc);

create index if not exists idx_survey_responses_submission_uid
  on public.survey_responses (submission_uid);

create index if not exists idx_cta_requests_created_at
  on public.cta_requests (created_at desc);

create index if not exists idx_cta_requests_submission_uid
  on public.cta_requests (submission_uid);
