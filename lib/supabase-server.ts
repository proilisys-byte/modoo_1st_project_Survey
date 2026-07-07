/** 서버 Route용 Supabase URL·키 (service role 우선, 없으면 anon) */
export function getSupabaseServerConfig(): {
  url: string;
  key: string;
  mode: "service_role" | "anon";
} | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url) return null;
  if (serviceKey) return { url, key: serviceKey, mode: "service_role" };
  if (anonKey) return { url, key: anonKey, mode: "anon" };
  return null;
}
