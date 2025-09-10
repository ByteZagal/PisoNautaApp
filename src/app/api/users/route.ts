import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getBearer, getUserEmailFromJWT } from "@/lib/auth";
import { log } from "@/lib/log";
import { rateLimit } from "@/lib/rateLimit";

export async function GET(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") || "local";
  const rl = rateLimit(`users:GET:${ip}`, 20, 60_000);
  if (!rl.ok) return NextResponse.json({ error: "rate_limited" }, { status: 429 });

  const token = getBearer(req);
  if (!token) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const email = await getUserEmailFromJWT(token);
  if (!email) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { rows } = await pool.query(
    `insert into public.users(email) values ($1)
     on conflict (email) do update set email=excluded.email
     returning id,email,name,avatar_url`,
    [email]
  );
  log("info", "users.ensure", { email });
  return NextResponse.json(rows[0], { status: 200 });
}
