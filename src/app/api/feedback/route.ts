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
  const menuItemId =
    typeof (body as { menuItemId?: unknown })?.menuItemId === "string"
      ? (body as { menuItemId: string }).menuItemId
      : "";
  const rawVote = (body as { vote?: unknown })?.vote;
  const vote =
    rawVote === "LIKE" || rawVote === "DISLIKE" ? rawVote : rawVote === null ? null : undefined;

  if (!userId || !menuItemId) {
    return NextResponse.json(
      { ok: false, error: "userId and menuItemId are required" },
      { status: 400 }
    );
  }
  if (vote === undefined) {
    return NextResponse.json(
      { ok: false, error: "vote must be LIKE, DISLIKE, or null" },
      { status: 400 }
    );
  }

  try {
    if (vote === null) {
      // Tapping the same button again clears the vote.
      await prisma.feedback.deleteMany({ where: { userId, menuItemId } });
      return NextResponse.json({ ok: true, vote: null });
    }

    await prisma.feedback.upsert({
      where: { userId_menuItemId: { userId, menuItemId } },
      update: { vote },
      create: { userId, menuItemId, vote },
    });

    return NextResponse.json({ ok: true, vote });
  } catch (err) {
    console.error("POST /api/feedback failed:", err);
    return NextResponse.json(
      { ok: false, error: "บันทึกไม่สำเร็จ กรุณาลองใหม่อีกครั้ง" },
      { status: 500 }
    );
  }
}
