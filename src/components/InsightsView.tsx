"use client";

import { useEffect, useState } from "react";
import type { InsightsResponse } from "@/lib/types";

const STORAGE_KEY = "menuPicker.insightsKey";

function StatTile({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-4">
      <p className="text-2xl font-bold text-primary">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function BarRow({
  label,
  sublabel,
  value,
  percent,
  emoji,
}: {
  label: string;
  sublabel?: string;
  value: string;
  percent: number;
  emoji?: string;
}) {
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between gap-2 text-sm">
        <span className="truncate font-medium">
          {emoji ? `${emoji} ` : ""}
          {label}
          {sublabel && <span className="ml-1.5 text-xs text-muted-foreground">{sublabel}</span>}
        </span>
        <span className="shrink-0 text-muted-foreground">{value}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-surface-muted">
        <div
          className="h-full rounded-full bg-primary"
          style={{ width: `${Math.max(percent, 2)}%` }}
        />
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-border bg-surface p-5">
      <h2 className="mb-4 text-sm font-semibold">{title}</h2>
      {children}
    </section>
  );
}

export default function InsightsView() {
  const [key, setKey] = useState("");
  const [data, setData] = useState<InsightsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async (k: string) => {
    if (!k) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/insights?key=${encodeURIComponent(k)}`, {
        cache: "no-store",
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json?.error ?? "โหลดข้อมูลไม่สำเร็จ");
      }
      setData(json as InsightsResponse);
      sessionStorage.setItem(STORAGE_KEY, k);
    } catch (err) {
      setError(err instanceof Error ? err.message : "โหลดข้อมูลไม่สำเร็จ");
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (stored) {
      setKey(stored);
      load(stored);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!data) {
    return (
      <div className="flex flex-1 items-center justify-center px-4 py-12">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            load(key);
          }}
          className="w-full max-w-sm rounded-3xl border border-border bg-surface p-8 shadow-sm"
        >
          <div className="mb-6 text-center">
            <div className="mb-3 text-4xl">📊</div>
            <h1 className="text-xl font-semibold">Insights</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              ใส่ INSIGHTS_KEY เพื่อดูข้อมูลวิเคราะห์การใช้งาน
            </p>
          </div>
          <input
            type="password"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder="Insights key"
            className="w-full rounded-xl border border-border bg-surface-muted px-4 py-3 text-base outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/30"
          />
          {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={loading || !key}
            className="mt-4 w-full rounded-xl bg-primary px-4 py-3 font-medium text-primary-foreground transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "กำลังโหลด..." : "ดูข้อมูล"}
          </button>
        </form>
      </div>
    );
  }

  const maxDaily = Math.max(...data.dailyPicks.map((d) => d.count), 1);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-5 px-4 py-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">📊 Insights</h1>
        <button
          onClick={() => load(key)}
          disabled={loading}
          className="rounded-lg border border-border bg-surface px-3 py-1.5 text-sm font-medium transition hover:bg-surface-muted disabled:opacity-60"
        >
          {loading ? "กำลังโหลด..." : "รีเฟรช"}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="ผู้ใช้ทั้งหมด" value={data.totals.users} />
        <StatTile label="ผู้ใช้ที่เคยสุ่ม" value={data.totals.activeUsers} />
        <StatTile label="เมนูที่สุ่มไปแล้ว" value={data.totals.picks} />
        <StatTile label="จำนวนครั้งที่รีเซ็ต" value={data.totals.resets} />
      </div>

      <Section title="สุ่มแบบไหนมากกว่ากัน">
        <div className="flex flex-col gap-3">
          <BarRow
            label="เลือกหมวดเอง"
            value={`${data.pickMethod.category} ครั้ง (${data.pickMethod.categoryPercent}%)`}
            percent={data.pickMethod.categoryPercent}
          />
          <BarRow
            label="สุ่มสุดๆ (ทุกหมวด)"
            value={`${data.pickMethod.random} ครั้ง (${data.pickMethod.randomPercent}%)`}
            percent={data.pickMethod.randomPercent}
          />
          {data.pickMethod.unknown > 0 && (
            <p className="text-xs text-muted-foreground">
              + {data.pickMethod.unknown} ครั้งจากข้อมูลเก่าที่ยังไม่ได้บันทึกวิธีสุ่ม
            </p>
          )}
        </div>
      </Section>

      <Section title="หมวดหมู่ยอดนิยม">
        <div className="flex flex-col gap-4">
          {data.categories.map((c) => (
            <BarRow
              key={c.slug}
              emoji={c.emoji}
              label={c.name}
              sublabel={`ครบหมวด ${c.completionRatePercent}% ของคนที่ลอง`}
              value={`${c.pickCount} ครั้ง (${c.sharePercent}%)`}
              percent={c.sharePercent}
            />
          ))}
        </div>
      </Section>

      <div className="grid gap-5 sm:grid-cols-2">
        <Section title="เมนูยอดฮิต (10 อันดับ)">
          <ol className="flex flex-col gap-2">
            {data.topItems.map((item, i) => (
              <li key={item.name} className="flex items-center gap-2 text-sm">
                <span className="w-5 shrink-0 text-muted-foreground">{i + 1}.</span>
                <span className="flex-1 truncate">
                  {item.categoryEmoji} {item.name}
                </span>
                <span className="shrink-0 font-medium text-primary">{item.count}</span>
              </li>
            ))}
            {data.topItems.length === 0 && (
              <p className="text-sm text-muted-foreground">ยังไม่มีข้อมูล</p>
            )}
          </ol>
        </Section>

        <Section title="ใครสุ่มเยอะสุด">
          <ol className="flex flex-col gap-2">
            {data.topUsers.map((u, i) => (
              <li key={u.name} className="flex items-center gap-2 text-sm">
                <span className="w-5 shrink-0 text-muted-foreground">{i + 1}.</span>
                <span className="flex-1 truncate">{u.name}</span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {u.categoriesTouched} หมวด
                </span>
                <span className="shrink-0 font-medium text-primary">{u.pickCount}</span>
              </li>
            ))}
            {data.topUsers.length === 0 && (
              <p className="text-sm text-muted-foreground">ยังไม่มีข้อมูล</p>
            )}
          </ol>
        </Section>
      </div>

      <Section title="เมนูที่สุ่มไปแล้วในช่วง 14 วัน">
        <div className="flex h-24 items-end gap-1">
          {data.dailyPicks.map((d) => (
            <div key={d.date} className="flex flex-1 flex-col items-center gap-1">
              <div
                className="w-full rounded-t bg-primary"
                style={{ height: `${Math.max((d.count / maxDaily) * 100, d.count > 0 ? 6 : 1)}%` }}
                title={`${d.date}: ${d.count}`}
              />
            </div>
          ))}
        </div>
        <div className="mt-2 flex justify-between text-[10px] text-muted-foreground">
          <span>{data.dailyPicks[0]?.date}</span>
          <span>{data.dailyPicks[data.dailyPicks.length - 1]?.date}</span>
        </div>
      </Section>

      <Section title="พฤติกรรมการรีเซ็ต">
        <div className="grid grid-cols-3 gap-3 text-center">
          <div>
            <p className="text-xl font-bold text-primary">{data.resetStats.totalResets}</p>
            <p className="text-xs text-muted-foreground">ครั้งที่รีเซ็ต</p>
          </div>
          <div>
            <p className="text-xl font-bold text-primary">{data.resetStats.avgClearedCount}</p>
            <p className="text-xs text-muted-foreground">เมนูเฉลี่ยก่อนรีเซ็ต</p>
          </div>
          <div>
            <p className="text-xl font-bold text-primary">{data.resetStats.maxClearedCount}</p>
            <p className="text-xs text-muted-foreground">มากสุดก่อนรีเซ็ต</p>
          </div>
        </div>
      </Section>

      {data.neverPicked.length > 0 && (
        <Section title={`เมนูที่ยังไม่มีใครสุ่มเจอ (${data.neverPicked.length})`}>
          <div className="flex flex-wrap gap-2">
            {data.neverPicked.map((item) => (
              <span
                key={item.name}
                className="rounded-full bg-surface-muted px-3 py-1 text-xs text-muted-foreground"
              >
                {item.categoryEmoji} {item.name}
              </span>
            ))}
          </div>
        </Section>
      )}

      <p className="text-center text-xs text-muted-foreground">
        อัปเดตล่าสุด {new Date(data.generatedAt).toLocaleString("th-TH")}
      </p>
    </div>
  );
}
