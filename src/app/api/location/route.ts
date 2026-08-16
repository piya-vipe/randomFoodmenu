import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * Stores precise coordinates for a visit. Only ever called after the visitor
 * accepted the browser's own geolocation permission prompt — the browser will
 * not hand out coordinates otherwise, so consent is enforced upstream of this.
 */
export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const b = body as Record<string, unknown>;
  const visitId = typeof b.visitId === "string" ? b.visitId : "";
  const latitude = typeof b.latitude === "number" ? b.latitude : null;
  const longitude = typeof b.longitude === "number" ? b.longitude : null;
  const accuracy = typeof b.accuracy === "number" ? b.accuracy : null;

  if (!visitId) {
    return NextResponse.json({ ok: false, error: "visitId is required" }, { status: 400 });
  }
  if (
    latitude === null ||
    longitude === null ||
    Number.isNaN(latitude) ||
    Number.isNaN(longitude) ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  ) {
    return NextResponse.json({ ok: false, error: "พิกัดไม่ถูกต้อง" }, { status: 400 });
  }

  try {
    await prisma.visit.update({
      where: { id: visitId },
      data: {
        locationConsent: true,
        latitude,
        longitude,
        accuracy,
      },
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("POST /api/location failed:", err);
    return NextResponse.json({ ok: false, error: "บันทึกตำแหน่งไม่สำเร็จ" }, { status: 500 });
  }
}

/** Lets a user withdraw location consent and erase what was stored. */
export async function DELETE(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get("userId");
  if (!userId) {
    return NextResponse.json({ ok: false, error: "userId is required" }, { status: 400 });
  }

  try {
    await prisma.visit.updateMany({
      where: { userId },
      data: {
        locationConsent: false,
        latitude: null,
        longitude: null,
        accuracy: null,
        placeLabel: null,
      },
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("DELETE /api/location failed:", err);
    return NextResponse.json({ ok: false, error: "ลบข้อมูลตำแหน่งไม่สำเร็จ" }, { status: 500 });
  }
}
