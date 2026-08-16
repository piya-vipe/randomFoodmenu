"use client";

import { useCallback, useEffect, useState } from "react";
import type { AdminDataResponse, AdminMenuItem } from "@/lib/types";

const STORAGE_KEY = "menuPicker.adminKey";

type FormState = {
  id: string | null;
  name: string;
  categorySlug: string;
  servingSize: string;
  ingredients: string;
  steps: string;
};

const EMPTY_FORM: FormState = {
  id: null,
  name: "",
  categorySlug: "",
  servingSize: "1 จาน",
  ingredients: "",
  steps: "",
};

export default function AdminView() {
  const [key, setKey] = useState("");
  const [keyInput, setKeyInput] = useState("");
  const [data, setData] = useState<AdminDataResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string>("");

  // New-category form
  const [newCatName, setNewCatName] = useState("");
  const [newCatEmoji, setNewCatEmoji] = useState("");

  const load = useCallback(async (k: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/menu?key=${encodeURIComponent(k)}`, {
        cache: "no-store",
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(json?.error ?? "โหลดข้อมูลไม่สำเร็จ");
      }
      setData(json as AdminDataResponse);
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

  async function callApi(path: string, init: RequestInit) {
    const sep = path.includes("?") ? "&" : "?";
    const res = await fetch(`${path}${sep}key=${encodeURIComponent(key)}`, {
      ...init,
      headers: { "Content-Type": "application/json", ...(init.headers ?? {}) },
    });
    const json = await res.json().catch(() => null);
    if (!res.ok) throw new Error(json?.error ?? "ทำรายการไม่สำเร็จ");
    return json;
  }

  function flash(message: string) {
    setNotice(message);
    setTimeout(() => setNotice(null), 3000);
  }

  async function handleSaveItem(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload = {
        name: form.name,
        categorySlug: form.categorySlug,
        servingSize: form.servingSize,
        ingredients: form.ingredients,
        steps: form.steps,
      };

      if (form.id) {
        await callApi("/api/admin/menu", {
          method: "PATCH",
          body: JSON.stringify({ ...payload, id: form.id }),
        });
        flash("แก้ไขเมนูเรียบร้อย");
      } else {
        await callApi("/api/admin/menu", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        flash("เพิ่มเมนูเรียบร้อย");
      }
      setForm(EMPTY_FORM);
      await load(key);
    } catch (err) {
      setError(err instanceof Error ? err.message : "บันทึกไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleActive(item: AdminMenuItem) {
    try {
      await callApi("/api/admin/menu", {
        method: "PATCH",
        body: JSON.stringify({ id: item.id, isActive: !item.isActive }),
      });
      await load(key);
    } catch (err) {
      setError(err instanceof Error ? err.message : "ทำรายการไม่สำเร็จ");
    }
  }

  async function handleDeleteItem(item: AdminMenuItem) {
    if (
      !window.confirm(
        `ลบเมนู "${item.name}" ถาวร?\nประวัติการสุ่มและคะแนนของเมนูนี้จะถูกลบไปด้วย`
      )
    ) {
      return;
    }
    try {
      await callApi(`/api/admin/menu?id=${encodeURIComponent(item.id)}`, { method: "DELETE" });
      flash("ลบเมนูเรียบร้อย");
      await load(key);
    } catch (err) {
      setError(err instanceof Error ? err.message : "ลบไม่สำเร็จ");
    }
  }

  async function handleAddCategory(e: React.FormEvent) {
    e.preventDefault();
    if (!newCatName.trim()) return;
    try {
      await callApi("/api/admin/category", {
        method: "POST",
        body: JSON.stringify({ name: newCatName, emoji: newCatEmoji }),
      });
      setNewCatName("");
      setNewCatEmoji("");
      flash("เพิ่มหมวดหมู่เรียบร้อย");
      await load(key);
    } catch (err) {
      setError(err instanceof Error ? err.message : "เพิ่มหมวดหมู่ไม่สำเร็จ");
    }
  }

  function startEdit(item: AdminMenuItem) {
    setForm({
      id: item.id,
      name: item.name,
      categorySlug: item.categorySlug,
      servingSize: item.servingSize,
      ingredients: item.ingredients.join("\n"),
      steps: item.steps.join("\n"),
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
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
          <h1 className="mb-1 text-xl font-semibold">🔐 จัดการเมนู</h1>
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

  const visibleItems = filterCategory
    ? data.menuItems.filter((i) => i.categorySlug === filterCategory)
    : data.menuItems;

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">🍳 จัดการเมนู</h1>
          <p className="text-sm text-muted-foreground">
            {data.categories.length} หมวดหมู่ · {data.menuItems.length} เมนู
          </p>
        </div>
        <a
          href="/insights"
          className="rounded-lg border border-border px-3 py-2 text-sm hover:bg-surface-muted"
        >
          📊 ดู Insights
        </a>
      </header>

      {notice && (
        <div className="mb-4 rounded-xl border border-green-300 bg-green-50 px-4 py-2 text-sm text-green-800">
          {notice}
        </div>
      )}
      {error && (
        <div className="mb-4 rounded-xl border border-red-300 bg-red-50 px-4 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* ---- Add / edit menu item ---- */}
      <section className="mb-8 rounded-2xl border border-border bg-surface p-5">
        <h2 className="mb-4 font-semibold">
          {form.id ? "✏️ แก้ไขเมนู" : "➕ เพิ่มเมนูใหม่"}
        </h2>
        <form onSubmit={handleSaveItem} className="flex flex-col gap-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-muted-foreground">ชื่อเมนู *</span>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
                className="rounded-lg border border-border bg-surface-muted px-3 py-2 outline-none focus:border-primary"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-muted-foreground">หมวดหมู่ *</span>
              <select
                value={form.categorySlug}
                onChange={(e) => setForm({ ...form, categorySlug: e.target.value })}
                required
                disabled={form.id !== null}
                className="rounded-lg border border-border bg-surface-muted px-3 py-2 outline-none focus:border-primary disabled:opacity-60"
              >
                <option value="">— เลือกหมวดหมู่ —</option>
                {data.categories.map((c) => (
                  <option key={c.slug} value={c.slug}>
                    {c.emoji} {c.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-muted-foreground">
              สูตรนี้สำหรับกี่ที่ (เช่น &quot;1 จาน&quot;)
            </span>
            <input
              value={form.servingSize}
              onChange={(e) => setForm({ ...form, servingSize: e.target.value })}
              className="rounded-lg border border-border bg-surface-muted px-3 py-2 outline-none focus:border-primary"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-muted-foreground">
              วัตถุดิบ — บรรทัดละ 1 อย่าง (เช่น &quot;ไข่ไก่ 2 ฟอง&quot;)
            </span>
            <textarea
              value={form.ingredients}
              onChange={(e) => setForm({ ...form, ingredients: e.target.value })}
              rows={5}
              className="rounded-lg border border-border bg-surface-muted px-3 py-2 font-mono text-sm outline-none focus:border-primary"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-muted-foreground">
              วิธีทำ — บรรทัดละ 1 ขั้นตอน *
            </span>
            <textarea
              value={form.steps}
              onChange={(e) => setForm({ ...form, steps: e.target.value })}
              rows={5}
              required
              className="rounded-lg border border-border bg-surface-muted px-3 py-2 font-mono text-sm outline-none focus:border-primary"
            />
          </label>

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-primary px-5 py-2.5 font-medium text-primary-foreground transition hover:bg-primary-hover disabled:opacity-60"
            >
              {saving ? "กำลังบันทึก..." : form.id ? "บันทึกการแก้ไข" : "เพิ่มเมนู"}
            </button>
            {form.id && (
              <button
                type="button"
                onClick={() => setForm(EMPTY_FORM)}
                className="rounded-lg border border-border px-5 py-2.5 font-medium hover:bg-surface-muted"
              >
                ยกเลิก
              </button>
            )}
          </div>
        </form>
      </section>

      {/* ---- Add category ---- */}
      <section className="mb-8 rounded-2xl border border-border bg-surface p-5">
        <h2 className="mb-3 font-semibold">➕ เพิ่มหมวดหมู่ใหม่</h2>
        <form onSubmit={handleAddCategory} className="flex flex-wrap items-end gap-3">
          <label className="flex flex-1 flex-col gap-1" style={{ minWidth: "180px" }}>
            <span className="text-xs font-medium text-muted-foreground">ชื่อหมวดหมู่</span>
            <input
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              placeholder="เช่น อาหารเจ"
              className="rounded-lg border border-border bg-surface-muted px-3 py-2 outline-none focus:border-primary"
            />
          </label>
          <label className="flex w-24 flex-col gap-1">
            <span className="text-xs font-medium text-muted-foreground">Emoji</span>
            <input
              value={newCatEmoji}
              onChange={(e) => setNewCatEmoji(e.target.value)}
              placeholder="🥬"
              className="rounded-lg border border-border bg-surface-muted px-3 py-2 outline-none focus:border-primary"
            />
          </label>
          <button
            type="submit"
            disabled={!newCatName.trim()}
            className="rounded-lg border border-border px-4 py-2.5 font-medium hover:bg-surface-muted disabled:opacity-50"
          >
            เพิ่ม
          </button>
        </form>
      </section>

      {/* ---- Menu item list ---- */}
      <section>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-semibold">รายการเมนู ({visibleItems.length})</h2>
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none"
          >
            <option value="">ทุกหมวดหมู่</option>
            {data.categories.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.emoji} {c.name} ({c.itemCount})
              </option>
            ))}
          </select>
        </div>

        <ul className="flex flex-col gap-2">
          {visibleItems.map((item) => (
            <li
              key={item.id}
              className={`rounded-xl border border-border bg-surface p-4 ${
                item.isActive ? "" : "opacity-60"
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="font-medium">
                    {item.categoryEmoji} {item.name}
                    {!item.isActive && (
                      <span className="ml-2 rounded bg-surface-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                        ซ่อนอยู่
                      </span>
                    )}
                    {item.source === "MANUAL" && (
                      <span className="ml-2 rounded bg-primary/15 px-1.5 py-0.5 text-xs text-primary">
                        เพิ่มเอง
                      </span>
                    )}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {item.categoryName} · สำหรับ {item.servingSize} · สุ่มไปแล้ว {item.pickCount}{" "}
                    ครั้ง · 👍 {item.likes} 👎 {item.dislikes}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    วัตถุดิบ {item.ingredients.length} อย่าง · วิธีทำ {item.steps.length} ขั้นตอน
                  </p>
                </div>
                <div className="flex shrink-0 gap-1.5">
                  <button
                    onClick={() => startEdit(item)}
                    className="rounded-lg border border-border px-3 py-1.5 text-xs hover:bg-surface-muted"
                  >
                    แก้ไข
                  </button>
                  <button
                    onClick={() => handleToggleActive(item)}
                    className="rounded-lg border border-border px-3 py-1.5 text-xs hover:bg-surface-muted"
                  >
                    {item.isActive ? "ซ่อน" : "แสดง"}
                  </button>
                  <button
                    onClick={() => handleDeleteItem(item)}
                    className="rounded-lg border border-red-300 px-3 py-1.5 text-xs text-red-600 hover:bg-red-50"
                  >
                    ลบ
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <p className="mt-8 text-center text-xs text-muted-foreground">
        หมายเหตุ: เมนูที่มาจากไฟล์ seed จะถูกรีเซ็ตกลับเป็นค่าเดิมทุกครั้งที่ deploy ใหม่ —
        เมนูที่ &quot;เพิ่มเอง&quot; จะไม่ถูกแตะต้อง
      </p>
    </div>
  );
}
