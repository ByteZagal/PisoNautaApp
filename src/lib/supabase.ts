import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { headers as nextHeaders, cookies as nextCookies } from "next/headers";
import { env } from "@/lib/env";

// Acepta T | Promise<T> sin usar any
type MaybePromise<T> = T | Promise<T>;
const resolve = <T,>(v: MaybePromise<T>) => Promise.resolve(v);

export function supabaseAdmin(): SupabaseClient {
  return createClient(env.server.SUPABASE_URL, env.server.SUPABASE_ANON_KEY, {
    auth: { persistSession: false },
  });
}

export async function supabaseFromRequest(): Promise<SupabaseClient> {
  const h = await resolve(nextHeaders());
  const c = await resolve(nextCookies());

  const authHeader =
    typeof (h as Headers).get === "function"
      ? (h as Headers).get("authorization") ?? undefined
      : undefined;

  const cookieToken =
    typeof (c as { get(name: string): { value: string } | undefined }).get === "function"
      ? (c as { get(name: string): { value: string } | undefined }).get("sb-access-token")?.value
      : undefined;

  const hdrs: Record<string, string> = {};
  if (authHeader) hdrs["Authorization"] = authHeader;
  else if (cookieToken) hdrs["Authorization"] = `Bearer ${cookieToken}`;

  return createClient(env.server.SUPABASE_URL, env.server.SUPABASE_ANON_KEY, {
    global: { headers: hdrs },
    auth: { persistSession: false },
  });
}
