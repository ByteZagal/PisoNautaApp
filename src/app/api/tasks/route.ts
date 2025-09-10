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

  if (!(await ensureTable("tasks"))) {
    return NextResponse.json({ error: "not_implemented", message: "DDL de tasks no coincide" }, { status: 501 });
  }

  const Schema = z.object({
    title: z.string().min(1),
    house_id: z.string().uuid(),
    room_id: z.string().uuid().optional(),
    assigned_to: z.string().uuid().optional(),
    due_date: z.string().optional(), // ISO yyyy-mm-dd
  });

  const body = await req.json().catch(() => ({}));
  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_body", details: parsed.error.format() }, { status: 400 });
  }

  const { title, house_id, room_id, assigned_to, due_date } = parsed.data;
  const { rows } = await pool.query(
    `insert into public.tasks(house_id, room_id, title, assigned_to, due_date)
     values ($1,$2,$3,$4,$5)
     returning id, house_id, room_id, title, assigned_to, due_date, completed, created_at`,
    [house_id, room_id || null, title, assigned_to || null, due_date || null]
  );
  return NextResponse.json(rows[0], { status: 201 });
}
