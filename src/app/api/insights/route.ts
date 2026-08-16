import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { FeedbackRow, InsightsResponse } from "@/lib/types";

export const dynamic = "force-dynamic";

const BANGKOK_DATE = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok" });

export async function GET(req: NextRequest) {
  const configuredKey = process.env.INSIGHTS_KEY;
  const providedKey = req.nextUrl.searchParams.get("key");

  if (!configuredKey) {
    return NextResponse.json(
      { error: "ยังไม่ได้ตั้งค่า INSIGHTS_KEY บนเซิร์ฟเวอร์" },
      { status: 501 }
    );
  }
  if (!providedKey || providedKey !== configuredKey) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const [totalUsers, allPicks, allResets, allCategories, allFeedback] = await Promise.all([
      prisma.user.count(),
      prisma.pick.findMany({
        select: {
          userId: true,
          menuItemId: true,
          method: true,
          createdAt: true,
          user: { select: { name: true } },
          menuItem: {
            select: {
              category: { select: { slug: true } },
            },
          },
        },
      }),
      prisma.resetEvent.findMany({ select: { clearedCount: true } }),
      prisma.category.findMany({
        orderBy: { order: "asc" },
        include: { menuItems: { select: { id: true, name: true } } },
      }),
      prisma.feedback.findMany({ select: { menuItemId: true, vote: true } }),
    ]);

    type CategoryAgg = {
      slug: string;
      name: string;
      emoji: string;
      itemCount: number;
      pickCount: number;
      uniqueUserIds: Set<string>;
      perUserPickedItemIds: Map<string, Set<string>>;
    };

    const categoryAggBySlug = new Map<string, CategoryAgg>();
    const itemAggById = new Map<
      string,
      { name: string; categoryName: string; categoryEmoji: string; count: number }
    >();

    for (const c of allCategories) {
      categoryAggBySlug.set(c.slug, {
        slug: c.slug,
        name: c.name,
        emoji: c.emoji ?? "🍽️",
        itemCount: c.menuItems.length,
        pickCount: 0,
        uniqueUserIds: new Set(),
        perUserPickedItemIds: new Map(),
      });
      for (const mi of c.menuItems) {
        itemAggById.set(mi.id, {
          name: mi.name,
          categoryName: c.name,
          categoryEmoji: c.emoji ?? "🍽️",
          count: 0,
        });
      }
    }

    const methodCounts = { CATEGORY: 0, RANDOM: 0, UNKNOWN: 0 };
    const userAgg = new Map<string, { name: string; count: number; categorySlugs: Set<string> }>();
    const dailyCounts = new Map<string, number>();

    for (const p of allPicks) {
      const catSlug = p.menuItem.category.slug;
      const catAgg = categoryAggBySlug.get(catSlug);
      if (catAgg) {
        catAgg.pickCount += 1;
        catAgg.uniqueUserIds.add(p.userId);
        if (!catAgg.perUserPickedItemIds.has(p.userId)) {
          catAgg.perUserPickedItemIds.set(p.userId, new Set());
        }
        catAgg.perUserPickedItemIds.get(p.userId)!.add(p.menuItemId);
      }

      const itemAgg = itemAggById.get(p.menuItemId);
      if (itemAgg) itemAgg.count += 1;

      if (p.method === "CATEGORY") methodCounts.CATEGORY += 1;
      else if (p.method === "RANDOM") methodCounts.RANDOM += 1;
      else methodCounts.UNKNOWN += 1;

      if (!userAgg.has(p.userId)) {
        userAgg.set(p.userId, { name: p.user.name, count: 0, categorySlugs: new Set() });
      }
      const u = userAgg.get(p.userId)!;
      u.count += 1;
      u.categorySlugs.add(catSlug);

      const dateKey = BANGKOK_DATE.format(p.createdAt);
      dailyCounts.set(dateKey, (dailyCounts.get(dateKey) ?? 0) + 1);
    }

    const totalPicks = allPicks.length;
    const activeUsers = userAgg.size;

    const categories = Array.from(categoryAggBySlug.values())
      .map((c) => {
        const usersWhoTouched = c.uniqueUserIds.size;
        let usersWhoCompleted = 0;
        for (const items of c.perUserPickedItemIds.values()) {
          if (c.itemCount > 0 && items.size >= c.itemCount) usersWhoCompleted += 1;
        }
        return {
          slug: c.slug,
          name: c.name,
          emoji: c.emoji,
          itemCount: c.itemCount,
          pickCount: c.pickCount,
          sharePercent: totalPicks > 0 ? round1((c.pickCount / totalPicks) * 100) : 0,
          uniqueUsers: usersWhoTouched,
          completionRatePercent:
            usersWhoTouched > 0 ? round1((usersWhoCompleted / usersWhoTouched) * 100) : 0,
        };
      })
      .sort((a, b) => b.pickCount - a.pickCount);

    const allItems = Array.from(itemAggById.values());
    const topItems = allItems
      .filter((i) => i.count > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
    const neverPicked = allItems
      .filter((i) => i.count === 0)
      .map(({ name, categoryName, categoryEmoji }) => ({ name, categoryName, categoryEmoji }));

    const totalResets = allResets.length;
    const avgClearedCount =
      totalResets > 0 ? round1(allResets.reduce((s, r) => s + r.clearedCount, 0) / totalResets) : 0;
    const maxClearedCount = totalResets > 0 ? Math.max(...allResets.map((r) => r.clearedCount)) : 0;

    const dailyPicks: { date: string; count: number }[] = [];
    const now = new Date();
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const key = BANGKOK_DATE.format(d);
      dailyPicks.push({ date: key, count: dailyCounts.get(key) ?? 0 });
    }

    const topUsers = Array.from(userAgg.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
      .map((u) => ({
        name: u.name,
        pickCount: u.count,
        categoriesTouched: u.categorySlugs.size,
      }));

    const totalMethodPicks = methodCounts.CATEGORY + methodCounts.RANDOM + methodCounts.UNKNOWN;

    // ---- Feedback (like/dislike) aggregation ----
    const voteAggById = new Map<string, { likes: number; dislikes: number }>();
    for (const f of allFeedback) {
      if (!voteAggById.has(f.menuItemId)) {
        voteAggById.set(f.menuItemId, { likes: 0, dislikes: 0 });
      }
      const agg = voteAggById.get(f.menuItemId)!;
      if (f.vote === "LIKE") agg.likes += 1;
      else agg.dislikes += 1;
    }

    const feedbackRows: FeedbackRow[] = [];
    const noFeedback: { name: string; categoryName: string; categoryEmoji: string }[] = [];

    for (const [itemId, item] of itemAggById.entries()) {
      const votes = voteAggById.get(itemId);
      if (!votes || votes.likes + votes.dislikes === 0) {
        noFeedback.push({
          name: item.name,
          categoryName: item.categoryName,
          categoryEmoji: item.categoryEmoji,
        });
        continue;
      }
      const total = votes.likes + votes.dislikes;
      feedbackRows.push({
        menuItemId: itemId,
        name: item.name,
        categoryName: item.categoryName,
        categoryEmoji: item.categoryEmoji,
        likes: votes.likes,
        dislikes: votes.dislikes,
        total,
        likePercent: round1((votes.likes / total) * 100),
      });
    }

    const totalLikes = allFeedback.filter((f) => f.vote === "LIKE").length;
    const totalDislikes = allFeedback.length - totalLikes;

    const mostLiked = [...feedbackRows]
      .sort((a, b) => b.likes - a.likes || b.likePercent - a.likePercent)
      .slice(0, 10);
    const mostDisliked = [...feedbackRows]
      .sort((a, b) => b.dislikes - a.dislikes || a.likePercent - b.likePercent)
      .slice(0, 10);
    // Worth considering for removal: enough signal to trust, and mostly negative.
    const dropCandidates = feedbackRows
      .filter((r) => r.total >= 3 && r.likePercent < 40)
      .sort((a, b) => a.likePercent - b.likePercent || b.total - a.total);

    const payload: InsightsResponse = {
      generatedAt: new Date().toISOString(),
      totals: {
        users: totalUsers,
        activeUsers,
        picks: totalPicks,
        resets: totalResets,
        votes: allFeedback.length,
      },
      pickMethod: {
        category: methodCounts.CATEGORY,
        random: methodCounts.RANDOM,
        unknown: methodCounts.UNKNOWN,
        categoryPercent:
          totalMethodPicks > 0 ? round1((methodCounts.CATEGORY / totalMethodPicks) * 100) : 0,
        randomPercent:
          totalMethodPicks > 0 ? round1((methodCounts.RANDOM / totalMethodPicks) * 100) : 0,
      },
      categories,
      topItems,
      neverPicked,
      resetStats: { totalResets, avgClearedCount, maxClearedCount },
      dailyPicks,
      topUsers,
      feedback: {
        overall: {
          likes: totalLikes,
          dislikes: totalDislikes,
          likePercent:
            allFeedback.length > 0 ? round1((totalLikes / allFeedback.length) * 100) : 0,
        },
        mostLiked,
        mostDisliked,
        dropCandidates,
        noFeedback,
      },
    };

    return NextResponse.json(payload);
  } catch (err) {
    console.error("GET /api/insights failed:", err);
    return NextResponse.json(
      { error: "เชื่อมต่อฐานข้อมูลไม่ได้ กรุณาลองใหม่อีกครั้ง" },
      { status: 500 }
    );
  }
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
