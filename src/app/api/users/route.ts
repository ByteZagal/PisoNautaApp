import { supabaseFromRequest } from "@/lib/supabase";
import { error } from "@/lib/http";

export const runtime = "edge";

export async function GET() {
  const supabase = await supabaseFromRequest();
  const { data, error: e } = await supabase.auth.getUser();
  if (e || !data?.user) return error(401, "No autenticado");
  return Response.json({ user: { id: data.user.id, email: data.user.email} });
}
