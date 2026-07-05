# 설문 앱 DB 구현 정의서

> **목적**: 본 프로젝트(PRO ALI SMART 설문 랜딩페이지)의 DB 구현 방식을 정의한다.
> 범용 스펙 문서인 [`DB_SPEC_DEFINITION.md`](./DB_SPEC_DEFINITION.md)를 참고 기준으로 삼되,
> 본 프로젝트의 규모·요구사항에 맞게 **간소화한 구현**을 채택한 이유와 내용을 기록한다.
>
> 실제 코드: `lib/supabase.ts`(클라이언트·저장 함수), `supabase/schema.sql`(테이블·보안 정책)

---

## 1. 아키텍처 개요 — 범용 스펙과의 관계

범용 스펙(`DB_SPEC_DEFINITION.md`)은 **Prisma ORM + 로컬 Supabase CLI + 마이그레이션 자동화** 파이프라인을 정의한다.
본 프로젝트는 그중 **환경변수 체계·보안 규칙·환경 분리 원칙은 그대로 따르고**, ORM·마이그레이션 계층은 채택하지 않았다.

| 구분 | 범용 스펙 (DB_SPEC_DEFINITION.md) | 본 프로젝트 채택 | 사유 |
| --- | --- | --- | --- |
| DB 접근 방식 | Prisma ORM (서버 사이드) | `@supabase/supabase-js` (클라이언트 사이드) | 쓰기 2종(insert)뿐인 단순 워크로드 |
| 연결 URL | `DATABASE_URL` + `DIRECT_URL` (풀러/직결 분리) | 불필요 — REST API 경유 | 서버에서 직접 PostgreSQL 연결 안 함 |
| 스키마 관리 | Prisma 마이그레이션 (`prisma/migrations/`) | `supabase/schema.sql` 수동 실행 | 테이블 2개, 변경 빈도 낮음 |
| 로컬 DB | Supabase CLI (Docker) | 없음 — "로컬 미리보기 모드" | 환경변수 미설정 시 저장 없이 UI 동작 |
| 접근 제어 | 서버 코드에서 통제 | **RLS(Row Level Security) 정책** | anon 키가 브라우저에 노출되는 구조의 필수 방어선 |
| 배포 | Vercel Git 연동 | 동일 (main push → 자동 배포) | 스펙 §8과 동일 |

**전환 기준**: 관리자 대시보드, 서버 사이드 집계 쿼리, 이메일 발송 파이프라인 등
**서버에서 DB를 읽는 요구**가 생기면 범용 스펙의 Prisma 구성(§5~§6)으로 전환한다. (→ §8 로드맵)

---

## 2. 기술 스택

| 구성 요소 | 기술 | 비고 |
| --- | --- | --- |
| Framework | Next.js 15 (App Router) + React 19 | 전 페이지 정적(Static) 생성 |
| Package Manager | npm | 범용 스펙은 pnpm이나 본 프로젝트는 npm 유지 |
| DB | Supabase Cloud (PostgreSQL) | 호스티드만 사용, 로컬 인스턴스 없음 |
| DB 클라이언트 | `@supabase/supabase-js` v2 | 브라우저에서 REST API로 insert |
| 배포 | Vercel (main push 자동 배포) | https://survey.proali.kr/ |

---

## 3. 환경 모델

범용 스펙 §2의 3-tier 원칙을 본 프로젝트 규모에 맞게 2-tier로 축소한다.

| 계층 | DB | 동작 |
| --- | --- | --- |
| **Local** | 없음 | 환경변수 미설정 → `getSupabase()`가 `null` 반환 → **로컬 미리보기 모드** (설문·진단 정상, 저장만 생략) |
| **Production / Preview** | Supabase Cloud (공유) | anon 키로 insert. Preview 분리는 실데이터 적재 후 검토 |

**로컬 미리보기 모드**는 범용 스펙의 "로컬 Docker DB" 대신 채택한 장치다.
DB 없이도 전체 UI 흐름을 검증할 수 있고, 저장 실패가 사용자 흐름을 막지 않는다.

