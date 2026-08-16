/**
 * Minimal RFC-4180 CSV handling, kept dependency-free.
 * Handles quoted fields, embedded commas/newlines, and "" escapes.
 */

/** Character used inside a single cell to separate list items (ingredients, steps). */
export const LIST_SEPARATOR = "|";

/** Strip a UTF-8 BOM, which Excel adds when saving as CSV. */
function stripBom(input: string): string {
  return input.charCodeAt(0) === 0xfeff ? input.slice(1) : input;
}

/** Parse CSV text into rows of raw string cells. Blank lines are dropped. */
export function parseCsv(input: string): string[][] {
  const text = stripBom(input).replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];

    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }

  // Flush trailing field/row (file may not end with a newline).
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows.filter((r) => r.some((cell) => cell.trim() !== ""));
}

/** Quote a single cell if it contains a comma, quote, or newline. */
function escapeCell(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/** Serialize rows to CSV text, prefixed with a BOM so Excel reads Thai correctly. */
export function toCsv(rows: (string | number)[][], { bom = true } = {}): string {
  const body = rows.map((r) => r.map((c) => escapeCell(String(c))).join(",")).join("\r\n");
  return (bom ? "﻿" : "") + body;
}

/** Split a list cell ("a | b | c") into trimmed, non-empty parts. */
export function splitList(cell: string): string[] {
  return cell
    .split(LIST_SEPARATOR)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Join list items back into a single cell. */
export function joinList(items: string[]): string {
  return items.join(` ${LIST_SEPARATOR} `);
}

/** Canonical column order for the menu import/export format. */
export const MENU_CSV_COLUMNS = [
  "category_name",
  "category_emoji",
  "menu_name",
  "serving_size",
  "ingredients",
  "steps",
] as const;

export type MenuCsvColumn = (typeof MENU_CSV_COLUMNS)[number];

/**
 * Map a header row to column indices. Tolerant of case, spaces, hyphens, and
 * a few common aliases so a hand-edited or AI-generated file still imports.
 */
export function mapHeader(header: string[]): Partial<Record<MenuCsvColumn, number>> {
  const normalize = (s: string) => s.trim().toLowerCase().replace(/[\s-]+/g, "_");

  const aliases: Record<string, MenuCsvColumn> = {
    category_name: "category_name",
    category: "category_name",
    หมวดหมู่: "category_name",
    category_emoji: "category_emoji",
    emoji: "category_emoji",
    menu_name: "menu_name",
    menu: "menu_name",
    name: "menu_name",
    ชื่อเมนู: "menu_name",
    serving_size: "serving_size",
    serving: "serving_size",
    portion: "serving_size",
    ingredients: "ingredients",
    วัตถุดิบ: "ingredients",
    steps: "steps",
    instructions: "steps",
    วิธีทำ: "steps",
  };

  const map: Partial<Record<MenuCsvColumn, number>> = {};
  header.forEach((raw, i) => {
    const key = aliases[normalize(raw)];
    if (key && map[key] === undefined) map[key] = i;
  });
  return map;
}
