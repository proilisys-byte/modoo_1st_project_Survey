# App ↔ DB Integration Spec Definition

> **목적**: Next.js(App Router) + Prisma ORM + PostgreSQL + Supabase(로컬 CLI / 호스티드 Cloud) + Vercel 배포 환경에서의 DB 연동 스펙을 **도메인 비의존적**으로 정의한다. 새 프로젝트를 시작할 때 이 문서를 그대로 적용하면 로컬 개발부터 운영 배포까지의 DB 파이프라인이 구성된다.

---

## 1. 기술 스택 및 버전

| 구성 요소 | 기술 | 버전 (최소) | 비고 |
| --- | --- | --- | --- |
| Runtime | Node.js | 24.x | `.nvmrc`로 고정 |
| Package Manager | pnpm | 9.x | `package.json`의 `packageManager` 필드 |
| Framework | Next.js (App Router) | 16.x | `next.config.ts` |
| ORM | Prisma | 6.x | `@prisma/client` (런타임), `prisma` (devDep, CLI) |
| DB Engine | PostgreSQL | 17 | Supabase CLI의 `config.toml`에서 `major_version` 지정 |
| 로컬 DB | Supabase CLI (Docker) | latest (`pnpm dlx supabase`) | PostgreSQL + 최소 서비스 |
| 호스티드 DB | Supabase Cloud | — | Transaction Pooler + Direct Connection |
| 배포 플랫폼 | Vercel | — | Git 연동 자동배포 |
| 환경변수 검증 | Zod | 4.x | `lib/env.ts`에서 런타임 스키마 검증 |
| CI/CD | GitHub Actions | — | prod 마이그레이션 자동화 |

---

## 2. 환경 모델 (3-tier)

로컬·Preview·Production 세 계층으로 분리한다. **로컬은 호스티드와 완전히 분리된 별도 DB 인스턴스**이다.

| 계층 | DB 인스턴스 | 앱 URL | 마이그레이션 적용 방법 |
| --- | --- | --- | --- |
| **Local** | Supabase CLI (Docker, `127.0.0.1:54322`) | `http://localhost:3000` | `pnpm db:migrate` (자유롭게) |
| **Preview** | 호스티드 Supabase (Production과 공유¹) | PR별 Vercel Preview URL | 별도 적용 안 함 (prod 스키마 공유) |
| **Production** | 호스티드 Supabase | Production URL | main 머지 시 GitHub Action 자동 `db:deploy` |

> ¹ 초기에는 Preview와 Production이 같은 DB를 공유한다. 실 사용자 데이터가 적재되기 시작하면 Preview용 별도 Supabase 프로젝트로 분리한다.

**핵심 원칙**: dev/prod 패리티는 "같은 엔진(PostgreSQL) + 같은 스키마"를 뜻하지, 같은 인스턴스를 공유한다는 뜻이 아니다.

---

## 3. 프로젝트 구조 (DB 관련 파일 맵)

```
<project-root>/
├── .env                        # 로컬 Supabase 기본값 (gitignore 대상)
├── .env.example                # 커밋 대상 — 로컬 기본값 템플릿
├── .env.local                  # Vercel CLI가 생성 (gitignore 대상)
├── .gitignore                  # .env, .env.local, .env.*.local 포함
├── prisma/
│   ├── schema.prisma           # Prisma 스키마 (SoT)
│   ├── migrations/             # Prisma 마이그레이션 SQL 디렉토리
│   │   ├── <timestamp>_<name>/ # 각 마이그레이션 (migration.sql)
│   │   └── migration_lock.toml # provider lock (postgresql)
│   └── seed.mjs                # 시드 스크립트 진입점
├── prisma.config.ts            # Prisma 설정 (schema 경로, seed 명령)
├── lib/
│   ├── db.ts                   # PrismaClient 싱글턴 팩토리
│   ├── env.ts                  # 환경변수 Zod 스키마 + getter 함수
│   └── health.ts               # DB 헬스체크 로직
├── app/
│   └── api/health/route.ts     # GET /api/health — DB 연결 검증 엔드포인트
├── scripts/
│   ├── db/
│   │   ├── guarded-migrate.mjs # 로컬 전용 마이그레이션 가드
│   │   └── test-integration-local.mjs  # 통합테스트 원스텝 러너
│   ├── load-env.ts             # CLI 스크립트용 .env 로더
│   ├── sync-env.mjs            # 워크트리 간 .env 복사
│   └── validate-env.mjs        # 빌드 시 환경변수 사전검증
├── supabase/
│   └── config.toml             # Supabase CLI 로컬 설정
├── vercel.json                 # Vercel 빌드/설치 명령
├── .github/
│   └── workflows/
│       └── migrate-prod.yml    # prod 마이그레이션 자동화 Action
└── package.json                # npm scripts (db:*, 빌드 훅)
```

