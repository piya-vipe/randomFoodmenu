"use client";

import { useEffect, useRef, useState } from "react";
import type { MapPin } from "@/lib/types";

const MAPS_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

// Minimal shape of the bits of the Maps JS API we touch.
type GMap = { fitBounds: (b: unknown) => void; setCenter: (c: unknown) => void; setZoom: (z: number) => void };
type GoogleMaps = {
  maps: {
    Map: new (el: HTMLElement, opts: Record<string, unknown>) => GMap;
    Marker: new (opts: Record<string, unknown>) => { addListener: (e: string, cb: () => void) => void };
    InfoWindow: new (opts: Record<string, unknown>) => {
      open: (map: GMap, marker: unknown) => void;
      setContent: (c: string) => void;
    };
    LatLngBounds: new () => { extend: (p: { lat: number; lng: number }) => void };
  };
};

declare global {
  interface Window {
    google?: GoogleMaps;
    __initMenuPickerMap?: () => void;
  }
}

/** Loads the Maps JS API once and resolves when ready. */
function loadGoogleMaps(): Promise<GoogleMaps> {
  return new Promise((resolve, reject) => {
    if (window.google?.maps) return resolve(window.google);
    if (!MAPS_KEY) return reject(new Error("no-key"));

    const existing = document.getElementById("gmaps-script");
    if (existing) {
      existing.addEventListener("load", () => resolve(window.google!));
      existing.addEventListener("error", () => reject(new Error("load-failed")));
      return;
    }

    const script = document.createElement("script");
    script.id = "gmaps-script";
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(MAPS_KEY)}`;
    script.async = true;
    script.onload = () => resolve(window.google!);
    script.onerror = () => reject(new Error("load-failed"));
    document.head.appendChild(script);
  });
}

export default function UserMap({ pins }: { pins: MapPin[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  // Only tracks async outcomes; the "no key" case is known at render time.
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    if (!MAPS_KEY || pins.length === 0) return;

    let cancelled = false;

    loadGoogleMaps()
      .then((google) => {
        if (cancelled || !containerRef.current) return;

        const map = new google.maps.Map(containerRef.current, {
          center: { lat: pins[0].latitude, lng: pins[0].longitude },
          zoom: 11,
          mapTypeControl: false,
          streetViewControl: false,
        });

        const bounds = new google.maps.LatLngBounds();
        const info = new google.maps.InfoWindow({ content: "" });

        for (const p of pins) {
          const position = { lat: p.latitude, lng: p.longitude };
          bounds.extend(position);
          const marker = new google.maps.Marker({ position, map, title: p.userName });
          marker.addListener("click", () => {
            info.setContent(
              `<div style="font-size:13px"><b>${escapeHtml(p.userName)}</b><br/>` +
                `${p.latitude.toFixed(5)}, ${p.longitude.toFixed(5)}<br/>` +
                `<span style="color:#666">${new Date(p.recordedAt).toLocaleString("th-TH")}</span></div>`
            );
            info.open(map, marker);
          });
        }

        if (pins.length > 1) map.fitBounds(bounds);
        setStatus("ready");
      })
      .catch(() => {
        if (!cancelled) setStatus("error");
      });

    return () => {
      cancelled = true;
    };
  }, [pins]);

  const noKey = !MAPS_KEY;

  if (noKey || status === "error") {
    return (
      <div className="rounded-xl border border-dashed border-border p-5 text-sm text-muted-foreground">
        <p className="mb-2 font-medium text-foreground">
          {noKey ? "ยังไม่ได้ตั้งค่าแผนที่" : "โหลดแผนที่ไม่สำเร็จ"}
        </p>
        <p className="mb-3">
          {noKey ? (
            <>
              ตั้งค่า <code className="rounded bg-surface-muted px-1">NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code>{" "}
              เพื่อแสดงแผนที่ — ระหว่างนี้ดูรายการพิกัดด้านล่างได้
            </>
          ) : (
            "ตรวจสอบว่า API key ถูกต้องและเปิดใช้ Maps JavaScript API แล้ว"
          )}
        </p>
        <PinList pins={pins} />
      </div>
    );
  }

  if (pins.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
        ยังไม่มีผู้ใช้คนไหนแชร์ตำแหน่ง
      </div>
    );
  }

  return (
    <div>
      <div ref={containerRef} className="h-80 w-full rounded-xl border border-border bg-surface-muted" />
      {status === "loading" && (
        <p className="mt-2 text-center text-xs text-muted-foreground">กำลังโหลดแผนที่...</p>
      )}
    </div>
  );
}

function PinList({ pins }: { pins: MapPin[] }) {
  if (pins.length === 0) {
    return <p className="text-xs">ยังไม่มีผู้ใช้คนไหนแชร์ตำแหน่ง</p>;
  }
  return (
    <ul className="flex flex-col gap-1.5">
      {pins.map((p) => (
        <li key={p.userId} className="flex items-center justify-between gap-2 text-xs">
          <span className="truncate font-medium text-foreground">{p.userName}</span>
          <a
            href={`https://www.google.com/maps?q=${p.latitude},${p.longitude}`}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 underline"
          >
            {p.latitude.toFixed(4)}, {p.longitude.toFixed(4)}
          </a>
        </li>
      ))}
    </ul>
  );
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
