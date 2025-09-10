import type { NextRequest } from "next/server";

export function getBearer(req: NextRequest): string | null {
  const h = req.headers.get("authorization") || "";
  if (!h.toLowerCase().startsWith("bearer ")) return null;
  return h.slice(7);
}

export async function getUserEmailFromJWT(token: string): Promise<string | null> {
  try {
    const res = await fetch(`${process.env.SUPABASE_URL}/auth/v1/user`, {
      headers: { Authorization: `Bearer ${token}`, apikey: process.env.SUPABASE_ANON_KEY || "" },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.email ?? null;
  } catch {
    return null;
  }
}
