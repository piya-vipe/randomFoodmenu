import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const userId =
    typeof (body as { userId?: unknown })?.userId === "string"
      ? (body as { userId: string }).userId
      : "";

  if (!userId) {
    return NextResponse.json({ ok: false, error: "userId is required" }, { status: 400 });
  }

  try {
    await prisma.$transaction(async (tx) => {
      const clearedCount = await tx.pick.count({ where: { userId } });
      if (clearedCount > 0) {
        await tx.resetEvent.create({ data: { userId, clearedCount } });
      }
      await tx.pick.deleteMany({ where: { userId } });
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("POST /api/reset failed:", err);
    return NextResponse.json(
      { ok: false, error: "เชื่อมต่อฐานข้อมูลไม่ได้ กรุณาลองใหม่อีกครั้ง" },
      { status: 500 }
    );
  }
}