---

## 4. Supabase CLI — 로컬 PostgreSQL

### 4.1 `supabase/config.toml` 설정

```toml
project_id = "<project-name>"

[api]
enabled = true
port = 54321
schemas = ["public", "graphql_public"]
extra_search_path = ["public", "extensions"]
max_rows = 1000

[db]
port = 54322
shadow_port = 54320
major_version = 17

[db.pooler]
enabled = false
port = 54329
pool_mode = "transaction"
default_pool_size = 20
max_client_conn = 100

[studio]
enabled = false
port = 54323

[auth]
enabled = false

[storage]
enabled = false
```

**설계 결정**:
- **DB만 사용**: `studio`, `auth`, `storage` 등 Supabase 부가 서비스는 비활성화. Supabase를 PostgreSQL 컨테이너 러너로만 활용한다.
- **Shadow DB**: Prisma `migrate dev`가 diff를 계산할 때 사용하는 shadow DB용 포트(`54320`)를 별도 지정한다.
- **Pooler 비활성**: 로컬에서는 connection pooling이 불필요하다.

### 4.2 `pnpm db:start` — 최소 서비스 기동

```jsonc
// package.json scripts
"db:start": "pnpm dlx supabase start --exclude edge-runtime,gotrue,imgproxy,kong,logflare,mailpit,postgres-meta,postgrest,realtime,storage-api,studio,supavisor,vector"
```

`--exclude`로 PostgreSQL 외 모든 Supabase 서비스를 제외한다. Docker 리소스를 절약하면서 Prisma가 필요로 하는 PostgreSQL만 기동한다.

### 4.3 로컬 DB 생명주기

| 명령 | 동작 | 데이터 |
| --- | --- | --- |
| `pnpm db:start` | Docker 컨테이너 기동 (멱등) | 볼륨 보존 |
| `pnpm db:stop` | 컨테이너 중지 | 볼륨 **보존** (재시작 시 복원) |
| `pnpm db:clean` | 컨테이너 중지 + 볼륨 삭제 | **완전 초기화** |
| `pnpm db:reset` | `prisma migrate reset` | 드롭→전 마이그레이션 재적용→seed |

> `pnpm dev`의 `predev` 훅이 `pnpm db:start || true`를 자동 실행한다. Docker가 떠 있으면 즉시 성공, 꺼져 있으면 조용히 실패하고 앱만 기동된다.

---

## 5. Prisma ORM 설정

### 5.1 `prisma.config.ts`

```ts
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    seed: "node prisma/seed.mjs",
  },
});
```

> `prisma.config.ts`가 있으면 Prisma CLI는 `.env`를 자동 로드하지 않는다. 환경변수 로드는 래퍼 스크립트(`guarded-migrate.mjs`, `load-env.ts`)가 담당한다.

### 5.2 `prisma/schema.prisma` — datasource 설정

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}

// 도메인 모델은 이 아래에 정의한다.
// model Example {
//   id        String   @id @default(cuid())
//   createdAt DateTime @default(now())
//   updatedAt DateTime @updatedAt
// }
```

**두 URL의 역할**:

| 변수 | 용도 | 로컬 값 | 호스티드 값 |
| --- | --- | --- | --- |
| `DATABASE_URL` | **런타임 쿼리** (앱이 SELECT/INSERT 등에 사용) | `postgresql://postgres:postgres@127.0.0.1:54322/postgres?schema=public` | Supabase Transaction Pooler (포트 `6543`, `pgbouncer=true&connection_limit=1`) |
| `DIRECT_URL` | **마이그레이션 적용** (DDL, advisory lock) | 로컬에서는 `DATABASE_URL`과 동일 | Supabase Direct Connection (포트 `5432`) |

> **왜 분리하는가**: Supabase Cloud의 Transaction Pooler(PgBouncer)는 prepared statement·advisory lock을 지원하지 않아 DDL(마이그레이션)에 부적합하다. Prisma는 `directUrl`이 설정되면 마이그레이션 시 이것을 우선 사용한다.

### 5.3 Prisma 두 축 (혼동 금지)

| 명령 | 대상 | 하는 일 | DB 접근 |
| --- | --- | --- | --- |
| `prisma generate` | **코드(타입)** | `schema.prisma` → `@prisma/client` 타입/코드 생성 | **안 함** |
| `prisma migrate dev` | **DB(스키마)** | 마이그레이션 파일 생성 + shadow DB diff + 적용 + generate + seed | O (로컬 전용) |
| `prisma migrate deploy` | **DB(스키마)** | 미적용분만 순서대로 적용 (새 파일 생성 없음) | O (운영 안전) |
| `prisma migrate reset` | **DB(스키마)** | 전체 드롭 → 모든 마이그레이션 재적용 → seed | O (로컬 전용, 파괴적) |

