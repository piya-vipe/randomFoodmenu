import { NextRequest, NextResponse } from "next/server";

/**
 * Admin/insights endpoints are gated behind a shared secret supplied via the
 * `key` query param (or `x-admin-key` header). Fails closed: if ADMIN_KEY is
 * not configured on the server, nothing is served.
 *
 * Falls back to INSIGHTS_KEY so an existing deployment keeps working with the
 * single key it already has configured.
 */
export function checkAdminKey(req: NextRequest): NextResponse | null {
  const configuredKey = process.env.ADMIN_KEY || process.env.INSIGHTS_KEY;
  const providedKey =
    req.nextUrl.searchParams.get("key") ?? req.headers.get("x-admin-key");

  if (!configuredKey) {
    return NextResponse.json(
      { error: "ยังไม่ได้ตั้งค่า ADMIN_KEY / INSIGHTS_KEY บนเซิร์ฟเวอร์" },
      { status: 501 }
    );
  }
  if (!providedKey || providedKey !== configuredKey) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

/** Coerce arbitrary JSON into a clean string[] of trimmed, non-empty lines. */
export function toStringList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .filter((v): v is string => typeof v === "string")
      .map((v) => v.trim())
      .filter(Boolean);
  }
  if (typeof value === "string") {
    return value
      .split("\n")
      .map((v) => v.trim())
      .filter(Boolean);
  }
  return [];
}