```ts
// lib/supabase.ts — 환경변수가 있을 때만 클라이언트 생성
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
client = url && key ? createClient(url, key) : null;
```

---

## 4. 테이블 정의

스키마 원본: `supabase/schema.sql` (Supabase SQL Editor에서 실행)

### 4.1 `survey_responses` — 설문 응답

| 컬럼 | 타입 | 설명 |
| --- | --- | --- |
| `id` | uuid PK | `gen_random_uuid()` |
| `created_at` | timestamptz | 제출 시각 |
| `submission_uid` | text | 클라이언트 발급 UID — `cta_requests`와 연결 키 |
| `answers` | jsonb | 전체 문항 응답 (문항 id → 값). 문항 추가 시 스키마 변경 불필요 |
| `email` | text NOT NULL | 응답자 이메일 |
| `company` / `phone` | text | 선택 입력 |
| `score` | integer NOT NULL | ISO 실행력 점수 (100점 만점) |
| `grade` | text NOT NULL | 화면 표시용 등급 문구 |
| `grade_code` | text NOT NULL | 분석용 등급 코드 (A/B/C/D) |
| `grade_internal` | text | 설계서 10.4 정식 등급명 |
| `pain_scores` | jsonb | C1~C8 Pain Score (빈도×영향도, 1~25) |
| `attention_passed` | boolean | 주의 확인 문항(C_ATT) 통과 여부 — false면 분석 제외 |
| `duration_seconds` | integer | 응답 소요 시간 |
| `user_agent` | text | 브라우저 정보 |

### 4.2 `cta_requests` — 결과 페이지 신청 (무료진단·상담·PoC)

| 컬럼 | 타입 | 설명 |
| --- | --- | --- |
| `id` / `created_at` | uuid PK / timestamptz | 동일 패턴 |
| `submission_uid` | text | `survey_responses.submission_uid`와 연결 |
| `cta_type` | text NOT NULL | `free_diagnosis` \| `consulting` \| `poc` |
| `email` / `company` / `phone` | text | 신청자 연락처 (email만 NOT NULL) |
| `score` / `grade_code` | integer / text | 신청 시점의 진단 결과 스냅샷 |

**조인 키 설계**: FK 제약 대신 `submission_uid`(클라이언트 발급 UUID)로 느슨하게 연결한다.
설문 저장이 실패해도 CTA 신청은 독립적으로 저장될 수 있어야 하기 때문이다(리드 유실 방지).

### 4.3 `answers`를 jsonb로 두는 이유

문항(현재 37개)이 마케팅 필요에 따라 수시로 바뀐다. 문항별 컬럼 대신 jsonb 하나에 저장하면
문항 추가·삭제 시 **DB 마이그레이션이 필요 없다**. 분석이 필요한 파생값(점수·등급·Pain Score)만
별도 컬럼으로 뽑아 두었다. 특정 문항을 SQL로 조회할 때는 `answers->>'E3'` 형태로 접근한다.

---

## 5. 보안 — RLS 정책

anon 키는 `NEXT_PUBLIC_*`으로 **브라우저에 노출되는 것이 전제**다. 따라서 접근 제어는 전적으로 RLS가 담당한다.

```sql
alter table public.survey_responses enable row level security;

create policy "anon can insert responses"
  on public.survey_responses for insert to anon with check (true);
```

| 작업 | anon 키 (브라우저) | service_role 키 / 대시보드 |
| --- | --- | --- |
| INSERT | ✅ 허용 (두 테이블 모두) | ✅ |
| SELECT / UPDATE / DELETE | ❌ **차단** (정책 없음 = 거부) | ✅ |

- 응답 **조회·수정·삭제는 Supabase 대시보드 또는 service_role 키에서만** 가능하다.
- `service_role` 키는 절대 클라이언트 코드·Git에 넣지 않는다 (범용 스펙 §19 보안 규칙 준수).
- 알려진 한계: anon insert가 열려 있어 **스팸 삽입이 이론상 가능**하다. 대량 홍보 전에
  rate limit(Vercel Edge Middleware) 또는 캡차 도입을 검토한다.

