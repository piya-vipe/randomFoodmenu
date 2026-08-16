"use client";

import { useCallback, useEffect, useState } from "react";
import {
  createOrGetUser,
  deleteLocation,
  fetchState,
  pickMenu,
  resetPicks,
  saveLocation,
  sendFeedback,
} from "@/lib/api";
import type { StateResponse, Vote } from "@/lib/types";
import LocationPrompt from "./LocationPrompt";
import NameForm from "./NameForm";
import Header from "./Header";
import CategoryGrid from "./CategoryGrid";
import HistoryList from "./HistoryList";
import ResultModal, { type ResultState } from "./ResultModal";
import ShuffleOverlay from "./ShuffleOverlay";

const STORAGE_USER_ID = "menuPicker.userId";
const STORAGE_USER_NAME = "menuPicker.userName";
/** Remembers that we already asked about location, so we ask once per browser. */
const STORAGE_LOCATION_ASKED = "menuPicker.locationAsked";

type Screen = "loading" | "name" | "app";

type PendingReveal = {
  reel: string[];
  scopeLabel: string;
  scopeEmoji: string;
  result: ResultState & { scopeSlug?: string };
};

export default function AppShell() {
  const [screen, setScreen] = useState<Screen>("loading");
  const [userId, setUserId] = useState<string | null>(null);
  const [state, setState] = useState<StateResponse | null>(null);
  const [nameSubmitting, setNameSubmitting] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);
  const [pickingSlug, setPickingSlug] = useState<string | null>(null);
  const [shuffle, setShuffle] = useState<PendingReveal | null>(null);
  const [result, setResult] = useState<(ResultState & { scopeSlug?: string }) | null>(null);
  const [resetting, setResetting] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);
  const [visitId, setVisitId] = useState<string | null>(null);
  const [askLocation, setAskLocation] = useState(false);

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
      setVisitId(user.visitId);
      await loadState(user.id);
      setScreen("app");

      // Ask about location once per browser, after they're already in.
      if (!localStorage.getItem(STORAGE_LOCATION_ASKED)) {
        setAskLocation(true);
      }
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
    setResult(null);
    try {
      const res = await pickMenu(userId, scopeSlug);
      if (!res.ok) {
        setBanner(res.error);
        return;
      }

      if (res.done) {
        setResult({ kind: "done", message: res.message, scopeSlug });
        await loadState(userId);
        return;
      }

      const scopeCategory = scopeSlug
        ? state?.categories.find((c) => c.slug === scopeSlug)
        : undefined;

      // Hold the answer behind the shuffle animation; ShuffleOverlay reveals it.
      setShuffle({
        reel: res.reel,
        scopeLabel: scopeCategory ? scopeCategory.name : "ทุกหมวด",
        scopeEmoji: scopeCategory ? scopeCategory.emoji : "🎲",
        result: {
          kind: "item",
          menuItemId: res.item.id,
          itemName: res.item.name,
          steps: res.item.steps,
          ingredients: res.item.ingredients,
          servingSize: res.item.servingSize,
          categoryName: res.category.name,
          categoryEmoji: res.category.emoji,
          scopeSlug,
        },
      });

      await loadState(userId);
    } catch (err) {
      setBanner(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
    } finally {
      setPickingSlug(null);
    }
  };

  const handleVote = async (menuItemId: string, vote: Vote) => {
    if (!userId || !state) return;

    // Tapping the active vote again clears it.
    const current = state.picks.find((p) => p.menuItemId === menuItemId)?.vote ?? null;
    const nextVote = current === vote ? null : vote;

    // Optimistic update so the button responds instantly.
    setState({
      ...state,
      picks: state.picks.map((p) =>
        p.menuItemId === menuItemId ? { ...p, vote: nextVote } : p
      ),
    });

    try {
      await sendFeedback(userId, menuItemId, nextVote);
    } catch (err) {
      setBanner(err instanceof Error ? err.message : "บันทึกไม่สำเร็จ");
      await loadState(userId).catch(() => {});
    }
  };

  const handleShareLocation = async (coords: {
    latitude: number;
    longitude: number;
    accuracy: number;
  }) => {
    localStorage.setItem(STORAGE_LOCATION_ASKED, "1");
    setAskLocation(false);
    if (!visitId) return;
    try {
      await saveLocation(visitId, coords);
    } catch {
      // Location is entirely optional — never block the app on it.
    }
  };

  const handleSkipLocation = () => {
    localStorage.setItem(STORAGE_LOCATION_ASKED, "1");
    setAskLocation(false);
  };

  const handleForgetLocation = async () => {
    if (!userId) return;
    if (!window.confirm("ลบข้อมูลตำแหน่งทั้งหมดของคุณออกจากระบบ?")) return;
    try {
      await deleteLocation(userId);
      localStorage.removeItem(STORAGE_LOCATION_ASKED);
      setBanner("ลบข้อมูลตำแหน่งของคุณเรียบร้อยแล้ว");
    } catch (err) {
      setBanner(err instanceof Error ? err.message : "ลบไม่สำเร็จ");
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
    setShuffle(null);
    setVisitId(null);
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
    return <NameForm onSubmit={handleNameSubmit} submitting={nameSubmitting} error={nameError} />;
  }

  const totalItems = state.categories.reduce((sum, c) => sum + c.total, 0);
  const totalPicked = state.categories.reduce((sum, c) => sum + c.pickedCount, 0);

  const resultVote =
    result?.kind === "item"
      ? state.picks.find((p) => p.menuItemId === result.menuItemId)?.vote ?? null
      : null;

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
        pickingSlug={pickingSlug ?? (shuffle ? "__random__" : null)}
      />

      <HistoryList picks={state.picks} onVote={handleVote} />

      <div className="mx-auto w-full max-w-3xl px-4 pb-10 text-center">
        <button
          onClick={handleForgetLocation}
          className="text-xs text-muted-foreground underline hover:text-foreground"
        >
          ลบข้อมูลตำแหน่งของฉัน
        </button>
      </div>

      {askLocation && (
        <LocationPrompt onShare={handleShareLocation} onSkip={handleSkipLocation} />
      )}

      {shuffle && (
        <ShuffleOverlay
          reel={shuffle.reel}
          scopeLabel={shuffle.scopeLabel}
          scopeEmoji={shuffle.scopeEmoji}
          onDone={() => {
            setResult(shuffle.result);
            setShuffle(null);
          }}
        />
      )}

      {result && !shuffle && (
        <ResultModal
          result={result}
          vote={resultVote}
          onVote={(vote) =>
            result.kind === "item" ? handleVote(result.menuItemId, vote) : undefined
          }
          onClose={() => setResult(null)}
          rerolling={pickingSlug !== null}
          rerollLabel={result.scopeSlug ? "สุ่มหมวดนี้อีกครั้ง" : "สุ่มอีกครั้ง"}
          onRerollSameScope={() => runPick(result.scopeSlug, result.scopeSlug ?? "__random__")}
        />
      )}
    </>
  );
}
