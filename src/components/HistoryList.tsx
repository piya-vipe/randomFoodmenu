"use client";

import type { PickHistoryItem, Vote } from "@/lib/types";

export default function HistoryList({
  picks,
  onVote,
}: {
  picks: PickHistoryItem[];
  onVote: (menuItemId: string, vote: Vote) => void;
}) {
  if (picks.length === 0) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 pb-10">
        <div className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          ยังไม่มีเมนูที่สุ่มไว้ ลองกดสุ่มดูสิ!
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 pb-10">
      <h2 className="mb-3 text-sm font-medium text-muted-foreground">
        เมนูที่สุ่มไปแล้ว ({picks.length})
      </h2>
      <ul className="flex flex-col gap-2">
        {picks.map((p) => (
          <li key={p.id} className="rounded-xl border border-border bg-surface px-4 py-3">
            <details>
              <summary className="flex cursor-pointer list-none items-center gap-3">
                <span className="text-xl">{p.categoryEmoji}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">
                    {p.menuItemName}
                    {p.vote === "LIKE" && <span className="ml-1.5">👍</span>}
                    {p.vote === "DISLIKE" && <span className="ml-1.5">👎</span>}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">{p.categoryName}</p>
                </div>
                <span className="text-xs text-muted-foreground">ดูสูตร</span>
              </summary>

              <div className="mt-3 border-t border-border pt-3">
                <p className="mb-2 text-xs font-medium text-muted-foreground">
                  วัตถุดิบ (สำหรับ {p.servingSize})
                </p>
                {p.ingredients.length > 0 ? (
                  <ul className="mb-4 flex flex-col gap-1">
                    {p.ingredients.map((ing, i) => (
                      <li key={i} className="flex gap-2 text-sm text-muted-foreground">
                        <span className="text-primary">•</span>
                        <span>{ing}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mb-4 text-sm text-muted-foreground">ยังไม่มีข้อมูลวัตถุดิบ</p>
                )}

                <p className="mb-2 text-xs font-medium text-muted-foreground">วิธีทำ</p>
                <ol className="flex flex-col gap-1.5">
                  {p.steps.map((step, i) => (
                    <li
                      key={i}
                      className="flex gap-2 text-sm leading-relaxed text-muted-foreground"
                    >
                      <span className="shrink-0">{i + 1}.</span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ol>

                <div className="mt-4 flex items-center gap-2 border-t border-border pt-3">
                  <span className="text-xs text-muted-foreground">เมนูนี้เป็นไง?</span>
                  <button
                    onClick={() => onVote(p.menuItemId, "LIKE")}
                    aria-pressed={p.vote === "LIKE"}
                    className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                      p.vote === "LIKE"
                        ? "border-accent bg-accent text-white"
                        : "border-border hover:bg-surface-muted"
                    }`}
                  >
                    👍 ชอบ
                  </button>
                  <button
                    onClick={() => onVote(p.menuItemId, "DISLIKE")}
                    aria-pressed={p.vote === "DISLIKE"}
                    className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                      p.vote === "DISLIKE"
                        ? "border-red-500 bg-red-500 text-white"
                        : "border-border hover:bg-surface-muted"
                    }`}
                  >
                    👎 ไม่ชอบ
                  </button>
                </div>
              </div>
            </details>
          </li>
        ))}
      </ul>
    </div>
  );
}
