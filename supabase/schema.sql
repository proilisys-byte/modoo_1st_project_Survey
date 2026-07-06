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
  user_agent text,
  survey_version text,
  started_at timestamptz,
  submitted_at timestamptz,
  consent_required boolean not null default false,
  marketing_opt_in boolean not null default false,
  email_status text default 'pending',
  psm_inconsistent boolean not null default false,
  scoring_config_version text,
  c_display_order jsonb,
  benchmark_version text,
  result_snapshot jsonb,
  answers_display jsonb
);

-- 이미 테이블이 있는 경우를 위한 컬럼 추가 (최초 생성 시에는 무시됨)
alter table public.survey_responses
  add column if not exists submission_uid text,
  add column if not exists grade_code text,
  add column if not exists grade_internal text,
  add column if not exists job_title text,
  add column if not exists survey_version text,
  add column if not exists started_at timestamptz,
  add column if not exists submitted_at timestamptz,
  add column if not exists consent_required boolean default false,
  add column if not exists marketing_opt_in boolean default false,
  add column if not exists email_status text default 'pending',
  add column if not exists psm_inconsistent boolean default false,
  add column if not exists scoring_config_version text,
  add column if not exists c_display_order jsonb,
  add column if not exists benchmark_version text,
  add column if not exists result_snapshot jsonb,
  add column if not exists answers_display jsonb;

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

-- 분석용 엑셀 내보내기 및 대시보드 조회를 위한 개별 문항 추출 뷰
drop view if exists public.v_survey_responses_excel;
create or replace view public.v_survey_responses_excel as
select
  id,
  submission_uid,
  created_at,
  email,
  company,
  job_title,
  phone,
  score,
  grade_code,
  grade_internal,
  duration_seconds,
  attention_passed,
  survey_version,
  psm_inconsistent,
  email_status,
  
  -- 1. 프로파일 (A섹션)
  answers->>'A1' as "A1_주력사업",
  answers->>'A2' as "A2_근로자수",
  answers->>'A3' as "A3_보유인증",
  answers->>'A4' as "A4_주요고객",
  answers->>'A5' as "A5_응답자직무",
  answers->>'A6' as "A6_의사결정관여도",
  
  -- 2. 품질운영 (B섹션)
  answers->>'B1' as "B1_심사회수",
  answers->>'B2' as "B2_업무일치지적",
  answers->>'B3' as "B3_출하불합격클레임",
  answers->>'B3A' as "B3A_불량재작업폐기율",
  answers->>'q10_basis' as "q10_basis_불량기준",
  answers->>'B4' as "B4_CAPA소요기간",
  answers->>'B5' as "B5_단순재교육종결비율",
  answers->>'B6' as "B6_유사불량재발경험",
  answers->>'B7' as "B7_심사준비공수",
  
  -- 3. Pain Point (C섹션 - 듀얼스케일)
  (answers->'C1'->>'freq') as "C1_절차생략_빈도",
  (answers->'C1'->>'sev') as "C1_절차생략_영향",
  (answers->'C2'->>'freq') as "C2_표준화부재_빈도",
  (answers->'C2'->>'sev') as "C2_표준화부재_영향",
  (answers->'C3'->>'freq') as "C3_부서단절_빈도",
  (answers->'C3'->>'sev') as "C3_부서단절_영향",
  (answers->'C4'->>'freq') as "C4_이력추적_빈도",
  (answers->'C4'->>'sev') as "C4_이력추적_영향",
  (answers->'C_ATT'->>'freq') as "C_ATT_주의문항",
  (answers->'C5'->>'freq') as "C5_변경점관리_빈도",
  (answers->'C5'->>'sev') as "C5_변경점관리_영향",
  (answers->'C6'->>'freq') as "C6_CAPA부담_빈도",
  (answers->'C6'->>'sev') as "C6_CAPA부담_영향",
  (answers->'C7'->>'freq') as "C7_경영보고_빈도",
  (answers->'C7'->>'sev') as "C7_경영보고_영향",
  (answers->'C8'->>'freq') as "C8_사후관리_빈도",
  (answers->'C8'->>'sev') as "C8_사후관리_영향",
  answers->>'C9' as "C9_해결시이익TOP3",
  
  -- 4. 근본원인 (D섹션)
  answers->>'D1' as "D1_품질전담인원",
  answers->>'D2' as "D2_문서관리도구",
  answers->>'D2A' as "D2A_혁신활동운영",
  answers->>'D3' as "D3_절차불이행원인",
  answers->>'D4_gate' as "D4_gate_컨설팅경험",
  answers->>'D4_pain' as "D4_pain_컨설팅아쉬움",
  answers->>'D5' as "D5_가장해결원하는업무",
  
  -- 5. 솔루션 (E섹션)
  (answers->'E1'->>'a') as "E1_일일체크시트변환_도움",
  (answers->'E1'->>'b') as "E1_CAPA초안작성_도움",
  (answers->'E1'->>'c') as "E1_발생단계추적_도움",
  (answers->'E1'->>'d') as "E1_진행알림할당_도움",
  (answers->'E1'->>'e') as "E1_경영진보고생성_도움",
  (answers->'E1'->>'f') as "E1_문서기록자동점검_도움",
  answers->>'E2' as "E2_도입최대장애물",
  answers->>'E3' as "E3_유료PoC의향",
  (answers->'E4'->>'a') as "E4_너무싸서의심금액",
  (answers->'E4'->>'b') as "E4_합리적금액",
  (answers->'E4'->>'c') as "E4_비싸지만고려금액",
  (answers->'E4'->>'d') as "E4_너무비싼금액",
  answers->>'E5' as "E5_수용가능PoC비용",
  answers->>'E5A' as "E5A_가장가려운부분",
  answers->>'E6' as "E6_무료전화자문신청"

from public.survey_responses;
