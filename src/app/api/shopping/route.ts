import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getBearer, getUserEmailFromJWT } from "@/lib/auth";
import { ensureTable } from "@/lib/schemaCheck";
import { z } from "zod";

export async function POST(req: NextRequest) {
  const token = getBearer(req);
  if (!token) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const email = await getUserEmailFromJWT(token);
  if (!email) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  if (!(await ensureTable("shopping_items"))) {
    return NextResponse.json({ error: "not_implemented", message: "DDL de shopping_items no coincide" }, { status: 501 });
  }

  const Schema = z.object({
    title: z.string().min(1),
    house_id: z.string().uuid(),
    quantity: z.string().optional(),
  });
  const body = await req.json().catch(() => ({}));
  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_body", details: parsed.error.format() }, { status: 400 });
  }

  const { rows: u } = await pool.query(`select id from public.users where email=$1`, [email]);
  const added_by = u[0]?.id || null;

  const { rows } = await pool.query(
    `insert into public.shopping_items(house_id, title, quantity, added_by)
     values ($1,$2,$3,$4)
     returning id, house_id, title, quantity, added_by, created_at`,
    [parsed.data.house_id, parsed.data.title, parsed.data.quantity || null, added_by]
  );
  return NextResponse.json(rows[0], { status: 201 });
}
