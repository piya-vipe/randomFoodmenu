"use client";

import type { PickHistoryItem } from "@/lib/types";

export default function HistoryList({ picks }: { picks: PickHistoryItem[] }) {
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
          <li
            key={p.id}
            className="rounded-xl border border-border bg-surface px-4 py-3"
          >
            <details>
              <summary className="flex cursor-pointer list-none items-center gap-3">
                <span className="text-xl">{p.categoryEmoji}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{p.menuItemName}</p>
                  <p className="truncate text-xs text-muted-foreground">{p.categoryName}</p>
                </div>
                <span className="text-xs text-muted-foreground">วิธีทำ</span>
              </summary>
              <ol className="mt-3 flex flex-col gap-1.5 border-t border-border pt-3">
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
            </details>
          </li>
        ))}
      </ul>
    </div>
  );
}
