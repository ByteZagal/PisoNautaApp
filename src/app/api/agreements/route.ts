import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getBearer, getUserEmailFromJWT } from "@/lib/auth";
import { ensureTable } from "@/lib/schemaCheck";
import { z } from "zod";

export const runtime = "nodejs";

// GET: devuelve el último acuerdo de una casa + si el usuario lo aceptó
export async function GET(req: NextRequest) {
  const token = getBearer(req);
  if (!token) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const email = await getUserEmailFromJWT(token);
  if (!email) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  if (!(await ensureTable("agreements")) || !(await ensureTable("agreement_acceptances"))) {
    return NextResponse.json({ error: "not_implemented", message: "DDL agreements no coincide" }, { status: 501 });
  }

  const url = new URL(req.url);
  const house_id = url.searchParams.get("house_id");
  if (!house_id) {
    return NextResponse.json({ error: "invalid_params", details: { house_id: "required" } }, { status: 400 });
  }

  const { rows } = await pool.query(
    `
    with latest as (
      select a.*
      from public.agreements a
      where a.house_id = $1
      order by a.created_at desc
      limit 1
    )
    select l.id, l.house_id, l.text, l.created_at,
      exists (
        select 1
        from public.users u
        join public.agreement_acceptances aa on aa.user_id = u.id and aa.agreement_id = l.id
        where u.email = $2
      ) as accepted
    from latest l
    `,
    [house_id, email]
  );
  return NextResponse.json(rows[0] || null, { status: 200 });
}

// POST: crea un nuevo acuerdo para la casa (requiere ser miembro)
export async function POST(req: NextRequest) {
  const token = getBearer(req);
  if (!token) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const email = await getUserEmailFromJWT(token);
  if (!email) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  if (!(await ensureTable("agreements"))) {
    return NextResponse.json({ error: "not_implemented", message: "DDL agreements no coincide" }, { status: 501 });
  }

  const Schema = z.object({
    house_id: z.string().uuid(),
    text: z.string().min(1)
  });
  const body = await req.json().catch(() => ({}));
  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_body", details: parsed.error.format() }, { status: 400 });
  }

  // Verificar pertenencia a la casa
  const { rows: m } = await pool.query(
    `select 1
     from public.memberships m
     join public.users u on u.id = m.user_id
     where u.email = $1 and m.house_id = $2
     limit 1`,
    [email, parsed.data.house_id]
  );
  if (!m.length) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { rows } = await pool.query(
    `insert into public.agreements(house_id, text)
     values ($1,$2)
     returning id, house_id, text, created_at`,
    [parsed.data.house_id, parsed.data.text]
  );
  return NextResponse.json(rows[0], { status: 201 });
}
