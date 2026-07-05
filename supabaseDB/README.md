# Supabase DB 구축 키트

> `docs/DB_구현_정의서.md` 기반으로 Supabase DB를 처음부터 구축하기 위한 실행 파일 모음입니다.
> SQL은 모두 **멱등(여러 번 실행해도 안전)** 하게 작성되어 있습니다.

## 파일 구성

| 파일 | 용도 | 실행 순서 |
| --- | --- | --- |
| `01_schema.sql` | 테이블 2개 + 인덱스 생성 | 1 |
| `02_rls_policies.sql` | RLS 활성화 + anon insert 전용 정책 | 2 |
| `03_verify.sql` | 구축 결과 검증 (테이블·RLS·정책 확인) | 3 |
| `99_reset.sql` | ⚠️ 전체 삭제 (재구축용, 데이터 파괴) | 필요 시에만 |

## 구축 절차

### 1단계 — Supabase 프로젝트 생성

1. [supabase.com](https://supabase.com) 로그인 → **New Project**
2. 설정값:
   - **Region**: `Northeast Asia (Seoul)` 권장
   - **Database Password**: 생성 후 안전한 곳에 보관 (코드·Git에 저장 금지)
3. 프로젝트 생성 완료까지 1~2분 대기

### 2단계 — 테이블·보안 정책 생성

1. Supabase Dashboard → 좌측 **SQL Editor** → **New query**
2. `01_schema.sql` 내용 전체를 붙여넣고 **Run**
3. 같은 방법으로 `02_rls_policies.sql` 실행
4. `03_verify.sql` 실행 → 아래 기대 결과와 대조:
   - 테이블 2개(`survey_responses`, `cta_requests`) 존재
   - 두 테이블 모두 `rls_enabled = true`
   - 정책 2개(INSERT, anon) 존재

### 3단계 — 연결 키 확보

1. Dashboard → **Project Settings** → **API**
2. 다음 2개 값 복사:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** 키 → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. ⚠️ `service_role` 키는 **절대 사용하지 않습니다** (서버 전용, 클라이언트 노출 금지)

### 4단계 — Vercel 환경변수 등록

1. Vercel Dashboard → 프로젝트 → **Settings → Environment Variables**
2. 아래 2개를 **Production, Preview** 스코프로 추가:

| Name | Value |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | 3단계의 Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 3단계의 anon public 키 |

3. **Deployments → 최신 배포 → Redeploy** 실행
   (`NEXT_PUBLIC_*`은 빌드 시점에 인라인되므로 재배포 필수)

### 5단계 — 동작 검증

- [ ] https://survey.proali.kr/ 에서 설문을 끝까지 제출
- [ ] 결과 페이지에 "응답이 서버에 저장되지 않았습니다" 경고가 **없는지** 확인
- [ ] Dashboard → **Table Editor** → `survey_responses`에 행 생성 확인
- [ ] 결과 페이지에서 CTA(무료진단 등) 신청 → `cta_requests`에 행 생성 확인
- [ ] `answers` 컬럼에 문항 응답 JSON이 온전히 들어있는지 확인

### 로컬 개발 연결 (선택)

`.env.example`을 복사해 `.env.local` 생성 후 3단계의 값 입력:

```
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-public-key>
```

`.env.local`은 gitignore 대상이므로 커밋되지 않습니다. 미설정 시 로컬 미리보기 모드(저장 없이 UI 동작)로 실행됩니다.

## 스키마 변경 시

1. `01_schema.sql`(및 원본 `supabase/schema.sql`)을 **멱등하게** 수정
2. SQL Editor에서 재실행
3. 변경 파일 커밋 — Git의 SQL = 운영 DB 스키마가 되도록 유지

컬럼 추가는 nullable/default로, 삭제·rename은 코드가 참조하지 않음을 확인한 다음 릴리스에서 진행합니다
(expand/contract 원칙 — `docs/DB_구현_정의서.md` §7 참조).
