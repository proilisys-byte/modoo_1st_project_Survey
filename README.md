# PRO ALI SMART 설문조사 랜딩페이지

반도체·중소 제조기업 품질운영 Pain Point 심층 진단 설문 웹앱.
`PRO_ALI_SMART_설문조사_설계서.md`(v1) 기준으로 구현되었습니다.

## 기술 스택

- Next.js 15 (App Router) + React 19 + TypeScript
- Tailwind CSS v4
- Supabase (응답 저장)

## 실행 방법

```bash
npm install
npm run dev     # http://localhost:3000
npm run build   # 프로덕션 빌드
```

## Supabase 연동 (선택)

1. Supabase 프로젝트 생성 후 SQL Editor에서 `supabase/schema.sql` 실행
2. `.env.example`을 복사해 `.env.local` 생성, URL과 anon key 입력
3. 재시작하면 제출 시 `survey_responses` 테이블에 저장됩니다

환경변수가 없으면 **로컬 미리보기 모드**로 동작합니다 — 설문·진단 결과는 정상 작동하지만 서버 저장은 되지 않으며, 결과 화면에 안내가 표시됩니다.

## 구현된 기능 (설계서 11절 기준)

- 인트로(설계서 3절 문안 + 개인정보 동의) → 섹션 A~E 스텝 진행(진행률 바) → 마무리(연락처) → 즉시 결과 페이지
- 모바일 우선 반응형 UI (PC에서도 최대 폭 제한으로 가독성 유지)
- 섹션별 이탈 저장 — localStorage 기반, 재방문 시 "이어서 진단하기"
- 섹션 C 빈도(1~5) × 업무 영향도(1~5) 2단 선택 UI + 섹션 상단 척도 기준표 상시 표시
- 주의 확인 문항(C4~C5 사이) — 빈도 2 미선택 시 `attention_passed=false`로 저장(분석 제외용)
- 응답 소요 시간 기록 (`duration_seconds`)
- 즉시 결과: ISO 실행력 점수(100점, 10.1절 4개 축) · 등급(10.4절) · 리스크 TOP 3(Pain Score 상위) · 액션 플랜
- E3/E6 응답에 따른 연락처 필수 전환 (설계서 9절)

## 설계서(v1) 대비 변경 사항

- A3 인증 선택지에 "ESG 관련 인증·평가", "ISO 53001 (ESG 경영시스템)" 추가
- B3A 신설 — 불량·재작업·폐기 비율 문항 (분석용 수집, 100점 스코어링에는 미반영)
- C4 문안을 사건 기반 표현으로 수정 (발생 빈도 척도와 정합)
- C9 강제 선택 2개 → 3개, 한도 초과 시 자동 해제 대신 안내 메시지 표시
- D2A 신설 — 현장·품질 혁신활동(5S·3정·TPM·TQM·6시그마·Kaizen 등) 복수 선택, "없음"은 배타 선택
- 결과 페이지 문구를 실무자 친화적 한국어로 재작성 (리스크 TOP 3 포함)
- 등급 저장 분리: `grade`(화면 문구) + `grade_code`(A/B/C/D) + `grade_internal`(정식 등급명)
- 결과 페이지 CTA 추가: 무료 현장 진단(선정 3곳 한정)·전문가 상담·유료 PoC 신청 → `cta_requests` 테이블 저장, `submission_uid`로 설문 응답과 연결

## 점수 산출 로직 문서

결과 페이지의 영역별 점수·등급·리스크 계산 방식은 `docs/결과페이지_점수_로직.md`에 정리되어 있습니다.

## 폴더 구조

```
app/            레이아웃·페이지·전역 스타일
components/     SurveyApp(메인 흐름), QuestionBlock(문항 렌더러), ResultView, ui
lib/            questions.ts(33문항 정의), scoring.ts(점수·등급·리스크), supabase.ts
supabase/       schema.sql (응답 테이블 + RLS 정책)
```

## 범위 외 (후속 작업)

- 관리자 대시보드 (응답 수·Pain Score 순위·리드 등급·CSV)
- 상세 리포트 이메일 자동 발송
