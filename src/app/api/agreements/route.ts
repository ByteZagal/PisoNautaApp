import { json, error } from "@/lib/http";
import { supabaseFromRequest } from "@/lib/supabase";
import { z } from "zod";

export const runtime = "edge";

const CreateAgreement = z.object({
  title: z.string().min(1),
  content: z.string().min(1),
});

export async function GET() {
  const supabase = await supabaseFromRequest();
  const { data, error: e } = await supabase.auth.getUser();
  if (e || !data?.user) return error(401, "No autenticado");
  return json({ items: [] }, { status: 200 });
}

export async function POST(req: Request) {
  const supabase = await supabaseFromRequest();
  const { data, error: e } = await supabase.auth.getUser();
  if (e || !data?.user) return error(401, "No autenticado");

  const body = (await req.json().catch(() => ({}))) as unknown;
  const parsed = CreateAgreement.safeParse(body);
  if (!parsed.success) return error(400, "Datos inválidos", parsed.error.flatten());
  return error(501, "No implementado");
}
