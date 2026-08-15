"use client";

import { useCallback, useEffect, useState } from "react";
import { createOrGetUser, fetchState, pickMenu, resetPicks } from "@/lib/api";
import type { StateResponse } from "@/lib/types";
import NameForm from "./NameForm";
import Header from "./Header";
import CategoryGrid from "./CategoryGrid";
import HistoryList from "./HistoryList";
import ResultModal, { type ResultState } from "./ResultModal";

const STORAGE_USER_ID = "menuPicker.userId";
const STORAGE_USER_NAME = "menuPicker.userName";

type Screen = "loading" | "name" | "app";

export default function AppShell() {
  const [screen, setScreen] = useState<Screen>("loading");
  const [userId, setUserId] = useState<string | null>(null);
  const [state, setState] = useState<StateResponse | null>(null);
  const [nameSubmitting, setNameSubmitting] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);
  const [pickingSlug, setPickingSlug] = useState<string | null>(null);
  const [result, setResult] = useState<
    | (ResultState & { scopeSlug?: string })
    | null
  >(null);
  const [resetting, setResetting] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);

  const loadState = useCallback(async (id: string) => {
    const data = await fetchState(id);
    setState(data);
    return data;
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      const storedId = localStorage.getItem(STORAGE_USER_ID);
      if (!storedId) {
        if (!cancelled) setScreen("name");
        return;
      }
      setUserId(storedId);
      try {
        await loadState(storedId);
        if (!cancelled) setScreen("app");
      } catch {
        localStorage.removeItem(STORAGE_USER_ID);
        localStorage.removeItem(STORAGE_USER_NAME);
        if (!cancelled) setScreen("name");
      }
    }

    init();
    return () => {
      cancelled = true;
    };
  }, [loadState]);

  const handleNameSubmit = async (name: string) => {
    setNameSubmitting(true);
    setNameError(null);
    try {
      const user = await createOrGetUser(name);
      localStorage.setItem(STORAGE_USER_ID, user.id);
      localStorage.setItem(STORAGE_USER_NAME, user.name);
      setUserId(user.id);
      await loadState(user.id);
      setScreen("app");
    } catch (err) {
      setNameError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
    } finally {
      setNameSubmitting(false);
    }
  };

  const runPick = async (scopeSlug: string | undefined, uiKey: string) => {
    if (!userId) return;
    setPickingSlug(uiKey);
    setBanner(null);
    try {
      const res = await pickMenu(userId, scopeSlug);
      if (!res.ok) {
        setBanner(res.error);
        return;
      }
      if (res.done) {
        setResult({ kind: "done", message: res.message, scopeSlug });
      } else {
        setResult({
          kind: "item",
          itemName: res.item.name,
          steps: res.item.steps,
          categoryName: res.category.name,
          categoryEmoji: res.category.emoji,
          scopeSlug,
        });
      }
      await loadState(userId);
    } catch (err) {
      setBanner(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
    } finally {
      setPickingSlug(null);
    }
  };

  const handleReset = async () => {
    if (!userId) return;
    if (!window.confirm("ต้องการรีเซ็ตเมนูที่สุ่มไปแล้วทั้งหมดใช่ไหม?")) return;
    setResetting(true);
    try {
      await resetPicks(userId);
      await loadState(userId);
      setResult(null);
    } catch (err) {
      setBanner(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
    } finally {
      setResetting(false);
    }
  };

  const handleSwitchUser = () => {
    localStorage.removeItem(STORAGE_USER_ID);
    localStorage.removeItem(STORAGE_USER_NAME);
    setUserId(null);
    setState(null);
    setResult(null);
    setScreen("name");
  };

  if (screen === "loading") {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-muted-foreground">กำลังโหลด...</p>
      </div>
    );
  }

  if (screen === "name" || !state) {
    return (
      <NameForm onSubmit={handleNameSubmit} submitting={nameSubmitting} error={nameError} />
    );
  }

  const totalItems = state.categories.reduce((sum, c) => sum + c.total, 0);
  const totalPicked = state.categories.reduce((sum, c) => sum + c.pickedCount, 0);

  return (
    <>
      <Header
        name={state.user.name}
        totalPicked={totalPicked}
        totalItems={totalItems}
        onReset={handleReset}
        onSwitchUser={handleSwitchUser}
        resetting={resetting}
      />

      {banner && (
        <div className="mx-auto mt-4 w-full max-w-3xl px-4">
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
            {banner}
          </div>
        </div>
      )}

      <CategoryGrid
        categories={state.categories}
        onPickCategory={(slug) => runPick(slug, slug)}
        onPickRandom={() => runPick(undefined, "__random__")}
        pickingSlug={pickingSlug}
      />

      <HistoryList picks={state.picks} />

      {result && (
        <ResultModal
          result={result}
          onClose={() => setResult(null)}
          rerolling={pickingSlug !== null}
          rerollLabel={result.scopeSlug ? "สุ่มหมวดนี้อีกครั้ง" : "สุ่มอีกครั้ง"}
          onRerollSameScope={() => runPick(result.scopeSlug, result.scopeSlug ?? "__random__")}
        />
      )}
    </>
  );
}