---

## 6. PrismaClient 싱글턴 패턴 (`lib/db.ts`)

```ts
import { PrismaClient } from "@prisma/client";
import { getServerEnv } from "@/lib/env";

type PrismaGlobal = typeof globalThis & {
  __prisma?: PrismaClient;
};

const prismaGlobal = globalThis as PrismaGlobal;

export function createPrismaClient() {
  const { DATABASE_URL } = getServerEnv();

  return new PrismaClient({
    datasources: {
      db: {
        url: DATABASE_URL,
      },
    },
  });
}

export function getPrismaClient() {
  if (process.env.NODE_ENV === "production") {
    return createPrismaClient();
  }

  // 개발 환경: HMR로 모듈이 재실행되어도 커넥션 누수 방지
  prismaGlobal.__prisma ??= createPrismaClient();
  return prismaGlobal.__prisma;
}

export const prisma = getPrismaClient();
```

**설계 결정**:
- **Production**: 매번 새 인스턴스 생성. Vercel Serverless 환경에서는 각 함수 호출이 독립적이므로 글로벌 캐싱이 의미 없다.
- **Development**: `globalThis`에 캐싱. Next.js HMR이 모듈을 재평가해도 `PrismaClient` 인스턴스가 재생성되지 않아 connection pool 누수를 방지한다.
- **`getServerEnv()`**: 환경변수를 Zod로 런타임 검증한 뒤 `DATABASE_URL`을 주입한다.

---

## 7. 환경변수 체계

### 7.1 환경변수 목록

| 변수명 | 필수 | 로컬 (`.env`) | Vercel (호스티드) | 설명 |
| --- | --- | --- | --- | --- |
| `DATABASE_URL` | Yes | `postgresql://postgres:postgres@127.0.0.1:54322/postgres?schema=public` | Supabase Transaction Pooler URL | 런타임 쿼리용 |
| `DIRECT_URL` | Yes | (DATABASE_URL과 동일) | Supabase Direct Connection URL | 마이그레이션 DDL용 |
| `NEXT_PUBLIC_APP_URL` | Yes (호스티드) | `http://localhost:3000` | Production/Preview URL | 서버 사이드 canonical URL |
| `NODE_ENV` | 자동 | Next.js가 설정 | Vercel이 설정 | `development` / `production` |
| `VERCEL_ENV` | 자동 | — | Vercel이 설정 | `development` / `preview` / `production` |
| `VERCEL_REGION` | 자동 | — | Vercel이 설정 | 예: `icn1` |
| `VERCEL_BRANCH_URL` | 자동 | — | Vercel이 설정 (Preview) | Preview 배포의 브랜치 URL |

### 7.2 `.env` 파일 전략

```
.env                  ← 로컬 Supabase 기본값 (gitignore 대상)
.env.example          ← 커밋 대상 — 안전한 로컬 기본값 템플릿
.env.local            ← Vercel CLI 생성 (gitignore 대상)
.env.*.local          ← 환경별 로컬 오버라이드 (gitignore 대상)
```

`.gitignore` 규칙:

```gitignore
.env
.env.local
.env.development.local
.env.test.local
.env.production.local
```

> **절대 규칙**: `.env` 또는 connection URL을 Git에 커밋하지 않는다. `.env.example`만 커밋한다.

### 7.3 `.env.example` 템플릿

```env
# Local Supabase PostgreSQL defaults from `supabase start`.
DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:54322/postgres?schema=public"
DIRECT_URL="postgresql://postgres:postgres@127.0.0.1:54322/postgres?schema=public"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

### 7.4 환경변수 Zod 검증 (`lib/env.ts`)

```ts
import { z } from "zod";

const databaseUrlSchema = z
  .string()
  .trim()
  .min(1, "is required")
  .pipe(z.url("must be a valid PostgreSQL URL"))
  .refine(
    (value) => value.startsWith("postgresql://") || value.startsWith("postgres://"),
    { message: "must use a PostgreSQL connection string" },
  );

