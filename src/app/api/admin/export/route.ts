import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkAdminKey } from "@/lib/adminAuth";
import { joinList, MENU_CSV_COLUMNS, toCsv } from "@/lib/csv";

export const dynamic = "force-dynamic";

/** GET — every menu in the database as a CSV, in the same shape import expects. */
export async function GET(req: NextRequest) {
  const denied = checkAdminKey(req);
  if (denied) return denied;

  try {
    const categories = await prisma.category.findMany({
      orderBy: { order: "asc" },
      include: { menuItems: { orderBy: { name: "asc" } } },
    });

    const rows: string[][] = [[...MENU_CSV_COLUMNS]];
    for (const c of categories) {
      for (const mi of c.menuItems) {
        rows.push([
          c.name,
          c.emoji ?? "🍽️",
          mi.name,
          mi.servingSize,
          joinList(mi.ingredients),
          joinList(mi.steps),
        ]);
      }
    }

    const csv = toCsv(rows);
    const stamp = new Date().toISOString().slice(0, 10);

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="menu-export-${stamp}.csv"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("GET /api/admin/export failed:", err);
    return NextResponse.json({ error: "ส่งออกไม่สำเร็จ" }, { status: 500 });
  }
}
