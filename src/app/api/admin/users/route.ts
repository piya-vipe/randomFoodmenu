import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkAdminKey } from "@/lib/adminAuth";
import type { UserDetail, UsersResponse, UserSummary } from "@/lib/types";

export const dynamic = "force-dynamic";

const BANGKOK = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok" });

export async function GET(req: NextRequest) {
  const denied = checkAdminKey(req);
  if (denied) return denied;

  const userId = req.nextUrl.searchParams.get("userId");

  try {
    // ---- Single-user drill-down ----
    if (userId) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          visits: { orderBy: { createdAt: "desc" } },
          picks: {
            orderBy: { createdAt: "desc" },
            include: { menuItem: { include: { category: true } } },
          },
          feedback: {
            include: { menuItem: { include: { category: true } } },
          },
          resets: { orderBy: { createdAt: "desc" } },
        },
      });

      if (!user) {
        return NextResponse.json({ error: "ไม่พบผู้ใช้นี้" }, { status: 404 });
      }

      const voteByItem = new Map(user.feedback.map((f) => [f.menuItemId, f.vote]));

      const detail: UserDetail = {
        id: user.id,
        name: user.name,
        createdAt: user.createdAt.toISOString(),
        pickCount: user.picks.length,
        likeCount: user.feedback.filter((f) => f.vote === "LIKE").length,
        dislikeCount: user.feedback.filter((f) => f.vote === "DISLIKE").length,
        resetCount: user.resets.length,
        visitCount: user.visits.length,
        lastSeen: user.visits[0]?.createdAt.toISOString() ?? null,
        visits: user.visits.map((v) => ({
          id: v.id,
          browser: v.browser ?? "Unknown",
          os: v.os ?? "Unknown",
          deviceType: v.deviceType ?? "unknown",
          locationConsent: v.locationConsent,
          latitude: v.latitude,
          longitude: v.longitude,
          accuracy: v.accuracy,
          createdAt: v.createdAt.toISOString(),
        })),
        picks: user.picks.map((p) => ({
          id: p.id,
          menuItemName: p.menuItem.name,
          categoryName: p.menuItem.category.name,
          categoryEmoji: p.menuItem.category.emoji ?? "🍽️",
          method: p.method,
          vote: voteByItem.get(p.menuItemId) ?? null,
          createdAt: p.createdAt.toISOString(),
        })),
        categoryBreakdown: buildCategoryBreakdown(user.picks),
        dailyActivity: buildDailyActivity(user.picks.map((p) => p.createdAt)),
      };

      return NextResponse.json(detail);
    }

    // ---- List view ----
    const users = await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        visits: { orderBy: { createdAt: "desc" } },
        _count: { select: { picks: true, feedback: true, resets: true } },
      },
    });

    const summaries: UserSummary[] = users.map((u) => {
      const latest = u.visits[0];
      return {
        id: u.id,
        name: u.name,
        createdAt: u.createdAt.toISOString(),
        pickCount: u._count.picks,
        voteCount: u._count.feedback,
        resetCount: u._count.resets,
        visitCount: u.visits.length,
        lastSeen: latest?.createdAt.toISOString() ?? null,
        lastDevice: latest
          ? {
              browser: latest.browser ?? "Unknown",
              os: latest.os ?? "Unknown",
              deviceType: latest.deviceType ?? "unknown",
            }
          : null,
        hasLocation: u.visits.some((v) => v.locationConsent && v.latitude !== null),
      };
    });

    // Device mix across the latest visit of each user.
    const deviceCounts = new Map<string, number>();
    const browserCounts = new Map<string, number>();
    const osCounts = new Map<string, number>();
    for (const s of summaries) {
      if (!s.lastDevice) continue;
      deviceCounts.set(s.lastDevice.deviceType, (deviceCounts.get(s.lastDevice.deviceType) ?? 0) + 1);
      browserCounts.set(s.lastDevice.browser, (browserCounts.get(s.lastDevice.browser) ?? 0) + 1);
      osCounts.set(s.lastDevice.os, (osCounts.get(s.lastDevice.os) ?? 0) + 1);
    }
    const toSorted = (m: Map<string, number>) =>
      Array.from(m.entries())
        .map(([label, count]) => ({ label, count }))
        .sort((a, b) => b.count - a.count);

    // Map pins: latest consented location per user.
    const locatedVisits = await prisma.visit.findMany({
      where: { locationConsent: true, latitude: { not: null }, longitude: { not: null } },
      orderBy: { createdAt: "desc" },
      include: { user: { select: { id: true, name: true } } },
    });

    const seenUsers = new Set<string>();
    const pins = locatedVisits
      .filter((v) => {
        if (seenUsers.has(v.userId)) return false;
        seenUsers.add(v.userId);
        return true;
      })
      .map((v) => ({
        userId: v.userId,
        userName: v.user.name,
        latitude: v.latitude!,
        longitude: v.longitude!,
        accuracy: v.accuracy,
        recordedAt: v.createdAt.toISOString(),
      }));

    const payload: UsersResponse = {
      users: summaries,
      deviceMix: toSorted(deviceCounts),
      browserMix: toSorted(browserCounts),
      osMix: toSorted(osCounts),
      pins,
      locationConsentCount: pins.length,
    };

    return NextResponse.json(payload);
  } catch (err) {
    console.error("GET /api/admin/users failed:", err);
    return NextResponse.json({ error: "โหลดข้อมูลไม่สำเร็จ" }, { status: 500 });
  }
}

type PickWithCategory = {
  createdAt: Date;
  menuItem: { category: { name: string; emoji: string | null } };
};

function buildCategoryBreakdown(picks: PickWithCategory[]) {
  const counts = new Map<string, { name: string; emoji: string; count: number }>();
  for (const p of picks) {
    const key = p.menuItem.category.name;
    if (!counts.has(key)) {
      counts.set(key, { name: key, emoji: p.menuItem.category.emoji ?? "🍽️", count: 0 });
    }
    counts.get(key)!.count += 1;
  }
  const total = picks.length;
  return Array.from(counts.values())
    .map((c) => ({
      ...c,
      percent: total > 0 ? Math.round((c.count / total) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.count - a.count);
}

function buildDailyActivity(dates: Date[]) {
  const counts = new Map<string, number>();
  for (const d of dates) {
    const key = BANGKOK.format(d);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const out: { date: string; count: number }[] = [];
  const now = new Date();
  for (let i = 13; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 86400000);
    const key = BANGKOK.format(d);
    out.push({ date: key, count: counts.get(key) ?? 0 });
  }
  return out;
}
