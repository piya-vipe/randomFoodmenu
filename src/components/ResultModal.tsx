"use client";

import { useState } from "react";
import type { Vote } from "@/lib/types";
import Confetti from "./Confetti";

export type ResultState =
  | {
      kind: "item";
      menuItemId: string;
      itemName: string;
      steps: string[];
      ingredients: string[];
      servingSize: string;
      categoryName: string;
      categoryEmoji: string;
    }
  | { kind: "done"; message: string };

export default function ResultModal({
  result,
  vote,
  onVote,
  onClose,
  onRerollSameScope,
  rerollLabel,
  rerolling,
}: {
  result: ResultState;
  vote: Vote | null;
  onVote: (vote: Vote) => void;
  onClose: () => void;
  onRerollSameScope: () => void;
  rerollLabel: string;
  rerolling: boolean;
}) {
  const [tab, setTab] = useState<"ingredients" | "steps">("ingredients");

  return (
    <>
      {result.kind === "item" && <Confetti seed={result.menuItemId} />}
      <div
        className="fixed inset-0 z-20 flex items-center justify-center bg-black/40 px-4 animate-fade-in"
        onClick={onClose}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          className="max-h-[88vh] w-full max-w-sm overflow-y-auto rounded-3xl bg-surface p-7 text-center shadow-xl animate-pop-in"
        >
          {result.kind === "item" ? (
            <>
              <div className="mb-2 text-5xl animate-reel-land">{result.categoryEmoji}</div>
              <p className="text-sm text-muted-foreground">{result.categoryName}</p>
              <h2 className="mt-1 text-2xl font-bold text-primary">{result.itemName}</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                สูตรสำหรับ {result.servingSize}
              </p>

              {/* Like / dislike */}
              <div className="mt-4 flex items-center justify-center gap-3">
                <button
                  onClick={() => onVote("LIKE")}
                  aria-pressed={vote === "LIKE"}
                  className={`flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-medium transition ${
                    vote === "LIKE"
                      ? "border-accent bg-accent text-white"
                      : "border-border bg-surface hover:bg-surface-muted"
                  }`}
                >
                  👍 ชอบ
                </button>
                <button
                  onClick={() => onVote("DISLIKE")}
                  aria-pressed={vote === "DISLIKE"}
                  className={`flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-medium transition ${
                    vote === "DISLIKE"
                      ? "border-red-500 bg-red-500 text-white"
                      : "border-border bg-surface hover:bg-surface-muted"
                  }`}
                >
                  👎 ไม่ชอบ
                </button>
              </div>
              {vote && (
                <p className="mt-2 text-xs text-muted-foreground">
                  บันทึกแล้ว — กดซ้ำเพื่อยกเลิก
                </p>
              )}

              {/* Ingredients / steps tabs */}
              <div className="mt-5 flex rounded-xl bg-surface-muted p-1">
                <button
                  onClick={() => setTab("ingredients")}
                  className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition ${
                    tab === "ingredients" ? "bg-surface shadow-sm" : "text-muted-foreground"
                  }`}
                >
                  วัตถุดิบ
                </button>
                <button
                  onClick={() => setTab("steps")}
                  className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition ${
                    tab === "steps" ? "bg-surface shadow-sm" : "text-muted-foreground"
                  }`}
                >
                  วิธีทำ
                </button>
              </div>

              <div className="mt-3 rounded-xl bg-surface-muted p-4 text-left">
                {tab === "ingredients" ? (
                  result.ingredients.length > 0 ? (
                    <ul className="flex flex-col gap-1.5">
                      {result.ingredients.map((ing, i) => (
                        <li key={i} className="flex gap-2 text-sm leading-relaxed">
                          <span className="text-primary">•</span>
                          <span>{ing}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground">ยังไม่มีข้อมูลวัตถุดิบ</p>
                  )
                ) : (
                  <ol className="flex flex-col gap-2">
                    {result.steps.map((step, i) => (
                      <li key={i} className="flex gap-2 text-sm leading-relaxed">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-medium text-primary-foreground">
                          {i + 1}
                        </span>
                        <span>{step}</span>
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            </>
          ) : (
            <>
              <div className="mb-2 text-5xl">🎉</div>
              <h2 className="mt-2 text-lg font-semibold">{result.message}</h2>
            </>
          )}

          <div className="mt-6 flex flex-col gap-2">
            <button
              onClick={onRerollSameScope}
              disabled={rerolling}
              className="w-full rounded-xl bg-primary px-4 py-3 font-medium text-primary-foreground transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
            >
              {rerolling ? "กำลังสุ่ม..." : rerollLabel}
            </button>
            <button
              onClick={onClose}
              className="w-full rounded-xl border border-border bg-surface px-4 py-3 font-medium transition hover:bg-surface-muted"
            >
              ปิด
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