const serverEnvSchema = z.object({
  DATABASE_URL: databaseUrlSchema,
  DIRECT_URL: databaseUrlSchema,
  NEXT_PUBLIC_APP_URL: z.union([z.url(), z.literal("")]).optional(),
  // 프로젝트별 추가 환경변수는 여기에 확장한다.
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

export function getServerEnv(): ServerEnv {
  const result = serverEnvSchema.safeParse({
    DATABASE_URL: process.env.DATABASE_URL ?? "",
    DIRECT_URL: process.env.DIRECT_URL ?? "",
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  });

  if (!result.success) {
    const message = result.error.issues
      .map((issue) => {
        const name = issue.path.join(".") || "env";
        return issue.message === "is required"
          ? `Missing required env: ${name}`
          : `${name} ${issue.message}`;
      })
      .join("; ");
    throw new Error(`Invalid server environment: ${message}`);
  }

  return result.data;
}
```

**검증 시점**:
- **런타임**: `getServerEnv()`가 호출될 때 (PrismaClient 생성 시, API 라우트 실행 시)
- **빌드**: `prebuild` 훅에서 `scripts/validate-env.mjs`가 사전검증

### 7.5 빌드 시 환경변수 검증 (`scripts/validate-env.mjs`)

```js
const requiredEnvNames = ["DATABASE_URL", "DIRECT_URL", "NEXT_PUBLIC_APP_URL"];
const postgresEnvNames = new Set(["DATABASE_URL", "DIRECT_URL"]);

const errors = requiredEnvNames.flatMap((name) => {
  const value = process.env[name]?.trim() ?? "";
  if (!value) return [`Missing required env: ${name}`];
  // URL 형식 검증
  try { new URL(value); } catch { return [`Invalid env URL: ${name}`]; }
  // PostgreSQL 스키마 프리픽스 검증
  if (
    postgresEnvNames.has(name) &&
    !value.startsWith("postgresql://") &&
    !value.startsWith("postgres://")
  ) {
    return [`Invalid PostgreSQL env: ${name}`];
  }
  return [];
});

if (errors.length > 0) {
  console.error(errors.join("\n"));
  process.exitCode = 1;
}
```

### 7.6 배포 환경 판별 (`lib/env.ts`)

```ts
export type DeploymentEnv = "development" | "preview" | "production";

export function getDeploymentEnv(): DeploymentEnv {
  if (process.env.VERCEL_ENV === "production" || process.env.VERCEL_ENV === "preview") {
    return process.env.VERCEL_ENV;
  }
  return process.env.NODE_ENV === "production" ? "production" : "development";
}

export function getDeploymentRegion(): string {
  return process.env.VERCEL_REGION?.trim() || "local";
}
```

### 7.7 서버 전용 App URL 도출 (`lib/env.ts`)

Preview 배포의 URL은 브랜치/배포마다 다르므로, `NEXT_PUBLIC_APP_URL` 고정값 대신 Vercel 시스템 변수로 런타임 도출한다:

```ts
export function getAppUrl(): string {
  const toHttps = (host?: string) => {
    const trimmed = host?.trim();
    return trimmed ? `https://${trimmed}` : undefined;
  };
  const explicit = process.env.NEXT_PUBLIC_APP_URL?.trim() || undefined;

  // Preview: 시스템 변수를 고정값보다 우선
  if (process.env.VERCEL_ENV === "preview") {
    const previewUrl =
      toHttps(process.env.VERCEL_BRANCH_URL) ?? toHttps(process.env.VERCEL_URL);
    if (previewUrl) return previewUrl;
  }

  // Production: 명시값 → Vercel 시스템 → fallback
  if (process.env.VERCEL_ENV === "production") {
    return explicit
      ?? toHttps(process.env.VERCEL_PROJECT_PRODUCTION_URL)
      ?? "http://localhost:3000";
  }

  // Local
  return explicit ?? "http://localhost:3000";
}
```

| Vercel 시스템 변수 | 예시 | 용도 |
| --- | --- | --- |
| `VERCEL_ENV` | `preview` | 분기 키 |
| `VERCEL_BRANCH_URL` | `<project>-git-<branch>-<scope>.vercel.app` | Preview 브랜치 URL (안정적) |
| `VERCEL_URL` | `<project>-<hash>-<scope>.vercel.app` | 배포별 URL (fallback) |
| `VERCEL_PROJECT_PRODUCTION_URL` | `<project>.vercel.app` | Production URL |

---

## 8. Vercel 환경변수 설정

### 8.1 Vercel Dashboard 설정 (Settings → Environment Variables)

| Name | Value | Production | Preview | Development |
| --- | --- | --- | --- | --- |
| `DATABASE_URL` | Supabase Transaction Pooler URL | ✅ | ✅ | — |
| `DIRECT_URL` | Supabase Direct Connection URL | ✅ | ✅ | — |
| `NEXT_PUBLIC_APP_URL` | Production URL (예: `https://myapp.vercel.app`) | ✅ | ✅ | — |

> **Development 열을 비우는 이유**: 로컬 개발은 Vercel 환경변수가 아니라 `.env`(로컬 Supabase)를 사용한다.

### 8.2 CLI로 설정

```bash
vercel link                                          # 프로젝트 연결
vercel env add DATABASE_URL production               # 값은 stdin
vercel env add DATABASE_URL preview
vercel env add DIRECT_URL production
vercel env add DIRECT_URL preview
vercel env add NEXT_PUBLIC_APP_URL production
vercel env add NEXT_PUBLIC_APP_URL preview
```

### 8.3 `vercel.json`

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "buildCommand": "pnpm build",
  "installCommand": "pnpm install --frozen-lockfile"
}
```

---

## 9. Supabase Cloud — Connection URL 구성

### 9.1 Connection URL 확보

1. Supabase Dashboard → 프로젝트 → 상단 **Connect** 버튼
2. **ORMs** 탭 → Prisma 선택 → `DATABASE_URL`, `DIRECT_URL` 두 줄 제공

또는 **Connection string** 탭에서 직접 선택:

| 모달 라벨 | 포트 | Prisma 변수 | 용도 |
| --- | --- | --- | --- |
| **Transaction pooler** | `6543` | `DATABASE_URL` | 런타임 쿼리 (서버리스 친화) |
| **Session pooler** | `5432` (pooler 호스트) | 사용 안 함 | — |
| **Direct connection** | `5432` (DB 호스트) | `DIRECT_URL` | 마이그레이션 DDL 전용 |

### 9.2 URL 가공 규칙

```
DATABASE_URL=postgresql://postgres.<ref>:<password>@aws-0-<region>.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1&schema=public
DIRECT_URL=postgresql://postgres.<ref>:<password>@aws-0-<region>.pooler.supabase.com:5432/postgres?schema=public
```

- `[YOUR-PASSWORD]` → 실제 비밀번호 (특수문자는 URL-encode)
- `?schema=public` 필수
- `DATABASE_URL`에 `pgbouncer=true&connection_limit=1` 추가 (Vercel Serverless + PgBouncer 권장값)

---

## 10. 마이그레이션 워크플로우

### 10.1 npm scripts (`package.json`)

```jsonc
{
  "scripts": {
    "postinstall": "prisma generate",
    "predev": "pnpm db:start || true",
    "prebuild": "prisma generate && node scripts/validate-env.mjs",

    "db:start": "pnpm dlx supabase start --exclude <서비스목록>",
    "db:stop": "pnpm dlx supabase stop",
    "db:clean": "pnpm dlx supabase stop --no-backup",
    "db:generate": "prisma generate",
    "db:migrate": "node scripts/db/guarded-migrate.mjs dev",
    "db:reset": "node scripts/db/guarded-migrate.mjs reset",
    "db:deploy": "node scripts/db/guarded-migrate.mjs deploy",
    "db:seed": "prisma db seed",
    "db:studio": "prisma studio"
  }
}
```

### 10.2 로컬 개발 루프

```bash
pnpm db:start                                   # 로컬 DB 기동 (멱등)

# schema.prisma 편집 후:
pnpm db:migrate -- --name <verb>_<target>       # 마이그레이션 생성+적용+클라이언트 재생성

# 검증:
pnpm typecheck && pnpm test
pnpm test:integration:local                      # DB 기동→스키마 적용→generate→통합테스트

# 커밋:
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat(db): <description>"
```

**마이그레이션 파일만 미리 생성(검토 후 적용)**:

```bash
pnpm db:migrate -- --create-only --name <name>  # SQL 파일만 생성
# migration.sql 검토·수정
pnpm db:migrate                                  # 적용
```

**로컬 초기화(꼬임/드리프트 복구)**:

```bash
pnpm db:reset                                    # 드롭→전 마이그레이션 재적용→seed
```

### 10.3 운영 적용 (Production)

```bash
# 수동 적용:
DATABASE_URL="$DIRECT_URL_PROD" DIRECT_URL="$DIRECT_URL_PROD" pnpm db:deploy

# 상태 확인:
DATABASE_URL="$DIRECT_URL_PROD" DIRECT_URL="$DIRECT_URL_PROD" pnpm exec prisma migrate status
```

> **중요**: 마이그레이션은 `DIRECT_URL`(비-pooled)로 적용한다. DDL과 advisory lock은 PgBouncer와 호환되지 않는다.

### 10.4 자동화 — GitHub Action (병렬 모드)

`.github/workflows/migrate-prod.yml`:

```yaml
name: Prod DB migrate

on:
  push:
    branches: [main]
    paths:
      - "prisma/migrations/**"
      - ".github/workflows/migrate-prod.yml"
  workflow_dispatch: {}

concurrency:
  group: prod-db-migrate
  cancel-in-progress: false

jobs:
  migrate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 24
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - name: prisma migrate deploy
        env:
          DATABASE_URL: ${{ secrets.DIRECT_URL_PROD }}
          DIRECT_URL: ${{ secrets.DIRECT_URL_PROD }}
        run: pnpm db:deploy
```

**설계 결정**:
- `prisma/migrations/**` 변경이 있는 main 머지에서만 트리거 (그 외는 no-op)
- Vercel은 같은 main push에 Git 연동으로 독립 자동배포 → **마이그레이션과 배포는 병렬**
- `concurrency` 그룹으로 연속 머지 시 직렬화 (겹침 방지)
- **DATABASE_URL과 DIRECT_URL 모두 direct URL**을 사용 (마이그레이션은 DDL)
- 시크릿 `DIRECT_URL_PROD`는 **GitHub Secrets에만** 보관 (로그/PR/코드에 노출 금지)

### 10.5 초기 베이스라인 (최초 1회)

호스티드 DB가 이미 스키마를 갖고 `_prisma_migrations` 이력이 없으면:

```bash
pnpm db:migrate -- --name init   # 로컬에 init 마이그레이션 생성·커밋
DATABASE_URL="$DIRECT_URL_PROD" DIRECT_URL="$DIRECT_URL_PROD" \
  pnpm exec prisma migrate resolve --applied <init_migration_dir_name>
```

---

## 11. 마이그레이션 가드레일 (`scripts/db/guarded-migrate.mjs`)

`prisma migrate` 명령의 라벨(`dev`/`deploy`)은 대상 DB를 보증하지 않는다. 대상은 `DATABASE_URL`이 정한다. 가드 스크립트가 이를 강제한다:

```js
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";

// .env 자동 로드 (셸 값이 없을 때만)
if (!process.env.DATABASE_URL && existsSync(".env")) {
  process.loadEnvFile(".env");
}

const sub = process.argv[2]; // dev | deploy | reset | status
const isDestructive = sub === "dev" || sub === "reset";
const localHosts = new Set(["127.0.0.1", "localhost", "::1", ""]);

if (isDestructive) {
  const url = process.env.DATABASE_URL;
  if (!url) { /* 에러: DATABASE_URL 미설정 */ }

  const host = new URL(url).hostname;
  const overridden = process.env.ALLOW_NONLOCAL_MIGRATE === "1";

  if (!localHosts.has(host) && !overridden) {
    // 거부: 비-로컬 호스트에 대한 dev/reset은 데이터 파괴 위험
    process.exit(1);
  }
}

