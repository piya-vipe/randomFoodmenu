"use client";

import { useState } from "react";

export default function NameForm({
  onSubmit,
  submitting,
  error,
}: {
  onSubmit: (name: string) => void;
  submitting: boolean;
  error: string | null;
}) {
  const [name, setName] = useState("");

  return (
    <div className="flex flex-1 items-center justify-center px-4 py-12">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (name.trim()) onSubmit(name.trim());
        }}
        className="w-full max-w-sm rounded-3xl border border-border bg-surface p-8 shadow-sm animate-pop-in"
      >
        <div className="mb-6 text-center">
          <div className="mb-3 text-5xl">🍽️</div>
          <h1 className="text-2xl font-semibold">กินไรดี?</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            ใส่ชื่อของคุณ แล้วเริ่มสุ่มเมนูกันเลย
          </p>
        </div>

        <label htmlFor="name" className="mb-1.5 block text-sm font-medium">
          ชื่อของคุณ
        </label>
        <input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={40}
          autoFocus
          placeholder="เช่น เก่ง, มายด์, ...."
          className="w-full rounded-xl border border-border bg-surface-muted px-4 py-3 text-base outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/30"
        />

        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={submitting || !name.trim()}
          className="mt-5 w-full rounded-xl bg-primary px-4 py-3 font-medium text-primary-foreground transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? "กำลังเข้าสู่ระบบ..." : "เริ่มเลย"}
        </button>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          ระบบจะจำเมนูที่คุณสุ่มไปแล้วไว้ จนกว่าจะกด &quot;รีเซ็ตเมนู&quot;
        </p>

        <details className="mt-3">
          <summary className="cursor-pointer text-center text-xs text-muted-foreground underline">
            เราเก็บข้อมูลอะไรบ้าง?
          </summary>
          <div className="mt-2 rounded-xl bg-surface-muted p-3 text-xs leading-relaxed text-muted-foreground">
            <p className="mb-1.5">
              เว็บนี้เป็นโปรเจกต์การศึกษา เก็บข้อมูลเพื่อนำไปวิเคราะห์พฤติกรรมการเลือกเมนู:
            </p>
            <ul className="flex flex-col gap-1">
              <li>• ชื่อที่คุณกรอก และเมนูที่คุณสุ่มได้</li>
              <li>• คะแนน 👍/👎 ที่คุณให้แต่ละเมนู</li>
              <li>• ชนิดอุปกรณ์/เบราว์เซอร์ที่ใช้ (จากข้อมูลที่เบราว์เซอร์ส่งมาอยู่แล้ว)</li>
              <li>• ตำแหน่งที่ตั้ง — เฉพาะเมื่อคุณกดอนุญาตเท่านั้น ไม่กดก็ใช้งานได้ปกติ</li>
            </ul>
            <p className="mt-1.5">เราไม่เก็บหมายเลข IP และไม่ส่งข้อมูลให้บุคคลที่สาม</p>
          </div>
        </details>
      </form>
    </div>
  );
}
