import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { CategorySummary, PickHistoryItem } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get("userId");
  if (!userId) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }

  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return NextResponse.json({ error: "ไม่พบผู้ใช้นี้" }, { status: 404 });
    }

    const [categories, picks] = await Promise.all([
      prisma.category.findMany({
        orderBy: { order: "asc" },
        include: {
          menuItems: {
            select: {
              id: true,
              picks: { where: { userId }, select: { id: true } },
            },
          },
        },
      }),
      prisma.pick.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        include: { menuItem: { include: { category: true } } },
      }),
    ]);

    const categorySummaries: CategorySummary[] = categories.map((c) => ({
      slug: c.slug,
      name: c.name,
      emoji: c.emoji ?? "🍽️",
      total: c.menuItems.length,
      pickedCount: c.menuItems.filter((mi) => mi.picks.length > 0).length,
    }));

    const pickHistory: PickHistoryItem[] = picks.map((p) => ({
      id: p.id,
      menuItemName: p.menuItem.name,
      howTo: p.menuItem.howTo,
      categorySlug: p.menuItem.category.slug,
      categoryName: p.menuItem.category.name,
      categoryEmoji: p.menuItem.category.emoji ?? "🍽️",
      createdAt: p.createdAt.toISOString(),
    }));

    return NextResponse.json({
      user: { id: user.id, name: user.name },
      categories: categorySummaries,
      picks: pickHistory,
    });
  } catch (err) {
    console.error("GET /api/state failed:", err);
    return NextResponse.json(
      { error: "เชื่อมต่อฐานข้อมูลไม่ได้ กรุณาลองใหม่อีกครั้ง" },
      { status: 500 }
    );
  }
}