spawnSync("prisma", ["migrate", ...process.argv.slice(2)], {
  stdio: "inherit",
  env: process.env,
});
```

| 명령 | 동작 | 비-로컬 대상 |
| --- | --- | --- |
| `pnpm db:migrate` | `migrate dev` (저작+적용) | **거부** (override: `ALLOW_NONLOCAL_MIGRATE=1`) |
| `pnpm db:reset` | `migrate reset` (파괴적) | **거부** (override 동일) |
| `pnpm db:deploy` | `migrate deploy` (적용만) | **허용** (운영 적용이 정상) |

---

## 12. expand/contract 마이그레이션 규칙

구·신 코드가 같은 DB를 동시에 보는 구간이 항상 존재한다 (무중단 배포, Preview↔Production DB 공유). **한 릴리스에서 파괴적 변경을 하지 않는다.**

| 변경 유형 | 안전한 방법 |
| --- | --- |
| 컬럼 추가 | nullable 또는 default로 추가 (구코드가 모름 → 무해) |
| 컬럼 삭제 | ① 신코드에서 사용 중단 → 배포 → ② 다음 릴리스에서 drop |
| 컬럼 rename | add(new) → 백필 → 신코드 전환 → 다음 릴리스에서 old drop |
| NOT NULL 추가 | nullable로 추가 → 백필 → 다음 릴리스에서 NOT NULL |
| 인덱스 추가 | 대용량은 `CREATE INDEX CONCURRENTLY` (직접 SQL 마이그레이션) |

**원칙**: 한 PR = 한 expand 또는 한 contract. expand(추가)는 코드보다 먼저/같이, contract(제거)는 코드가 더 이상 안 쓰는 게 확인된 다음 릴리스에서.

**자동 경로(§10.4)의 전제**: backward-compatible 마이그레이션만 이 경로로 처리한다. **파괴적 변경은 게이트형 워크플로우**(migrate 성공 후에만 배포)로 별도 처리한다.

---

## 13. 헬스체크 엔드포인트

### 13.1 `lib/health.ts`

```ts
export type HealthResponseBody = {
  db: "ok" | "error";
  env: "development" | "preview" | "production";
  region: string;
};

