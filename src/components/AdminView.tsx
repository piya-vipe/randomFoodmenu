"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { AdminDataResponse, AdminMenuItem, ImportReport } from "@/lib/types";

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

  // CSV import
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [csvText, setCsvText] = useState<string | null>(null);
  const [csvFileName, setCsvFileName] = useState<string>("");
  const [preview, setPreview] = useState<ImportReport | null>(null);
  const [importing, setImporting] = useState(false);

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

  async function handleFileChosen(file: File) {
    setError(null);
    setPreview(null);
    const text = await file.text();
    setCsvText(text);
    setCsvFileName(file.name);

    // Validate immediately (dry run) so problems surface before any writes.
    setImporting(true);
    try {
      const report = (await callApi("/api/admin/import", {
        method: "POST",
        body: JSON.stringify({ csv: text, dryRun: true }),
      })) as ImportReport;
      setPreview(report);
    } catch (err) {
      setError(err instanceof Error ? err.message : "อ่านไฟล์ไม่สำเร็จ");
      setCsvText(null);
    } finally {
      setImporting(false);
    }
  }

  async function handleConfirmImport() {
    if (!csvText) return;
    setImporting(true);
    setError(null);
    try {
      const report = (await callApi("/api/admin/import", {
        method: "POST",
        body: JSON.stringify({ csv: csvText, dryRun: false }),
      })) as ImportReport;
      flash(`นำเข้าสำเร็จ — เพิ่มใหม่ ${report.created} เมนู, อัปเดต ${report.updated} เมนู`);
      clearImport();
      await load(key);
    } catch (err) {
      setError(err instanceof Error ? err.message : "นำเข้าไม่สำเร็จ");
    } finally {
      setImporting(false);
    }
  }

  function clearImport() {
    setCsvText(null);
    setCsvFileName("");
    setPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  /** Fetch a key-protected file and hand it to the browser as a download. */
  async function downloadExport() {
    setError(null);
    try {
      const res = await fetch("/api/admin/export", { headers: { "x-admin-key": key } });
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        throw new Error(json?.error ?? "ส่งออกไม่สำเร็จ");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `menu-export-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "ส่งออกไม่สำเร็จ");
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

      {/* ---- CSV import / export ---- */}
      <section className="mb-8 rounded-2xl border border-border bg-surface p-5">
        <h2 className="mb-1 font-semibold">📄 นำเข้าเมนูจากไฟล์ CSV</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          ให้ AI ตัวอื่นช่วยรีเสิร์ชเมนู แล้วอัปโหลดไฟล์ CSV เข้ามาทีเดียวได้เลย
        </p>

        <div className="mb-4 flex flex-wrap gap-2">
          <a
            href="/menu-template.csv"
            download
            className="rounded-lg border border-border px-3 py-2 text-sm font-medium hover:bg-surface-muted"
          >
            ⬇️ ดาวน์โหลดไฟล์ตัวอย่าง (template)
          </a>
          <a
            href="/ai-prompt.txt"
            download
            className="rounded-lg border border-border px-3 py-2 text-sm font-medium hover:bg-surface-muted"
          >
            🤖 ดาวน์โหลด prompt สำหรับ AI
          </a>
          <button
            onClick={downloadExport}
            className="rounded-lg border border-border px-3 py-2 text-sm font-medium hover:bg-surface-muted"
          >
            ⬇️ ส่งออกเมนูปัจจุบันเป็น CSV
          </button>
        </div>

        <details className="mb-4 rounded-lg bg-surface-muted p-3">
          <summary className="cursor-pointer text-sm font-medium">
            รูปแบบไฟล์ CSV (กดเพื่อดู)
          </summary>
          <div className="mt-3 text-sm text-muted-foreground">
            <p className="mb-2">บรรทัดแรกต้องเป็นหัวตารางนี้:</p>
            <pre className="mb-3 overflow-x-auto rounded bg-surface p-2 text-xs">
              category_name,category_emoji,menu_name,serving_size,ingredients,steps
            </pre>
            <ul className="flex flex-col gap-1.5">
              <li>
                • <b>ingredients</b> และ <b>steps</b> — คั่นแต่ละรายการด้วยเครื่องหมาย{" "}
                <code className="rounded bg-surface px-1">|</code> (ห้ามใช้ comma)
              </li>
              <li>
                • <b>ingredients</b> — ระบุปริมาณสำหรับ 1 ที่ เช่น &quot;ไข่ไก่ 2 ฟอง&quot;
              </li>
              <li>
                • <b>serving_size</b> — เช่น &quot;1 จาน&quot; (ถ้าเว้นว่างจะใช้ &quot;1 ที่&quot;)
              </li>
              <li>
                • <b>category_name</b> — ถ้าไม่มีหมวดนี้อยู่ ระบบจะสร้างให้ใหม่อัตโนมัติ
              </li>
              <li>• เมนูที่ชื่อซ้ำกับของเดิมในหมวดเดียวกัน จะถูกอัปเดตทับ</li>
              <li>• เมนูที่นำเข้าทั้งหมดจะถูกบันทึกเป็นแบบ &quot;เพิ่มเอง&quot; (ไม่ถูกลบตอน deploy)</li>
            </ul>
          </div>
        </details>

        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,text/csv"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFileChosen(file);
          }}
          className="block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-primary file:px-4 file:py-2 file:text-sm file:font-medium file:text-primary-foreground hover:file:bg-primary-hover"
        />

        {importing && !preview && (
          <p className="mt-3 text-sm text-muted-foreground">กำลังตรวจสอบไฟล์...</p>
        )}

        {preview && (
          <div className="mt-4 rounded-xl border border-border p-4">
            <p className="mb-2 font-medium">
              ตรวจสอบไฟล์ &quot;{csvFileName}&quot; แล้ว
            </p>
            <div className="mb-3 flex flex-wrap gap-3 text-sm">
              <span className="rounded-lg bg-green-100 px-2.5 py-1 text-green-800">
                เพิ่มใหม่ {preview.created}
              </span>
              <span className="rounded-lg bg-blue-100 px-2.5 py-1 text-blue-800">
                อัปเดต {preview.updated}
              </span>
              {preview.errors > 0 && (
                <span className="rounded-lg bg-red-100 px-2.5 py-1 text-red-800">
                  มีปัญหา {preview.errors}
                </span>
              )}
            </div>

            {preview.categoriesToCreate.length > 0 && (
              <p className="mb-3 text-sm text-muted-foreground">
                จะสร้างหมวดหมู่ใหม่: {preview.categoriesToCreate.join(", ")}
              </p>
            )}

            <div className="mb-3 max-h-64 overflow-y-auto rounded-lg border border-border">
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 bg-surface-muted">
                  <tr>
                    <th className="px-2 py-1.5">บรรทัด</th>
                    <th className="px-2 py-1.5">เมนู</th>
                    <th className="px-2 py-1.5">หมวด</th>
                    <th className="px-2 py-1.5">ผลลัพธ์</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.rows.map((r) => (
                    <tr
                      key={r.line}
                      className={`border-t border-border ${
                        r.action === "error" ? "bg-red-50" : ""
                      }`}
                    >
                      <td className="px-2 py-1.5 text-muted-foreground">{r.line}</td>
                      <td className="px-2 py-1.5">{r.menuName}</td>
                      <td className="px-2 py-1.5 text-muted-foreground">{r.categoryName}</td>
                      <td className="px-2 py-1.5">
                        {r.action === "create" && <span className="text-green-700">เพิ่มใหม่</span>}
                        {r.action === "update" && <span className="text-blue-700">อัปเดต</span>}
                        {r.action === "error" && (
                          <span className="text-red-700">ข้าม — {r.message}</span>
                        )}
                        {r.action !== "error" && r.message && (
                          <span className="ml-1 text-muted-foreground">({r.message})</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {preview.errors > 0 && (
              <p className="mb-3 text-xs text-muted-foreground">
                บรรทัดที่มีปัญหาจะถูกข้ามไป ส่วนบรรทัดที่เหลือยังนำเข้าได้ตามปกติ
              </p>
            )}

            <div className="flex gap-2">
              <button
                onClick={handleConfirmImport}
                disabled={importing || preview.created + preview.updated === 0}
                className="rounded-lg bg-primary px-5 py-2.5 font-medium text-primary-foreground transition hover:bg-primary-hover disabled:opacity-60"
              >
                {importing
                  ? "กำลังนำเข้า..."
                  : `ยืนยันนำเข้า ${preview.created + preview.updated} เมนู`}
              </button>
              <button
                onClick={clearImport}
                className="rounded-lg border border-border px-5 py-2.5 font-medium hover:bg-surface-muted"
              >
                ยกเลิก
              </button>
            </div>
          </div>
        )}
      </section>

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
