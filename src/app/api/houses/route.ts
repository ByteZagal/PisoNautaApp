import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getBearer, getUserEmailFromJWT } from "@/lib/auth";
import { log } from "@/lib/log";
import { rateLimit } from "@/lib/rateLimit";
import { z } from "zod";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const token = getBearer(req);
  if (!token) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const email = await getUserEmailFromJWT(token);
  if (!email) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { rows } = await pool.query(
    `select h.id, h.name, h.created_at
     from public.houses h
     join public.memberships m on m.house_id = h.id
     join public.users u on u.id = m.user_id
     where u.email = $1
     order by h.created_at desc`,
    [email]
  );
  log("info", "houses.list", { email, count: rows.length });
  return NextResponse.json(rows, { status: 200 });
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") || "local";
  const rl = rateLimit(`houses:POST:${ip}`, 10, 60_000);
  if (!rl.ok) return NextResponse.json({ error: "rate_limited" }, { status: 429 });

  const token = getBearer(req);
  if (!token) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const email = await getUserEmailFromJWT(token);
  if (!email) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const Schema = z.object({ name: z.string().min(1) });
  const body = await req.json().catch(() => ({}));
  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_body", details: parsed.error.format() }, { status: 400 });
  }

  const client = await pool.connect();
  try {
    await client.query("begin");
    const u = await client.query(
      `insert into public.users(email) values ($1)
       on conflict (email) do update set email=excluded.email
       returning id`,
      [email]
    );
    const userId = u.rows[0].id as string;

    const h = await client.query(
      `insert into public.houses(name) values ($1)
       returning id, name, created_at`,
      [parsed.data.name]
    );
    const houseId = h.rows[0].id as string;

    await client.query(
      `insert into public.memberships(user_id, house_id, role)
       values ($1,$2,$3) on conflict do nothing`,
      [userId, houseId, "host"]
    );
    await client.query("commit");
    log("info", "houses.create", { email, houseId });
    return NextResponse.json(h.rows[0], { status: 201 });
  } catch (e) {
    await client.query("rollback");
    log("error", "houses.create_failed", { email, err: String(e) });
    return NextResponse.json({ error: "db_error" }, { status: 500 });
  } finally {
    client.release();
  }
}