export type HealthDatabase = {
  $queryRaw(query: TemplateStringsArray): Promise<unknown>;
};

export async function checkHealth(database: HealthDatabase): Promise<HealthResult> {
  const env = getDeploymentEnv();
  const region = getDeploymentRegion();

  try {
    await database.$queryRaw`SELECT 1::int AS value`;
    console.info(JSON.stringify({ event: "db_connect_ok", env, region }));
    return { status: 200, body: { db: "ok", env, region } };
  } catch {
    console.error(JSON.stringify({ event: "db_connect_fail", env, region, reason: "db_unavailable" }));
    return { status: 503, body: { db: "error", env, region } };
  }
}
```

### 13.2 `app/api/health/route.ts`

```ts
import { checkHealth } from "@/lib/health";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const { prisma } = await import("@/lib/db");
  const result = await checkHealth(prisma);
  return Response.json(result.body, { status: result.status });
}
```

### 13.3 계층별 기대 응답

| 계층 | `GET /api/health` 응답 |
| --- | --- |
| Local | `{ "db": "ok", "env": "development", "region": "local" }` |
| Preview | `{ "db": "ok", "env": "preview", "region": "icn1" }` |
| Production | `{ "db": "ok", "env": "production", "region": "icn1" }` |

> 구조화 로그(`db_connect_ok`/`db_connect_fail`)에는 connection string이 **절대 포함되지 않는다**.

---

## 14. 통합 테스트 환경

### 14.1 통합 테스트 원스텝 러너 (`scripts/db/test-integration-local.mjs`)

```bash
pnpm test:integration:local                # 기본 (migrate deploy)
pnpm test:integration:local -- --reset     # 로컬 DB 리셋 후 실행
pnpm test:integration:local -- --stop      # 끝나고 DB 컨테이너 중지
```

실행 순서: `db:start` → 스키마 적용(`migrate deploy` 또는 `--reset`) → `prisma generate` → 통합테스트(`RUN_DB_TESTS=true`)

**가드**: 비-로컬 호스트 대상은 거부 (통합테스트는 도메인 테이블을 비움 — 원격 데이터 파괴 방지).

### 14.2 `.env` 자동 로드 패턴

```ts
// scripts/load-env.ts — CLI 스크립트용
import { existsSync } from "node:fs";
import { resolve } from "node:path";

