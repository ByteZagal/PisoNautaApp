import { supabaseFromRequest } from "@/lib/supabase";
export const runtime = "edge";

export async function GET() {
  const supabase = await supabaseFromRequest();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user) return Response.json({ user: null });
  const { user } = data;
  return Response.json({ user: { id: user.id, email: user.email } });
}
