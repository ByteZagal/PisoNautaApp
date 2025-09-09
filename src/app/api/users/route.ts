import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// GET /api/users → lista todos los usuarios
export async function GET() {
  try {
    const users = await prisma.user.findMany();
    return NextResponse.json(users);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "db_error" }, { status: 500 });
  }
}

// POST /api/users → crea un nuevo usuario de prueba
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const user = await prisma.user.create({
      data: {
        email: body.email,
        name: body.name,
      },
    });
    return NextResponse.json(user, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "db_error" }, { status: 500 });
  }
}
