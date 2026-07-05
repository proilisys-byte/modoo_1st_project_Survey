-- 설문 응답 저장 테이블
-- Supabase SQL Editor에서 실행하세요.

create table if not exists public.survey_responses (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  submission_uid text,               -- 클라이언트 발급 UID (CTA 신청과 연결용)
  answers jsonb not null,
  email text not null,
  company text,
  job_title text,
  phone text,
  score integer not null,
  grade text not null,               -- 화면 표시용 친근한 문구
  grade_code text not null,          -- 관리자·분석용 등급 코드 (A/B/C/D)
  grade_internal text,               -- 정식 등급명 (설계서 10.4)
  pain_scores jsonb not null default '{}'::jsonb,
  attention_passed boolean not null default false,
  duration_seconds integer not null default 0,
  user_agent text
);

-- 이미 테이블이 있는 경우를 위한 컬럼 추가 (최초 생성 시에는 무시됨)
alter table public.survey_responses
  add column if not exists submission_uid text,
  add column if not exists grade_code text,
  add column if not exists grade_internal text,
  add column if not exists job_title text;

alter table public.survey_responses enable row level security;

-- 익명(anon) 키로는 삽입만 허용 — 응답 조회·수정·삭제는 대시보드/service key에서만
drop policy if exists "anon can insert responses" on public.survey_responses;
create policy "anon can insert responses"
  on public.survey_responses
  for insert
  to anon
  with check (true);

-- 결과 페이지 CTA(무료진단·상담·PoC) 신청 저장 테이블
create table if not exists public.cta_requests (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  submission_uid text,               -- survey_responses.submission_uid 와 연결
  cta_type text not null,            -- free_diagnosis | consulting | poc
  email text not null,
  company text,
  phone text,
  score integer,
  grade_code text
);

alter table public.cta_requests enable row level security;

drop policy if exists "anon can insert cta" on public.cta_requests;
create policy "anon can insert cta"
  on public.cta_requests
  for insert
  to anon
  with check (true);
