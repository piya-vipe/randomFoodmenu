import type { PickResponse, StateResponse, Vote } from "./types";

async function parseJsonOrThrow<T>(res: Response): Promise<T> {
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const message =
      (data && typeof data === "object" && "error" in data && (data as { error?: string }).error) ||
      "เกิดข้อผิดพลาด กรุณาลองใหม่";
    throw new Error(message);
  }
  return data as T;
}

export async function createOrGetUser(name: string): Promise<{ id: string; name: string }> {
  const res = await fetch("/api/user", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
  return parseJsonOrThrow(res);
}

export async function fetchState(userId: string): Promise<StateResponse> {
  const res = await fetch(`/api/state?userId=${encodeURIComponent(userId)}`, {
    cache: "no-store",
  });
  return parseJsonOrThrow(res);
}

export async function pickMenu(userId: string, categorySlug?: string): Promise<PickResponse> {
  const res = await fetch("/api/pick", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, categorySlug }),
  });
  return parseJsonOrThrow(res);
}

export async function sendFeedback(
  userId: string,
  menuItemId: string,
  vote: Vote | null
): Promise<{ ok: true; vote: Vote | null }> {
  const res = await fetch("/api/feedback", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, menuItemId, vote }),
  });
  return parseJsonOrThrow(res);
}

export async function resetPicks(userId: string): Promise<{ ok: true }> {
  const res = await fetch("/api/reset", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId }),
  });
  return parseJsonOrThrow(res);
}
