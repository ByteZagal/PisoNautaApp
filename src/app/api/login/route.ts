import { supabaseAdmin } from "@/lib/supabase";
import { error } from "@/lib/http";

export const runtime = "edge";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as unknown;
  const email = (body as { email?: string }).email;
  const password = (body as { password?: string }).password;
  if (!email || !password) return error(400, "email y password requeridos");

  const supabase = supabaseAdmin();
  const { data, error: authErr } = await supabase.auth.signInWithPassword({ email, password });
  if (authErr || !data?.session) return error(401, "Credenciales inválidas");

  const a = data.session.access_token;
  const r = data.session.refresh_token;

  const headers = new Headers({ "content-type": "application/json" });
  headers.append("Set-Cookie", `sb-access-token=${a}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=3600`);
  headers.append("Set-Cookie", `sb-refresh-token=${r}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${7*24*3600}`);

  return new Response(JSON.stringify({ data: { user: data.user, access_token: a } }), { status: 200, headers });
}
