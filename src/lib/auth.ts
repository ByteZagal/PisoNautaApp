import { NextRequest } from "next/server";

/**
 * Extrae el token Bearer del request
 */
export function getBearer(req: NextRequest): string | null {
  const h = req.headers.get("authorization") || req.headers.get("Authorization");
  if (!h) return null;
  const [scheme, token] = h.split(" ");
  if ((scheme || "").toLowerCase() !== "bearer" || !token) return null;
  return token.trim();
}

/**
 * Llama a Supabase /auth/v1/user con el JWT para obtener email/id.
 * No usa 'jose'; evita problemas de dependencias.
 */
export async function getIdentityFromJWT(token: string): Promise<{ email: string; id: string } | null> {
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
  if (!SUPABASE_URL) return null;

  try {
    const resp = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: {
        authorization: `Bearer ${token}`,
        ...(SUPABASE_ANON_KEY ? { apikey: SUPABASE_ANON_KEY } : {}),
      },
      cache: "no-store",
    });
    if (!resp.ok) return null;
    const data: unknown = await resp.json();
    // forma segura: comprobamos mínimamente
    if (
      data &&
      typeof data === "object" &&
      "id" in data &&
      "email" in data &&
      typeof (data as { id: unknown }).id === "string" &&
      typeof (data as { email: unknown }).email === "string"
    ) {
      return { id: (data as { id: string }).id, email: (data as { email: string }).email };
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Devuelve email (o null) desde un NextRequest.
 */
export async function getUserEmailFromJWT(req: NextRequest): Promise<string | null> {
  const token = getBearer(req);
  if (!token) return null;
  const ident = await getIdentityFromJWT(token);
  return ident?.email ?? null;
}
