"use client";

export default function Header({
  name,
  totalPicked,
  totalItems,
  onReset,
  onSwitchUser,
  resetting,
}: {
  name: string;
  totalPicked: number;
  totalItems: number;
  onReset: () => void;
  onSwitchUser: () => void;
  resetting: boolean;
}) {
  return (
    <header className="sticky top-0 z-10 border-b border-border bg-background/90 backdrop-blur">
      <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-3 px-4 py-3">
        <div className="min-w-0">
          <p className="truncate text-sm text-muted-foreground">
            สวัสดี, <span className="font-medium text-foreground">{name}</span>
          </p>
          <p className="text-xs text-muted-foreground">
            สุ่มไปแล้ว {totalPicked}/{totalItems} เมนู
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            onClick={onReset}
            disabled={resetting || totalPicked === 0}
            className="rounded-lg border border-border bg-surface px-3 py-2 text-sm font-medium transition hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-50"
          >
            🔄 รีเซ็ตเมนู
          </button>
          <button
            onClick={onSwitchUser}
            className="rounded-lg border border-border bg-surface px-3 py-2 text-sm font-medium transition hover:bg-surface-muted"
          >
            เปลี่ยนชื่อ
          </button>
        </div>
      </div>
    </header>
  );
}
