"use client";

import type { CategorySummary } from "@/lib/types";

export default function CategoryGrid({
  categories,
  onPickCategory,
  onPickRandom,
  pickingSlug,
}: {
  categories: CategorySummary[];
  onPickCategory: (slug: string) => void;
  onPickRandom: () => void;
  pickingSlug: string | null;
}) {
  const anyPicking = pickingSlug !== null;

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6">
      <button
        onClick={onPickRandom}
        disabled={anyPicking}
        className="mb-6 w-full rounded-2xl bg-primary px-6 py-5 text-left text-primary-foreground shadow-sm transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-70"
      >
        <div className="flex items-center gap-4">
          <span className="text-4xl">🎲</span>
          <div>
            <p className="text-lg font-semibold">
              {pickingSlug === "__random__" ? "กำลังสุ่ม..." : "สุ่มสุดๆ (ทุกหมวด)"}
            </p>
            <p className="text-sm opacity-90">ให้เราสุ่มจากเมนูทั้งหมดเลย ไม่ต้องเลือกหมวด</p>
          </div>
        </div>
      </button>

      <h2 className="mb-3 text-sm font-medium text-muted-foreground">หรือเลือกหมวดหมู่</h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {categories.map((cat) => {
          const isFull = cat.pickedCount >= cat.total;
          const isPicking = pickingSlug === cat.slug;
          return (
            <button
              key={cat.slug}
              onClick={() => onPickCategory(cat.slug)}
              disabled={anyPicking}
              className="flex flex-col items-start gap-1.5 rounded-2xl border border-border bg-surface p-4 text-left shadow-sm transition hover:border-primary hover:shadow disabled:cursor-not-allowed disabled:opacity-60"
            >
              <span className="text-3xl">{cat.emoji}</span>
              <span className="font-medium leading-tight">{cat.name}</span>
              <span
                className={`text-xs ${
                  isFull ? "font-medium text-accent" : "text-muted-foreground"
                }`}
              >
                {isPicking
                  ? "กำลังสุ่ม..."
                  : isFull
                  ? "ครบทุกเมนูแล้ว 🎉"
                  : `${cat.pickedCount}/${cat.total} เมนู`}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
