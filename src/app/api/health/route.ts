import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";


export async function GET() {
  try {
    await pool.query("select 1");
    return NextResponse.json(
      { status: "ok", db: true, time: new Date().toISOString() },
      { status: 200 }
    );
  } catch (e) {
    return NextResponse.json(
      { status: "degraded", db: false, error: String(e) },
      { status: 503 }
    );
  }
}
