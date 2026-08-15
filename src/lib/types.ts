export type CategorySummary = {
  slug: string;
  name: string;
  emoji: string;
  total: number;
  pickedCount: number;
};

export type PickHistoryItem = {
  id: string;
  menuItemName: string;
  steps: string[];
  categorySlug: string;
  categoryName: string;
  categoryEmoji: string;
  createdAt: string;
};

export type StateResponse = {
  user: { id: string; name: string };
  categories: CategorySummary[];
  picks: PickHistoryItem[];
};

export type PickMethod = "CATEGORY" | "RANDOM";

export type PickResponse =
  | {
      ok: true;
      done: false;
      item: { name: string; steps: string[] };
      category: { slug: string; name: string; emoji: string };
    }
  | {
      ok: true;
      done: true;
      message: string;
    }
  | {
      ok: false;
      error: string;
    };

export type InsightsResponse = {
  generatedAt: string;
  totals: { users: number; activeUsers: number; picks: number; resets: number };
  pickMethod: {
    category: number;
    random: number;
    unknown: number;
    categoryPercent: number;
    randomPercent: number;
  };
  categories: {
    slug: string;
    name: string;
    emoji: string;
    itemCount: number;
    pickCount: number;
    sharePercent: number;
    uniqueUsers: number;
    completionRatePercent: number;
  }[];
  topItems: { name: string; categoryName: string; categoryEmoji: string; count: number }[];
  neverPicked: { name: string; categoryName: string; categoryEmoji: string }[];
  resetStats: { totalResets: number; avgClearedCount: number; maxClearedCount: number };
  dailyPicks: { date: string; count: number }[];
  topUsers: { name: string; pickCount: number; categoriesTouched: number }[];
};
