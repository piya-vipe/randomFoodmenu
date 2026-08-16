import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkAdminKey } from "@/lib/adminAuth";

export const dynamic = "force-dynamic";

/** Turn a free-text name into a url-safe slug; falls back to a timestamp for
 *  non-Latin names (Thai category names slugify to an empty string). */
function slugify(input: string): string {
  const base = input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return base || `cat-${Date.now().toString(36)}`;
}

/** POST — create a new MANUAL category. */
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
  const emoji = typeof b.emoji === "string" && b.emoji.trim() ? b.emoji.trim() : "🍽️";
  const slug = typeof b.slug === "string" && b.slug.trim() ? slugify(b.slug) : slugify(name);

  if (!name) return NextResponse.json({ error: "กรุณาใส่ชื่อหมวดหมู่" }, { status: 400 });

  try {
    const existing = await prisma.category.findUnique({ where: { slug } });
    if (existing) {
      return NextResponse.json({ error: "มีหมวดหมู่ slug นี้อยู่แล้ว" }, { status: 409 });
    }

    const maxOrder = await prisma.category.aggregate({ _max: { order: true } });

    const created = await prisma.category.create({
      data: {
        slug,
        name,
        emoji,
        order: (maxOrder._max.order ?? 0) + 1,
        source: "MANUAL",
      },
    });

    return NextResponse.json({ ok: true, id: created.id, slug: created.slug });
  } catch (err) {
    console.error("POST /api/admin/category failed:", err);
    return NextResponse.json({ error: "บันทึกไม่สำเร็จ" }, { status: 500 });
  }
}

/** DELETE — remove a category and everything under it. */
export async function DELETE(req: NextRequest) {
  const denied = checkAdminKey(req);
  if (denied) return denied;

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  try {
    await prisma.category.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("DELETE /api/admin/category failed:", err);
    return NextResponse.json({ error: "ลบไม่สำเร็จ" }, { status: 500 });
  }
}
