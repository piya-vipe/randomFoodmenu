"use client";

export type ResultState =
  | { kind: "item"; itemName: string; categoryName: string; categoryEmoji: string }
  | { kind: "done"; message: string };

export default function ResultModal({
  result,
  onClose,
  onRerollSameScope,
  rerollLabel,
  rerolling,
}: {
  result: ResultState;
  onClose: () => void;
  onRerollSameScope: () => void;
  rerollLabel: string;
  rerolling: boolean;
}) {
  return (
    <div
      className="fixed inset-0 z-20 flex items-center justify-center bg-black/40 px-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-3xl bg-surface p-8 text-center shadow-xl animate-pop-in"
      >
        {result.kind === "item" ? (
          <>
            <div className="mb-2 text-5xl">{result.categoryEmoji}</div>
            <p className="text-sm text-muted-foreground">{result.categoryName}</p>
            <h2 className="mt-2 text-2xl font-bold text-primary">{result.itemName}</h2>
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
  );
}
