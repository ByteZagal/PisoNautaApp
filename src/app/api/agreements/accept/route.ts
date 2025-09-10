import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getBearer, getUserEmailFromJWT } from "@/lib/auth";
import { ensureTable } from "@/lib/schemaCheck";
import { z } from "zod";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const token = getBearer(req);
  if (!token) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const email = await getUserEmailFromJWT(token);
  if (!email) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  if (!(await ensureTable("agreements")) || !(await ensureTable("agreement_acceptances"))) {
    return NextResponse.json({ error: "not_implemented", message: "DDL agreements no coincide" }, { status: 501 });
  }

  const Schema = z.object({ house_id: z.string().uuid() });
  const body = await req.json().catch(() => ({}));
  const parsed = Schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "invalid_body", details: parsed.error.format() }, { status: 400 });

  const { rows: u } = await pool.query(`select id from public.users where email=$1`, [email]);
  const user_id = u[0]?.id;
  if (!user_id) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { rows: a } = await pool.query(
    `select id from public.agreements where house_id=$1 order by created_at desc limit 1`,
    [parsed.data.house_id]
  );
  const agreement_id = a[0]?.id;
  if (!agreement_id) return NextResponse.json({ error: "not_found", message: "no agreements for house" }, { status: 404 });

  await pool.query(
    `insert into public.agreement_acceptances(agreement_id, user_id)
     values ($1,$2) on conflict do nothing`,
    [agreement_id, user_id]
  );

  return NextResponse.json({ ok: true, agreement_id }, { status: 200 });
}
