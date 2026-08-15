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
  const categorySlug =
    typeof (body as { categorySlug?: unknown })?.categorySlug === "string"
      ? (body as { categorySlug: string }).categorySlug
      : undefined;

  if (!userId) {
    return NextResponse.json({ ok: false, error: "userId is required" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    return NextResponse.json({ ok: false, error: "ไม่พบผู้ใช้นี้" }, { status: 404 });
  }

  const alreadyPicked = await prisma.pick.findMany({
    where: { userId },
    select: { menuItemId: true },
  });
  const excludeIds = alreadyPicked.map((p) => p.menuItemId);

  const eligible = await prisma.menuItem.findMany({
    where: {
      ...(categorySlug ? { category: { slug: categorySlug } } : {}),
      ...(excludeIds.length ? { id: { notIn: excludeIds } } : {}),
    },
    include: { category: true },
  });

  if (eligible.length === 0) {
    return NextResponse.json({
      ok: true,
      done: true,
      message: categorySlug
        ? "คุณลองครบทุกเมนูในหมวดนี้แล้ว! ลองหมวดอื่น หรือกดรีเซ็ตเพื่อเริ่มใหม่"
        : "คุณลองครบทุกเมนูในระบบแล้ว! กดรีเซ็ตเพื่อเริ่มใหม่",
    });
  }

  const chosen = eligible[Math.floor(Math.random() * eligible.length)];

  await prisma.pick.create({
    data: { userId, menuItemId: chosen.id },
  });

  return NextResponse.json({
    ok: true,
    done: false,
    item: { name: chosen.name },
    category: {
      slug: chosen.category.slug,
      name: chosen.category.name,
      emoji: chosen.category.emoji ?? "🍽️",
    },
  });
}
