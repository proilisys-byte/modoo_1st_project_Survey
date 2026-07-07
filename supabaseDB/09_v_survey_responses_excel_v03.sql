-- ============================================================
-- 09_v_survey_responses_excel_v03.sql
-- v03 문항 ID 기준 Excel/Table Editor 조회 뷰
-- 기준: docs/Survey_Based_v03.md · lib/question-display-numbers.ts
-- 멱등: 여러 번 실행해도 안전합니다.
-- ============================================================

-- answers_display 우선, 없으면 answers 원본 fallback
create or replace function public.survey_excel_text(
  answers_display jsonb,
  answers jsonb,
  qkey text
) returns text
language sql
immutable
as $$
  select nullif(trim(both from coalesce(answers_display->>qkey, answers->>qkey)), '');
$$;

create or replace function public.survey_excel_dual(
  answers_display jsonb,
  answers jsonb,
  qkey text
) returns text
language sql
immutable
as $$
  select coalesce(
    nullif(trim(both from answers_display->>qkey), ''),
    case
      when answers->qkey is null or jsonb_typeof(answers->qkey) <> 'object' then null
      else
        '빈도: ' || coalesce(answers->qkey->>'freq', '-')
        || ' / 영향: ' || coalesce(answers->qkey->>'sev', '-')
    end
  );
$$;

create or replace function public.survey_excel_rankpick(
  answers_display jsonb,
  answers jsonb,
  qkey text
) returns text
language sql
immutable
as $$
  select coalesce(
    nullif(trim(both from answers_display->>qkey), ''),
    case
      when answers->qkey is null or jsonb_typeof(answers->qkey) <> 'object' then null
      else
        '1순위: ' || coalesce(answers->qkey->>'first', '-')
        || ' | 2순위: ' || coalesce(answers->qkey->>'second', '-')
    end
  );
$$;

create or replace function public.survey_excel_f281(
  answers_display jsonb,
  answers jsonb
) returns text
language sql
immutable
as $$
  select coalesce(
    public.survey_excel_text(answers_display, answers, 'F28-1_f28_roi'),
    public.survey_excel_text(answers_display, answers, 'F28-1_f28_staff'),
    public.survey_excel_text(answers_display, answers, 'F28-1_f28_mgmt'),
    public.survey_excel_text(answers_display, answers, 'F28-1_f28_data'),
    public.survey_excel_text(answers_display, answers, 'F28-1_f28_security'),
    public.survey_excel_text(answers_display, answers, 'F28-1_f28_dup'),
    public.survey_excel_text(answers_display, answers, 'F28-1_f28_change'),
    public.survey_excel_text(answers_display, answers, 'F28-1_f28_ref'),
    public.survey_excel_text(answers_display, answers, 'F28-1_f28_vendor')
  );
$$;

drop view if exists public.v_survey_responses_excel;

