-- v3: Table Editor에서 응답 코드 대신 한글 라벨 조회
-- Supabase SQL Editor에서 실행

alter table public.survey_responses
  add column if not exists answers_display jsonb;

comment on column public.survey_responses.answers_display is
  '문항별 한글 라벨 (answers 코드 → 텍스트). Table Editor·분석용';

-- 기존 v_survey_responses_excel 뷰: answers_display 우선, 없으면 answers fallback
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
  coalesce(answers_display, answers) as answers_readable,

  coalesce(answers_display->>'A1', answers->>'A1') as "A1_주력사업",
  coalesce(answers_display->>'A2', answers->>'A2') as "A2_근로자수",
  coalesce(answers_display->>'A3', answers->>'A3') as "A3_보유인증",
  coalesce(answers_display->>'A4', answers->>'A4') as "A4_주요고객",
  coalesce(answers_display->>'A5', answers->>'A5') as "A5_응답자직무",
  coalesce(answers_display->>'A6', answers->>'A6') as "A6_의사결정관여도",
  answers_display->>'A6-1' as "A6-1_예산결정경험",

  coalesce(answers_display->>'B1', answers->>'B1') as "B1_심사회수",
  coalesce(answers_display->>'B2', answers->>'B2') as "B2_업무일치지적",
  answers_display->>'B2-1' as "B2-1_지적영역",
  answers_display->>'B2-2' as "B2-2_어긋남이유",
  coalesce(answers_display->>'B3', answers->>'B3') as "B3_출하불합격클레임",
  coalesce(answers_display->>'B3A', answers->>'B3A') as "B3A_불량재작업폐기율",
  coalesce(answers_display->>'q10_basis', answers->>'q10_basis') as "q10_basis_불량기준",
  coalesce(answers_display->>'B4', answers->>'B4') as "B4_CAPA소요기간",
  coalesce(answers_display->>'B5', answers->>'B5') as "B5_단순재교육종결비율",
  coalesce(answers_display->>'B6', answers->>'B6') as "B6_유사불량재발경험",
  coalesce(answers_display->>'B7', answers->>'B7') as "B7_심사준비공수",

  coalesce(answers_display->>'C1', (answers->'C1'->>'freq')) as "C1_절차생략",
  coalesce(answers_display->>'C2', (answers->'C2'->>'freq')) as "C2_표준화부재",
  coalesce(answers_display->>'C3', (answers->'C3'->>'freq')) as "C3_부서단절",
  coalesce(answers_display->>'C4', (answers->'C4'->>'freq')) as "C4_이력추적",
  coalesce(answers_display->>'C_ATT', (answers->'C_ATT'->>'freq')) as "C_ATT_주의문항",
  coalesce(answers_display->>'C5', (answers->'C5'->>'freq')) as "C5_변경점관리",
  coalesce(answers_display->>'C6', (answers->'C6'->>'freq')) as "C6_CAPA부담",
  coalesce(answers_display->>'C7', (answers->'C7'->>'freq')) as "C7_경영보고",
  coalesce(answers_display->>'C8', (answers->'C8'->>'freq')) as "C8_사후관리",
  coalesce(answers_display->>'C9', answers->>'C9') as "C9_해결시이익TOP3",
  answers_display->>'C9-2' as "C9-2_미해결결과",
  answers_display->>'F4' as "F4_도메인Pain순위",

  coalesce(answers_display->>'D1', answers->>'D1') as "D1_품질전담인원",
  coalesce(answers_display->>'D2', answers->>'D2') as "D2_문서관리도구",
  answers_display->>'D2-1' as "D2-1_수기유지이유",
  coalesce(answers_display->>'D2A', answers->>'D2A') as "D2A_혁신활동운영",
  coalesce(answers_display->>'D3', answers->>'D3') as "D3_절차불이행원인",
  answers_display->>'D3-1' as "D3-1_실정불일치영역",
  coalesce(answers_display->>'D4_gate', answers->>'D4_gate') as "D4_gate_컨설팅경험",
  coalesce(answers_display->>'D4_pain', answers->>'D4_pain') as "D4_pain_컨설팅아쉬움",
  coalesce(answers_display->>'D5', answers->>'D5') as "D5_가장해결원하는업무",

  answers_display->>'F0-Q1' as "F0-Q1_품질데이터관리",
  answers_display->>'F0-Q2' as "F0-Q2_생산데이터관리",
  answers_display->>'F0-Q3' as "F0-Q3_납기수주관리",
  answers_display->>'F0-3' as "F0-3_디지털화1순위",
  answers_display->>'F0-4' as "F0-4_데이터반출제약",
  answers_display->>'F5-1' as "F5-1_도입장애TOP3",
  answers_display->>'F6' as "F6_유료1순위역량",

  coalesce(answers_display->>'E2', answers->>'E2') as "E2_도입최대장애물",
  coalesce(answers_display->>'E3', answers->>'E3') as "E3_유료PoC의향",
  coalesce(answers_display->>'E5', answers->>'E5') as "E5_수용가능PoC비용",
  coalesce(answers_display->>'E5A', answers->>'E5A') as "E5A_가장가려운부분",
  coalesce(answers_display->>'E6', answers->>'E6') as "E6_무료전화자문신청"
from public.survey_responses;