---

## 6. 환경변수

범용 스펙 §7·§8의 체계를 따르되, 변수는 2개뿐이다.

| 변수명 | 노출 범위 | 로컬 (`.env.local`) | Vercel (Production/Preview) |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | 클라이언트 공개 | 미설정 가능 (미리보기 모드) | Supabase Project Settings → API의 URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 클라이언트 공개 | 미설정 가능 (미리보기 모드) | 같은 곳의 anon public 키 |

- `.env.example`이 템플릿이며, 실제 값은 `.env.local`(gitignore 대상)에만 둔다.
- `NEXT_PUBLIC_*`은 **빌드 시점에 번들에 인라인**되므로, Vercel에서 값 변경 후 반드시 **Redeploy**해야 반영된다.
- 범용 스펙의 `DATABASE_URL`/`DIRECT_URL`은 서버 직결이 없으므로 사용하지 않는다.

---

## 7. 스키마 변경(마이그레이션) 절차

Prisma 마이그레이션 대신 **`supabase/schema.sql` 단일 파일 + 멱등 SQL** 방식을 쓴다.

1. `supabase/schema.sql`을 수정한다 — 반드시 **멱등하게** 작성한다:
   - `create table if not exists` / `add column if not exists`
   - `drop policy if exists` 후 `create policy`
2. Supabase Dashboard → SQL Editor에서 파일 전체를 붙여넣고 실행한다 (여러 번 실행해도 안전).
3. 변경된 `schema.sql`을 커밋한다 — **Git의 schema.sql = 운영 DB 스키마**가 단일 진실이 되도록 유지한다.

범용 스펙 §12의 **expand/contract 원칙은 동일하게 적용**한다:
- 컬럼 추가는 nullable 또는 default로 (배포 전 코드와 호환 유지)
- 컬럼 삭제·rename은 코드가 더 이상 참조하지 않는 것을 확인한 다음 릴리스에서
- 실데이터가 쌓인 후의 파괴적 변경은 백업(Supabase Dashboard → Database → Backups) 확인 후 진행

---

## 8. 향후 로드맵 — 범용 스펙으로의 전환 시점

다음 요구가 생기면 해당 단계의 범용 스펙 구성을 도입한다.

| 트리거 | 도입할 것 | 범용 스펙 참조 |
| --- | --- | --- |
| 관리자 대시보드 (응답 조회·집계·CSV) | 서버 사이드 DB 접근 — Prisma + `DATABASE_URL`/`DIRECT_URL`, 또는 supabase-js server client + service_role | §5, §6, §9 |
| 이메일 리포트 자동 발송 | API Route(서버) + 발송 서비스(Resend 등) + 발송 이력 테이블 | §13 (헬스체크 패턴) |
| 스키마 변경 빈도 증가 | Prisma 마이그레이션 + 로컬 Supabase CLI | §4, §5, §10, §11 |
| 팀 개발·CI 도입 | GitHub Actions 마이그레이션 자동화 | §10.4 |
| 스팸·어뷰징 발생 | rate limit, 캡차, `attention_passed` 기반 필터링 강화 | — |

---

## 9. 운영 체크리스트

**최초 연결 시 (1회)**
- [ ] Supabase 프로젝트 생성 (region: Seoul 권장, DB 비밀번호 안전 보관)
- [ ] SQL Editor에서 `supabase/schema.sql` 전체 실행
- [ ] Vercel 환경변수 2개 등록 (Production + Preview 스코프)
- [ ] Redeploy 후 실제 설문 제출 → Table Editor에서 `survey_responses` 행 확인
- [ ] 결과 페이지 CTA 신청 → `cta_requests` 행 확인
- [ ] 브라우저 콘솔에서 anon 키로 SELECT 시도 → 거부되는지 확인 (RLS 검증)

**평시 운영**
- [ ] 응답·신청 확인: Supabase Table Editor (CSV 내보내기 가능)
- [ ] `attention_passed = false` 응답은 분석에서 제외
- [ ] CTA 신청 누락 방지: 주기 확인 또는 Database Webhook으로 알림 연동
