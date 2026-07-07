/**
 * Supabase SQL 파일 적용 — DIRECT_URL 또는 DATABASE_URL 필요
 * 사용: npm run db:apply -- supabaseDB/09_v_survey_responses_excel_v03.sql
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { config } from "dotenv";

config({ path: resolve(process.cwd(), ".env.local") });
config();

function resolveDatabaseUrl(): string {
  const direct = process.env.DIRECT_URL?.trim() || process.env.DATABASE_URL?.trim();
  if (direct) return direct;

  const dbPassword = process.env.SUPABASE_DB_PASSWORD?.trim();
  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  if (dbPassword && baseUrl) {
    const ref = baseUrl.match(/^https:\/\/([^.]+)\.supabase\.co/i)?.[1];
    if (ref) {
      const region =
        process.env.SUPABASE_DB_REGION?.trim() || "ap-northeast-2";
      const enc = encodeURIComponent(dbPassword);
      return `postgresql://postgres.${ref}:${enc}@aws-0-${region}.pooler.supabase.com:5432/postgres`;
    }
  }
  return "";
}

async function main() {
  const rel = process.argv[2] ?? "supabaseDB/09_v_survey_responses_excel_v03.sql";
  const file = resolve(process.cwd(), rel);
  const sql = readFileSync(file, "utf8");

  const url = resolveDatabaseUrl();

  if (!url) {
    console.error(
      "오류: DIRECT_URL, DATABASE_URL, 또는 SUPABASE_DB_PASSWORD가 필요합니다.\n" +
        "Supabase Dashboard → Project Settings → Database → Connection string\n" +
        "  (Direct connection, URI) 값을 .env.local에 DIRECT_URL=... 로 추가하거나\n" +
        "  Database password를 SUPABASE_DB_PASSWORD=... 로 추가하세요."
    );
    process.exit(1);
  }

  const { Client } = await import("pg");
  const client = new Client({
    connectionString: url,
    ssl: url.includes("localhost") ? undefined : { rejectUnauthorized: false },
  });

  await client.connect();
  try {
    await client.query(sql);
    const { rows } = await client.query<{ cnt: string }>(
      `select count(*)::text as cnt from information_schema.views
       where table_schema = 'public' and table_name = 'v_survey_responses_excel'`
    );
    if (rows[0]?.cnt !== "1") {
      throw new Error("뷰 생성 확인 실패");
    }
    const sample = await client.query(
      `select column_name from information_schema.columns
       where table_schema = 'public' and table_name = 'v_survey_responses_excel'
       and column_name like '14_%'`
    );
    console.log(`OK: ${rel} 적용 완료 (v03 컬럼 ${sample.rowCount}개 확인)`);
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error("SQL 적용 실패:", err instanceof Error ? err.message : err);
  process.exit(1);
});