if (!process.env.DATABASE_URL) {
  const envPath = resolve(process.cwd(), ".env");
  if (existsSync(envPath)) {
    process.loadEnvFile(envPath);
  }
}
```

> Next.js는 `.env`를 자동 로드하지만, `tsx`로 직접 실행하는 CLI 스크립트는 그렇지 않다. 셸에 이미 값이 있으면 로드하지 않는다 (배포 환경변수 우선).

---

## 15. npm scripts 빌드 훅 체인

```
pnpm install
  └─ postinstall: prisma generate          # 타입 생성

pnpm dev
  └─ predev: pnpm db:start || true         # 로컬 DB 자동 기동
  └─ dev: next dev

pnpm build
  └─ prebuild: prisma generate             # 타입 재생성
              && node scripts/validate-env.mjs   # 환경변수 사전검증
              && <기타 빌드 전처리>
  └─ build: next build
```

---

## 16. 롤백 전략

- **코드**: Vercel 1-click (이전 Ready 배포로 재할당).
- **DB는 자동 롤백하지 않는다.** expand/contract를 지켰다면 구코드로 되돌려도 신스키마와 호환된다 (이것이 expand/contract의 목적).
- 되돌릴 수 없는 변경(데이터 손실 동반 contract)은 릴리스 전 백업/검토 필수.

---

## 17. 새 프로젝트 부트스트랩 체크리스트

### Phase 0: 로컬 환경

- [ ] Docker 설치 및 실행 확인
- [ ] Node.js 24.x, pnpm 9.x 설치
- [ ] Supabase CLI 설치 확인 (`supabase --version`)
- [ ] `supabase/config.toml` 생성 (§4.1 참조)
- [ ] `prisma/schema.prisma` 생성 (§5.2 참조)
- [ ] `prisma.config.ts` 생성 (§5.1 참조)
- [ ] `lib/db.ts` 생성 (§6 참조)
- [ ] `lib/env.ts` 생성 (§7.4 참조)
- [ ] `lib/health.ts` + `app/api/health/route.ts` 생성 (§13 참조)
- [ ] `.env.example` 생성 (§7.3 참조)
- [ ] `.env.example` → `.env` 복사
- [ ] `.gitignore`에 `.env*` 패턴 추가 (§7.2 참조)
- [ ] `scripts/db/guarded-migrate.mjs` 생성 (§11 참조)
- [ ] `scripts/validate-env.mjs` 생성 (§7.5 참조)
- [ ] `scripts/load-env.ts` 생성 (§14.2 참조)
- [ ] `package.json` scripts 추가 (§10.1, §15 참조)
- [ ] `pnpm db:start` → `pnpm db:migrate -- --name init` → `pnpm dev`
- [ ] `curl http://localhost:3000/api/health` → `{ "db": "ok", "env": "development", "region": "local" }`

### Phase 1: Supabase Cloud + Vercel

