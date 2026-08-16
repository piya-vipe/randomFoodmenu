"use client";

import { useCallback, useEffect, useState } from "react";
import type { UserDetail, UsersResponse } from "@/lib/types";
import UserMap from "./UserMap";

const STORAGE_KEY = "menuPicker.adminKey";

const DEVICE_LABEL: Record<string, string> = {
  mobile: "📱 มือถือ",
  tablet: "📲 แท็บเล็ต",
  desktop: "💻 คอมพิวเตอร์",
  unknown: "❓ ไม่ทราบ",
};

function fmt(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" });
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-border bg-surface p-5">
      <h2 className="mb-3 font-semibold">{title}</h2>
      {children}
    </section>
  );
}

function Bar({ label, count, total }: { label: string; count: number; total: number }) {
  const percent = total > 0 ? Math.round((count / total) * 1000) / 10 : 0;
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between text-sm">
        <span>{label}</span>
        <span className="text-muted-foreground">
          {count} ({percent}%)
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-surface-muted">
        <div className="h-full rounded-full bg-primary" style={{ width: `${Math.max(percent, 2)}%` }} />
      </div>
    </div>
  );
}

export default function UsersView() {
  const [key, setKey] = useState("");
  const [keyInput, setKeyInput] = useState("");
  const [data, setData] = useState<UsersResponse | null>(null);
  const [detail, setDetail] = useState<UserDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const load = useCallback(async (k: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/users?key=${encodeURIComponent(k)}`, {
        cache: "no-store",
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error ?? "โหลดข้อมูลไม่สำเร็จ");
      setData(json as UsersResponse);
      setKey(k);
      localStorage.setItem(STORAGE_KEY, k);
    } catch (err) {
      setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    async function restore() {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return;
      setKeyInput(stored);
      await load(stored);
    }
    restore();
  }, [load]);

  async function openUser(userId: string) {
    setError(null);
    try {
      const res = await fetch(
        `/api/admin/users?key=${encodeURIComponent(key)}&userId=${encodeURIComponent(userId)}`,
        { cache: "no-store" }
      );
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error ?? "โหลดข้อมูลไม่สำเร็จ");
      setDetail(json as UserDetail);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
    }
  }

  /* ---------- Key gate ---------- */
  if (!data) {
    return (
      <div className="flex flex-1 items-center justify-center px-4 py-12">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (keyInput.trim()) load(keyInput.trim());
          }}
          className="w-full max-w-sm rounded-3xl border border-border bg-surface p-8"
        >
          <h1 className="mb-1 text-xl font-semibold">🔐 ข้อมูลผู้ใช้</h1>
          <p className="mb-5 text-sm text-muted-foreground">ใส่ Admin key เพื่อเข้าใช้งาน</p>
          <input
            type="password"
            value={keyInput}
            onChange={(e) => setKeyInput(e.target.value)}
            placeholder="Admin key"
            className="w-full rounded-xl border border-border bg-surface-muted px-4 py-3 outline-none focus:border-primary"
          />
          {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={loading || !keyInput.trim()}
            className="mt-4 w-full rounded-xl bg-primary px-4 py-3 font-medium text-primary-foreground transition hover:bg-primary-hover disabled:opacity-60"
          >
            {loading ? "กำลังโหลด..." : "เข้าสู่ระบบ"}
          </button>
        </form>
      </div>
    );
  }

  /* ---------- Single-user drill-down ---------- */
  if (detail) {
    const maxDaily = Math.max(...detail.dailyActivity.map((d) => d.count), 1);
    return (
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-5 px-4 py-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <button
              onClick={() => setDetail(null)}
              className="mb-1 text-sm text-muted-foreground underline"
            >
              ← กลับไปรายชื่อทั้งหมด
            </button>
            <h1 className="text-2xl font-bold">{detail.name}</h1>
            <p className="text-sm text-muted-foreground">
              เข้าร่วมเมื่อ {fmt(detail.createdAt)} · ใช้งานล่าสุด {fmt(detail.lastSeen)}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {[
            ["สุ่มไปแล้ว", detail.pickCount],
            ["👍 ชอบ", detail.likeCount],
            ["👎 ไม่ชอบ", detail.dislikeCount],
            ["รีเซ็ต", detail.resetCount],
            ["เข้าใช้งาน", detail.visitCount],
          ].map(([label, value]) => (
            <div key={label as string} className="rounded-2xl border border-border bg-surface p-4">
              <p className="text-2xl font-bold text-primary">{value}</p>
              <p className="mt-1 text-xs text-muted-foreground">{label}</p>
            </div>
          ))}
        </div>

        <Section title="อุปกรณ์ที่ใช้">
          <ul className="flex flex-col gap-2">
            {detail.visits.slice(0, 10).map((v) => (
              <li
                key={v.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border px-3 py-2 text-sm"
              >
                <span>
                  {DEVICE_LABEL[v.deviceType] ?? v.deviceType} · {v.browser} · {v.os}
                </span>
                <span className="text-xs text-muted-foreground">
                  {v.locationConsent && v.latitude !== null && (
                    <a
                      href={`https://www.google.com/maps?q=${v.latitude},${v.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mr-2 underline"
                    >
                      📍 ดูตำแหน่ง
                    </a>
                  )}
                  {fmt(v.createdAt)}
                </span>
              </li>
            ))}
            {detail.visits.length === 0 && (
              <li className="text-sm text-muted-foreground">
                ยังไม่มีข้อมูลอุปกรณ์ (บันทึกเฉพาะการเข้าใช้งานหลังอัปเดตนี้)
              </li>
            )}
          </ul>
        </Section>

        <Section title="หมวดหมู่ที่ชอบสุ่ม">
          {detail.categoryBreakdown.length > 0 ? (
            <div className="flex flex-col gap-3">
              {detail.categoryBreakdown.map((c) => (
                <Bar
                  key={c.name}
                  label={`${c.emoji} ${c.name}`}
                  count={c.count}
                  total={detail.pickCount}
                />
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">ยังไม่เคยสุ่มเมนู</p>
          )}
        </Section>

        <Section title="ความเคลื่อนไหว 14 วันล่าสุด">
          <div className="flex h-24 items-end gap-1">
            {detail.dailyActivity.map((d) => (
              <div key={d.date} className="flex flex-1 flex-col items-center gap-1">
                <div
                  className="w-full rounded-t bg-primary"
                  style={{ height: `${(d.count / maxDaily) * 100}%`, minHeight: d.count > 0 ? 4 : 1 }}
                  title={`${d.date}: ${d.count}`}
                />
                <span className="text-[9px] text-muted-foreground">{d.date.slice(8)}</span>
              </div>
            ))}
          </div>
        </Section>

        <Section title={`ประวัติการสุ่ม (${detail.picks.length})`}>
          <div className="max-h-96 overflow-y-auto">
            <ul className="flex flex-col gap-2">
              {detail.picks.map((p) => (
                <li
                  key={p.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border px-3 py-2 text-sm"
                >
                  <span>
                    {p.categoryEmoji} {p.menuItemName}
                    {p.vote === "LIKE" && <span className="ml-1.5">👍</span>}
                    {p.vote === "DISLIKE" && <span className="ml-1.5">👎</span>}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {p.method === "RANDOM" ? "🎲 สุ่มทุกหมวด" : p.method === "CATEGORY" ? "เลือกหมวด" : "—"}{" "}
                    · {fmt(p.createdAt)}
                  </span>
                </li>
              ))}
              {detail.picks.length === 0 && (
                <li className="text-sm text-muted-foreground">ยังไม่เคยสุ่มเมนู</li>
              )}
            </ul>
          </div>
        </Section>
      </div>
    );
  }

  /* ---------- List view ---------- */
  const filtered = search
    ? data.users.filter((u) => u.name.toLowerCase().includes(search.toLowerCase()))
    : data.users;
  const withDevice = data.users.filter((u) => u.lastDevice).length;

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-5 px-4 py-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">👥 ข้อมูลผู้ใช้</h1>
          <p className="text-sm text-muted-foreground">
            {data.users.length} คน · แชร์ตำแหน่ง {data.locationConsentCount} คน
          </p>
        </div>
        <div className="flex gap-2">
          <a
            href="/insights"
            className="rounded-lg border border-border px-3 py-2 text-sm hover:bg-surface-muted"
          >
            📊 Insights
          </a>
          <a
            href="/admin"
            className="rounded-lg border border-border px-3 py-2 text-sm hover:bg-surface-muted"
          >
            🍳 จัดการเมนู
          </a>
          <button
            onClick={() => load(key)}
            disabled={loading}
            className="rounded-lg border border-border px-3 py-2 text-sm hover:bg-surface-muted disabled:opacity-60"
          >
            {loading ? "..." : "รีเฟรช"}
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-300 bg-red-50 px-4 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <Section title="🗺️ แผนที่ผู้ใช้ที่แชร์ตำแหน่ง">
        <UserMap pins={data.pins} />
        <p className="mt-3 text-xs text-muted-foreground">
          แสดงเฉพาะผู้ใช้ที่กดอนุญาตแชร์ตำแหน่งเท่านั้น ({data.locationConsentCount} จาก{" "}
          {data.users.length} คน)
        </p>
      </Section>

      <div className="grid gap-5 sm:grid-cols-3">
        <Section title="ชนิดอุปกรณ์">
          {data.deviceMix.length > 0 ? (
            <div className="flex flex-col gap-3">
              {data.deviceMix.map((d) => (
                <Bar
                  key={d.label}
                  label={DEVICE_LABEL[d.label] ?? d.label}
                  count={d.count}
                  total={withDevice}
                />
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">ยังไม่มีข้อมูล</p>
          )}
        </Section>

        <Section title="เบราว์เซอร์">
          {data.browserMix.length > 0 ? (
            <div className="flex flex-col gap-3">
              {data.browserMix.map((d) => (
                <Bar key={d.label} label={d.label} count={d.count} total={withDevice} />
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">ยังไม่มีข้อมูล</p>
          )}
        </Section>

        <Section title="ระบบปฏิบัติการ">
          {data.osMix.length > 0 ? (
            <div className="flex flex-col gap-3">
              {data.osMix.map((d) => (
                <Bar key={d.label} label={d.label} count={d.count} total={withDevice} />
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">ยังไม่มีข้อมูล</p>
          )}
        </Section>
      </div>

      <Section title={`รายชื่อผู้ใช้ (${filtered.length})`}>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="ค้นหาชื่อ..."
          className="mb-3 w-full rounded-lg border border-border bg-surface-muted px-3 py-2 text-sm outline-none focus:border-primary"
        />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-border text-xs text-muted-foreground">
              <tr>
                <th className="py-2 pr-3">ชื่อ</th>
                <th className="py-2 pr-3">สุ่ม</th>
                <th className="py-2 pr-3">โหวต</th>
                <th className="py-2 pr-3">อุปกรณ์ล่าสุด</th>
                <th className="py-2 pr-3">ตำแหน่ง</th>
                <th className="py-2 pr-3">ใช้งานล่าสุด</th>
                <th className="py-2" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => (
                <tr key={u.id} className="border-b border-border last:border-0">
                  <td className="py-2 pr-3 font-medium">{u.name}</td>
                  <td className="py-2 pr-3">{u.pickCount}</td>
                  <td className="py-2 pr-3">{u.voteCount}</td>
                  <td className="py-2 pr-3 text-xs text-muted-foreground">
                    {u.lastDevice
                      ? `${DEVICE_LABEL[u.lastDevice.deviceType] ?? u.lastDevice.deviceType} ${u.lastDevice.browser}`
                      : "—"}
                  </td>
                  <td className="py-2 pr-3">{u.hasLocation ? "📍" : "—"}</td>
                  <td className="py-2 pr-3 text-xs text-muted-foreground">{fmt(u.lastSeen)}</td>
                  <td className="py-2">
                    <button
                      onClick={() => openUser(u.id)}
                      className="rounded-lg border border-border px-3 py-1 text-xs hover:bg-surface-muted"
                    >
                      ดูรายละเอียด
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-4 text-center text-muted-foreground">
                    ไม่พบผู้ใช้
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Section>

      <p className="text-center text-xs text-muted-foreground">
        ข้อมูลอุปกรณ์มาจาก User-Agent ที่เบราว์เซอร์ส่งมาอยู่แล้ว · ข้อมูลตำแหน่งเก็บเฉพาะผู้ที่กดอนุญาต ·
        ไม่มีการเก็บหมายเลข IP
      </p>
    </div>
  );
}
