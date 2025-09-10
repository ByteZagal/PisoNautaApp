// src/lib/auth.ts
import type { NextRequest } from "next/server";

export function getBearer(req: NextRequest): string | null {
  const h = req.headers.get("authorization") || req.headers.get("Authorization");
  if (!h) return null;
  const [scheme, token] = h.split(" ");
  if (!/^Bearer$/i.test(scheme) || !token) return null;
  return token;
}

export async function getUserEmailFromJWT(token: string): Promise<string | null> {
  const url = process.env.SUPABASE_URL;
  const anon = process.env.SUPABASE_ANON_KEY;

  // 1) Camino oficial: preguntar a Supabase quién es el usuario de este JWT
  if (url && anon) {
    try {
      const r = await fetch(`${url}/auth/v1/user`, {
        headers: { Authorization: `Bearer ${token}`, apikey: anon },
        cache: "no-store",
      });
      if (r.ok) {
        const u = await r.json();
        if (u?.email && typeof u.email === "string") return u.email;
      }
    } catch {
      // ignore y pasamos al fallback
    }
  }

  // 2) Fallback: leer el payload del JWT (sin verificar firma) y sacar 'email'
  try {
    const part = token.split(".")[1];
    const json = JSON.parse(Buffer.from(part, "base64url").toString("utf8"));
    if (json?.email && typeof json.email === "string") return json.email;
  } catch {
    // ignore
  }
  return null;
}
