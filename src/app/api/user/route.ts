import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const name =
    typeof (body as { name?: unknown })?.name === "string"
      ? (body as { name: string }).name.trim()
      : "";

  if (!name) {
    return NextResponse.json({ error: "กรุณาใส่ชื่อ" }, { status: 400 });
  }
  if (name.length > 40) {
    return NextResponse.json(
      { error: "ชื่อยาวเกินไป (ไม่เกิน 40 ตัวอักษร)" },
      { status: 400 }
    );
  }

  try {
    const user = await prisma.user.upsert({
      where: { name },
      update: {},
      create: { name },
    });

    return NextResponse.json({ id: user.id, name: user.name });
  } catch (err) {
    console.error("POST /api/user failed:", err);
    return NextResponse.json(
      { error: "เชื่อมต่อฐานข้อมูลไม่ได้ กรุณาลองใหม่อีกครั้ง" },
      { status: 500 }
    );
  }
}