- [ ] Supabase Dashboard에서 프로젝트 생성 (region 선택, 비밀번호 보관)
- [ ] Connection URL 2개 확보 (Transaction Pooler + Direct Connection)
- [ ] URL 가공: 비밀번호 치환, `?schema=public`, `pgbouncer=true&connection_limit=1`
- [ ] Vercel에 프로젝트 import (GitHub 연동)
- [ ] `vercel.json` 설정 (§8.3 참조)
- [ ] Vercel 환경변수 입력 (§8.1 참조)
- [ ] 초기 스키마 적용 (§10.5 베이스라인)
- [ ] Production 재배포 → `GET /api/health` → `{ "db": "ok" }` 확인

### Phase 2: CI/CD 자동화

- [ ] GitHub Secrets에 `DIRECT_URL_PROD` 등록
- [ ] `.github/workflows/migrate-prod.yml` 생성 (§10.4 참조)
- [ ] 마이그레이션 PR 머지 → Action 자동 실행 확인
- [ ] Production 헬스체크 재확인

---

## 18. 트러블슈팅

| 증상 | 원인 | 해결 |
| --- | --- | --- |
| `Environment variable not found: DATABASE_URL` | Prisma CLI가 `.env` 미로드 (`prisma.config.ts` 존재 시) | `pnpm db:*` 래퍼를 사용하거나 `set -a && source .env && set +a` 선행 |
| `[guard] 거부 ... 비-로컬 호스트` | 로컬 가드가 비-로컬 URL 감지 | 의도적이면 `ALLOW_NONLOCAL_MIGRATE=1`; 운영 적용은 `pnpm db:deploy` |
| `PrismaClient ... missing ... <model>` | `prisma generate` 누락 | `pnpm db:generate` (CI는 `postinstall`/`prebuild`가 처리) |
| `migrate deploy`가 drift 보고 | 호스티드 DB가 이력과 다르게 변경됨 | `prisma migrate diff`로 확인, 베이스라인 누락 점검 |
| pooled URL로 migrate 시 hang/lock | PgBouncer가 DDL/advisory lock 미지원 | `DIRECT_URL`(direct, 5432)로 실행 |
| `P1001` 연결 실패 | 로컬 DB 미기동 | `pnpm db:start` |
| HTTP 503 `db: "error"` (호스티드) | DB URL 오타, 비밀번호 인코딩, IP 제한 | Supabase Dashboard에서 Connection pooling 확인, 비밀번호 특수문자 URL-encode |
| HTTP 500 `Missing required env` (Vercel) | Vercel 환경변수 누락 또는 스코프 체크 빠짐 | §8.1 표 재확인, 재배포 |

---

## 19. 보안 규칙

1. **Connection URL은 절대 Git에 커밋하지 않는다.** `.env.example`만 커밋.
2. **`DIRECT_URL_PROD` 시크릿은 GitHub Secrets에만.** 로그, PR, 코드, 에이전트 컨텍스트에 노출 금지.
3. **구조화 로그에 connection string을 포함하지 않는다.** 이벤트명(`db_connect_ok`/`db_connect_fail`)과 메타데이터만.
4. **`prisma db push`는 로컬 실험 전용.** 호스티드 DB에는 마이그레이션 이력을 남기는 `migrate deploy`만 사용.
5. **Supabase production DB에 직접 SQL을 날려 데이터를 수정하지 않는다.** 마이그레이션은 Prisma 흐름으로만.
6. **`vercel deploy --prod`를 자동화 스크립트로 실행하지 않는다.** main 머지 트리거에 의존.

---

## 부록 A. 명령 치트시트

```bash
# ── 로컬 (가드 적용, .env 자동 로드) ──
pnpm db:start                                    # 로컬 DB 기동
pnpm db:stop                                     # 로컬 DB 중지 (데이터 보존)
pnpm db:clean                                    # 로컬 DB 완전 초기화 (볼륨 삭제)
pnpm db:migrate -- --name <verb>_<target>        # 마이그레이션 생성+적용
pnpm db:migrate -- --create-only --name <...>    # 파일만 생성 (검토 후 적용)
pnpm db:reset                                    # 드롭→전 마이그레이션 재적용→seed
pnpm db:generate                                 # 클라이언트(타입) 재생성
pnpm db:seed                                     # 시드 실행
pnpm db:studio                                   # Prisma Studio GUI
pnpm test:integration:local                      # 통합테스트 원스텝

# ── 운영 (빌드 밖, DIRECT_URL) ──
DATABASE_URL="$DIRECT_URL_PROD" DIRECT_URL="$DIRECT_URL_PROD" pnpm db:deploy     # 미적용분 적용
pnpm exec prisma migrate status                  # 적용 상태 확인
pnpm exec prisma migrate resolve --applied <dir> # 베이스라인 (최초 1회)
pnpm exec prisma migrate diff \
  --from-migrations ./prisma/migrations \
  --to-schema-datamodel ./prisma/schema.prisma --script   # 미생성 변경분 SQL 미리보기
```
