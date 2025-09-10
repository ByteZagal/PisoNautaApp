import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getBearer, getUserEmailFromJWT } from "@/lib/auth";
import { ensureTable } from "@/lib/schemaCheck";
import { z } from "zod";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const token = getBearer(req);
  if (!token) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const email = await getUserEmailFromJWT(token);
  if (!email) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  if (!(await ensureTable("expenses"))) {
    return NextResponse.json({ error: "not_implemented", message: "DDL de expenses no coincide" }, { status: 501 });
  }

  const Schema = z.object({
    title: z.string().min(1),
    amount: z.number().positive(),
    paid_by_id: z.string().uuid(),
    split_method: z.enum(["equal", "weighted"]),
    house_id: z.string().uuid(),
  });

  const body = await req.json().catch(() => ({}));
  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_body", details: parsed.error.format() }, { status: 400 });
  }

  const { title, amount, paid_by_id, split_method, house_id } = parsed.data;
  const { rows } = await pool.query(
    `insert into public.expenses(house_id, title, amount, paid_by, split_method)
     values ($1,$2,$3,$4,$5)
     returning id, house_id, title, amount, paid_by, split_method, created_at`,
    [house_id, title, amount, paid_by_id, split_method]
  );
  return NextResponse.json(rows[0], { status: 201 });
}