create or replace view public.v_survey_responses_excel as
select
  r.id,
  r.submission_uid,
  r.created_at,
  r.submitted_at,
  r.email,
  r.company,
  r.job_title,
  r.phone,
  r.score,
  r.grade,
  r.grade_code,
  r.grade_internal,
  r.duration_seconds,
  r.attention_passed,
  r.survey_version,
  r.scoring_config_version,
  r.psm_inconsistent,
  r.email_status,
  r.consent_required,
  r.marketing_opt_in,
  coalesce(r.answers_display, r.answers) as answers_readable,

  -- A. 프로파일 (1~6, 6-1)
  public.survey_excel_text(r.answers_display, r.answers, 'A1') as "1_주력사업",
  public.survey_excel_text(r.answers_display, r.answers, 'A2') as "2_근로자수",
  public.survey_excel_text(r.answers_display, r.answers, 'A3') as "3_보유인증",
  public.survey_excel_text(r.answers_display, r.answers, 'A4') as "4_주요고객",
  public.survey_excel_text(r.answers_display, r.answers, 'A5') as "5_응답자직무",
  public.survey_excel_text(r.answers_display, r.answers, 'A6') as "6_의사결정관여도",
  public.survey_excel_text(r.answers_display, r.answers, 'A6-1') as "6-1_예산결정경험",

  -- B. 운영 현황 (7~13, 10-1)
  public.survey_excel_text(r.answers_display, r.answers, 'B1') as "7_심사회수",
  public.survey_excel_text(r.answers_display, r.answers, 'B2') as "8_업무일치지적",
  public.survey_excel_text(r.answers_display, r.answers, 'B2-1') as "8-1_지적영역",
  public.survey_excel_text(r.answers_display, r.answers, 'B2-2') as "8-2_어긋남이유",
  public.survey_excel_text(r.answers_display, r.answers, 'B3') as "9_출하불합격클레임",
  public.survey_excel_text(r.answers_display, r.answers, 'B3A') as "10_불량재작업폐기율",
  public.survey_excel_text(r.answers_display, r.answers, 'q10_basis') as "10-1_불량기준",
  public.survey_excel_text(r.answers_display, r.answers, 'B4') as "11_CAPA소요기간",
  public.survey_excel_text(r.answers_display, r.answers, 'B6') as "12_유사불량재발",
  public.survey_excel_text(r.answers_display, r.answers, 'B7') as "13_심사준비공수",

  -- C. Pain·우선순위 (14~20, 20-1, 20-2)
  public.survey_excel_dual(r.answers_display, r.answers, 'P14') as "14_납기Pain",
  public.survey_excel_dual(r.answers_display, r.answers, 'P15') as "15_불량CAPA_Pain",
  public.survey_excel_text(r.answers_display, r.answers, 'P15-1') as "15-1_불량세부작업",
  public.survey_excel_dual(r.answers_display, r.answers, 'P16') as "16_생산성Pain",
  public.survey_excel_dual(r.answers_display, r.answers, 'P17') as "17_AuditPain",
  public.survey_excel_dual(r.answers_display, r.answers, 'P18') as "18_데이터Pain",
  public.survey_excel_dual(r.answers_display, r.answers, 'C_ATT') as "19_주의문항",
  public.survey_excel_rankpick(r.answers_display, r.answers, 'Q20') as "20_시스템우선순위",
  public.survey_excel_text(r.answers_display, r.answers, 'Q20-1') as "20-1_시스템필요이유",
  public.survey_excel_text(r.answers_display, r.answers, 'Q20-2') as "20-2_아키텍처선호",

  -- D. 근본원인 (21~24, 22-1)
  public.survey_excel_text(r.answers_display, r.answers, 'D1') as "21_품질전담인원",
  public.survey_excel_text(r.answers_display, r.answers, 'D3') as "22_절차불이행원인",
  public.survey_excel_text(r.answers_display, r.answers, 'D3-1') as "22-1_실정불일치영역",
  public.survey_excel_text(r.answers_display, r.answers, 'D4') as "23_컨설팅경험",
  public.survey_excel_text(r.answers_display, r.answers, 'D5') as "24_시급업무",

  -- E. IT·데이터 (25~26, 25-1~25-3)
  public.survey_excel_text(r.answers_display, r.answers, 'E25') as "25_IT관리방식",
  public.survey_excel_text(r.answers_display, r.answers, 'E25-1') as "25-1_수기유지이유",
  public.survey_excel_text(r.answers_display, r.answers, 'E25-2') as "25-2_운영시스템",
  public.survey_excel_text(r.answers_display, r.answers, 'E25-3') as "25-3_배포형태",
  public.survey_excel_text(r.answers_display, r.answers, 'E26') as "26_데이터반출제약",

  -- F. 솔루션·구매 (27~34, 28-1, 29-1~29-2, 32-1)
  public.survey_excel_text(r.answers_display, r.answers, 'F27') as "27_기능도움정도",
  public.survey_excel_text(r.answers_display, r.answers, 'F28') as "28_도입장애TOP3",
  public.survey_excel_f281(r.answers_display, r.answers) as "28-1_장애DeepDive",
  public.survey_excel_text(r.answers_display, r.answers, 'F29') as "29_PoC의향",
  public.survey_excel_text(r.answers_display, r.answers, 'F29-1') as "29-1_유료전환조건",
  public.survey_excel_text(r.answers_display, r.answers, 'F29-2') as "29-2_의사결정구조",
  public.survey_excel_text(r.answers_display, r.answers, 'F30') as "30_월구독PSM",
  public.survey_excel_text(r.answers_display, r.answers, 'F31') as "31_PoC비용수용",
  public.survey_excel_text(r.answers_display, r.answers, 'F32') as "32_구독의향",
  public.survey_excel_text(r.answers_display, r.answers, 'F32-1') as "32-1_PoC검증KPI",
  public.survey_excel_text(r.answers_display, r.answers, 'F33') as "33_자유의견",
  public.survey_excel_text(r.answers_display, r.answers, 'F34') as "34_무료자문신청"

from public.survey_responses r;

comment on view public.v_survey_responses_excel is
  'v03 설문 응답 Excel/Table Editor용 — answers_display 한글 라벨 우선';

-- 적용 확인 (기대: v03 행에서 14_납기Pain 등 null 아님)
-- select survey_version, "14_납기Pain", "20_시스템우선순위", "25_IT관리방식"
-- from public.v_survey_responses_excel
-- order by created_at desc
-- limit 5;
