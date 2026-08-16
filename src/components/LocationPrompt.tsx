"use client";

import { useState } from "react";

/**
 * Asks whether the visitor is willing to share their location, and only then
 * triggers the browser's own permission prompt. Entirely skippable — the app
 * works identically without it.
 */
export default function LocationPrompt({
  onShare,
  onSkip,
}: {
  onShare: (coords: { latitude: number; longitude: number; accuracy: number }) => void;
  onSkip: () => void;
}) {
  const [status, setStatus] = useState<"idle" | "asking" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  function requestLocation() {
    if (!("geolocation" in navigator)) {
      setStatus("error");
      setMessage("เบราว์เซอร์นี้ไม่รองรับการระบุตำแหน่ง");
      return;
    }

    setStatus("asking");
    setMessage(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        onShare({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        });
      },
      (err) => {
        setStatus("error");
        setMessage(
          err.code === err.PERMISSION_DENIED
            ? "ไม่ได้รับอนุญาตให้เข้าถึงตำแหน่ง — ใช้งานต่อได้ตามปกติ"
            : "ระบุตำแหน่งไม่สำเร็จ — ใช้งานต่อได้ตามปกติ"
        );
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
    );
  }

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/40 px-4 animate-fade-in">
      <div className="w-full max-w-sm rounded-3xl bg-surface p-7 text-center shadow-xl animate-pop-in">
        <div className="mb-3 text-5xl">📍</div>
        <h2 className="text-lg font-semibold">แชร์ตำแหน่งของคุณไหม?</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          โปรเจกต์นี้เก็บข้อมูลตำแหน่งเพื่อดูว่าคนแต่ละพื้นที่ชอบเมนูแบบไหน
          <br />
          <b className="text-foreground">ไม่แชร์ก็ใช้งานได้ครบทุกฟีเจอร์</b>
        </p>

        {message && (
          <p className="mt-3 rounded-lg bg-surface-muted px-3 py-2 text-xs text-muted-foreground">
            {message}
          </p>
        )}

        <div className="mt-5 flex flex-col gap-2">
          {status !== "error" && (
            <button
              onClick={requestLocation}
              disabled={status === "asking"}
              className="w-full rounded-xl bg-primary px-4 py-3 font-medium text-primary-foreground transition hover:bg-primary-hover disabled:opacity-60"
            >
              {status === "asking" ? "กำลังขอตำแหน่ง..." : "แชร์ตำแหน่ง"}
            </button>
          )}
          <button
            onClick={onSkip}
            className="w-full rounded-xl border border-border bg-surface px-4 py-3 font-medium transition hover:bg-surface-muted"
          >
            {status === "error" ? "เข้าใช้งานต่อ" : "ไม่ต้องตอนนี้"}
          </button>
        </div>

        <p className="mt-4 text-xs text-muted-foreground">
          คุณยกเลิกและลบข้อมูลตำแหน่งได้ทุกเมื่อจากปุ่มในหน้าหลัก
        </p>
      </div>
    </div>
  );
}
