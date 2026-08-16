import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkAdminKey } from "@/lib/adminAuth";
import { mapHeader, parseCsv, splitList } from "@/lib/csv";
import type { ImportReport, ImportRowResult } from "@/lib/types";

export const dynamic = "force-dynamic";

/** Slugify a category name; Thai names fall back to a stable hash-ish suffix. */
function slugify(input: string, index: number): string {
  const base = input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return base || `cat-${Date.now().toString(36)}-${index}`;
}

export async function POST(req: NextRequest) {
  const denied = checkAdminKey(req);
  if (denied) return denied;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const csv = typeof (body as { csv?: unknown })?.csv === "string" ? (body as { csv: string }).csv : "";
  const dryRun = (body as { dryRun?: unknown })?.dryRun !== false;

  if (!csv.trim()) {
    return NextResponse.json({ error: "ไฟล์ CSV ว่างเปล่า" }, { status: 400 });
  }

  const rows = parseCsv(csv);
  if (rows.length < 2) {
    return NextResponse.json(
      { error: "CSV ต้องมีบรรทัดหัวตาราง และอย่างน้อย 1 บรรทัดข้อมูล" },
      { status: 400 }
    );
  }

  const [headerRow, ...dataRows] = rows;
  const col = mapHeader(headerRow);

  const missing: string[] = [];
  if (col.category_name === undefined) missing.push("category_name");
  if (col.menu_name === undefined) missing.push("menu_name");
  if (col.steps === undefined) missing.push("steps");
  if (missing.length > 0) {
    return NextResponse.json(
      { error: `CSV ขาดคอลัมน์ที่จำเป็น: ${missing.join(", ")}` },
      { status: 400 }
    );
  }

  try {
    const existingCategories = await prisma.category.findMany({
      include: { menuItems: { select: { id: true, name: true } } },
    });

    // Look categories up by name (what the CSV carries) and by slug.
    const catByName = new Map(existingCategories.map((c) => [c.name.trim().toLowerCase(), c]));
    const catBySlug = new Map(existingCategories.map((c) => [c.slug, c]));

    const results: ImportRowResult[] = [];
    // Categories that don't exist yet, keyed by lowercased name.
    const pendingCategories = new Map<string, { name: string; emoji: string }>();
    // Track (categoryKey -> menu names) seen in this file to catch duplicates.
    const seenInFile = new Map<string, Set<string>>();

    let willCreate = 0;
    let willUpdate = 0;

    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i];
      const lineNo = i + 2; // +1 for header, +1 for 1-based lines

      const cell = (idx: number | undefined) =>
        idx === undefined ? "" : (row[idx] ?? "").trim();

      const categoryName = cell(col.category_name);
      const categoryEmoji = cell(col.category_emoji) || "🍽️";
      const menuName = cell(col.menu_name);
      const servingSize = cell(col.serving_size) || "1 ที่";
      const ingredients = splitList(cell(col.ingredients));
      const steps = splitList(cell(col.steps));

      if (!categoryName || !menuName) {
        results.push({
          line: lineNo,
          menuName: menuName || "(ไม่มีชื่อ)",
          categoryName: categoryName || "(ไม่มีหมวด)",
          action: "error",
          message: "ต้องมีทั้ง category_name และ menu_name",
        });
        continue;
      }
      if (steps.length === 0) {
        results.push({
          line: lineNo,
          menuName,
          categoryName,
          action: "error",
          message: "ต้องมีวิธีทำอย่างน้อย 1 ขั้นตอน (คั่นด้วย |)",
        });
        continue;
      }

      const catKey = categoryName.toLowerCase();
      const existingCat = catByName.get(catKey) ?? catBySlug.get(catKey);

      // Duplicate menu name within the same category, inside this one file.
      if (!seenInFile.has(catKey)) seenInFile.set(catKey, new Set());
      const seen = seenInFile.get(catKey)!;
      if (seen.has(menuName.toLowerCase())) {
        results.push({
          line: lineNo,
          menuName,
          categoryName,
          action: "error",
          message: "ชื่อเมนูซ้ำกับบรรทัดก่อนหน้าในไฟล์เดียวกัน",
        });
        continue;
      }
      seen.add(menuName.toLowerCase());

      let categoryIsNew = false;
      if (!existingCat) {
        if (!pendingCategories.has(catKey)) {
          pendingCategories.set(catKey, { name: categoryName, emoji: categoryEmoji });
        }
        categoryIsNew = true;
      }

      const existingItem = existingCat?.menuItems.find(
        (mi) => mi.name.trim().toLowerCase() === menuName.toLowerCase()
      );

      const action = existingItem ? "update" : "create";
      if (action === "create") willCreate += 1;
      else willUpdate += 1;

      results.push({
        line: lineNo,
        menuName,
        categoryName,
        action,
        message: categoryIsNew ? "จะสร้างหมวดหมู่ใหม่ด้วย" : undefined,
        ingredientCount: ingredients.length,
        stepCount: steps.length,
        servingSize,
      });
    }

    const report: ImportReport = {
      dryRun,
      totalRows: dataRows.length,
      created: willCreate,
      updated: willUpdate,
      errors: results.filter((r) => r.action === "error").length,
      categoriesToCreate: Array.from(pendingCategories.values()).map((c) => c.name),
      rows: results,
    };

    // Validation-only pass: report what would happen and stop.
    if (dryRun) {
      return NextResponse.json(report);
    }

    // ---- Commit ----
    // Create any missing categories first so menu rows can attach to them.
    const maxOrderAgg = await prisma.category.aggregate({ _max: { order: true } });
    let nextOrder = (maxOrderAgg._max.order ?? 0) + 1;

    const createdCatBySlugKey = new Map<string, string>(); // catKey -> categoryId
    let catIndex = 0;
    for (const [catKey, cat] of pendingCategories.entries()) {
      const created = await prisma.category.create({
        data: {
          slug: slugify(cat.name, catIndex++),
          name: cat.name,
          emoji: cat.emoji,
          order: nextOrder++,
          source: "MANUAL",
        },
      });
      createdCatBySlugKey.set(catKey, created.id);
    }

    let created = 0;
    let updated = 0;

    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i];
      const cell = (idx: number | undefined) =>
        idx === undefined ? "" : (row[idx] ?? "").trim();

      const categoryName = cell(col.category_name);
      const menuName = cell(col.menu_name);
      const servingSize = cell(col.serving_size) || "1 ที่";
      const ingredients = splitList(cell(col.ingredients));
      const steps = splitList(cell(col.steps));

      if (!categoryName || !menuName || steps.length === 0) continue;

      const catKey = categoryName.toLowerCase();
      const categoryId =
        catByName.get(catKey)?.id ?? catBySlug.get(catKey)?.id ?? createdCatBySlugKey.get(catKey);
      if (!categoryId) continue;

      const existing = await prisma.menuItem.findUnique({
        where: { categoryId_name: { categoryId, name: menuName } },
      });

      await prisma.menuItem.upsert({
        where: { categoryId_name: { categoryId, name: menuName } },
        update: { steps, ingredients, servingSize },
        create: {
          name: menuName,
          steps,
          ingredients,
          servingSize,
          categoryId,
          source: "MANUAL",
        },
      });

      if (existing) updated += 1;
      else created += 1;
    }

    return NextResponse.json({ ...report, dryRun: false, created, updated });
  } catch (err) {
    console.error("POST /api/admin/import failed:", err);
    return NextResponse.json({ error: "นำเข้าไม่สำเร็จ" }, { status: 500 });
  }
}
