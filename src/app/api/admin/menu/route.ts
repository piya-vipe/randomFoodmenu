import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkAdminKey, toStringList } from "@/lib/adminAuth";
import type { AdminCategory, AdminMenuItem } from "@/lib/types";

export const dynamic = "force-dynamic";

/** GET — full menu listing with pick/vote counts, for the admin table. */
export async function GET(req: NextRequest) {
  const denied = checkAdminKey(req);
  if (denied) return denied;

  try {
    const categories = await prisma.category.findMany({
      orderBy: { order: "asc" },
      include: {
        menuItems: {
          orderBy: { name: "asc" },
          include: {
            _count: { select: { picks: true } },
            feedback: { select: { vote: true } },
          },
        },
      },
    });

    const adminCategories: AdminCategory[] = categories.map((c) => ({
      id: c.id,
      slug: c.slug,
      name: c.name,
      emoji: c.emoji ?? "🍽️",
      order: c.order,
      source: c.source,
      itemCount: c.menuItems.length,
    }));

    const menuItems: AdminMenuItem[] = categories.flatMap((c) =>
      c.menuItems.map((mi) => ({
        id: mi.id,
        name: mi.name,
        steps: mi.steps,
        ingredients: mi.ingredients,
        servingSize: mi.servingSize,
        source: mi.source,
        isActive: mi.isActive,
        categorySlug: c.slug,
        categoryName: c.name,
        categoryEmoji: c.emoji ?? "🍽️",
        pickCount: mi._count.picks,
        likes: mi.feedback.filter((f) => f.vote === "LIKE").length,
        dislikes: mi.feedback.filter((f) => f.vote === "DISLIKE").length,
      }))
    );

    return NextResponse.json({ categories: adminCategories, menuItems });
  } catch (err) {
    console.error("GET /api/admin/menu failed:", err);
    return NextResponse.json({ error: "โหลดข้อมูลไม่สำเร็จ" }, { status: 500 });
  }
}

/** POST — create a new menu item (always MANUAL, so the seed never removes it). */
export async function POST(req: NextRequest) {
  const denied = checkAdminKey(req);
  if (denied) return denied;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const b = body as Record<string, unknown>;
  const name = typeof b.name === "string" ? b.name.trim() : "";
  const categorySlug = typeof b.categorySlug === "string" ? b.categorySlug : "";
  const servingSize =
    typeof b.servingSize === "string" && b.servingSize.trim() ? b.servingSize.trim() : "1 ที่";
  const steps = toStringList(b.steps);
  const ingredients = toStringList(b.ingredients);

  if (!name) return NextResponse.json({ error: "กรุณาใส่ชื่อเมนู" }, { status: 400 });
  if (!categorySlug) return NextResponse.json({ error: "กรุณาเลือกหมวดหมู่" }, { status: 400 });
  if (steps.length === 0)
    return NextResponse.json({ error: "กรุณาใส่วิธีทำอย่างน้อย 1 ขั้นตอน" }, { status: 400 });

  try {
    const category = await prisma.category.findUnique({ where: { slug: categorySlug } });
    if (!category) {
      return NextResponse.json({ error: "ไม่พบหมวดหมู่นี้" }, { status: 404 });
    }

    const existing = await prisma.menuItem.findUnique({
      where: { categoryId_name: { categoryId: category.id, name } },
    });
    if (existing) {
      return NextResponse.json(
        { error: "มีเมนูชื่อนี้ในหมวดนี้อยู่แล้ว" },
        { status: 409 }
      );
    }

    const created = await prisma.menuItem.create({
      data: {
        name,
        steps,
        ingredients,
        servingSize,
        categoryId: category.id,
        source: "MANUAL",
      },
    });

    return NextResponse.json({ ok: true, id: created.id });
  } catch (err) {
    console.error("POST /api/admin/menu failed:", err);
    return NextResponse.json({ error: "บันทึกไม่สำเร็จ" }, { status: 500 });
  }
}

/** PATCH — edit an existing menu item (works for SEED rows too, but note that
 *  the next deploy's seed will overwrite SEED rows back to their seed values). */
export async function PATCH(req: NextRequest) {
  const denied = checkAdminKey(req);
  if (denied) return denied;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const b = body as Record<string, unknown>;
  const id = typeof b.id === "string" ? b.id : "";
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  const data: Record<string, unknown> = {};
  if (typeof b.name === "string" && b.name.trim()) data.name = b.name.trim();
  if (typeof b.servingSize === "string" && b.servingSize.trim())
    data.servingSize = b.servingSize.trim();
  if (b.steps !== undefined) data.steps = toStringList(b.steps);
  if (b.ingredients !== undefined) data.ingredients = toStringList(b.ingredients);
  if (typeof b.isActive === "boolean") data.isActive = b.isActive;

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "ไม่มีข้อมูลที่จะแก้ไข" }, { status: 400 });
  }

  try {
    await prisma.menuItem.update({ where: { id }, data });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("PATCH /api/admin/menu failed:", err);
    return NextResponse.json({ error: "แก้ไขไม่สำเร็จ" }, { status: 500 });
  }
}

/** DELETE — permanently remove a menu item (and its picks/feedback). */
export async function DELETE(req: NextRequest) {
  const denied = checkAdminKey(req);
  if (denied) return denied;

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  try {
    await prisma.menuItem.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("DELETE /api/admin/menu failed:", err);
    return NextResponse.json({ error: "ลบไม่สำเร็จ" }, { status: 500 });
  }
}
