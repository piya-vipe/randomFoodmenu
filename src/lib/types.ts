export type CategorySummary = {
  slug: string;
  name: string;
  emoji: string;
  total: number;
  pickedCount: number;
};

export type Vote = "LIKE" | "DISLIKE";

export type PickHistoryItem = {
  id: string;
  menuItemId: string;
  menuItemName: string;
  steps: string[];
  ingredients: string[];
  servingSize: string;
  vote: Vote | null;
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

export type PickedItem = {
  id: string;
  name: string;
  steps: string[];
  ingredients: string[];
  servingSize: string;
};

export type PickResponse =
  | {
      ok: true;
      done: false;
      item: PickedItem;
      category: { slug: string; name: string; emoji: string };
      /** Names used to animate the shuffle reel before the winner lands. */
      reel: string[];
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
  totals: {
    users: number;
    activeUsers: number;
    picks: number;
    resets: number;
    votes: number;
  };
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
  /** Menus ranked by how well they land with users — drives keep/drop decisions. */
  feedback: {
    overall: { likes: number; dislikes: number; likePercent: number };
    mostLiked: FeedbackRow[];
    mostDisliked: FeedbackRow[];
    dropCandidates: FeedbackRow[];
    noFeedback: { name: string; categoryName: string; categoryEmoji: string }[];
  };
};

export type FeedbackRow = {
  menuItemId: string;
  name: string;
  categoryName: string;
  categoryEmoji: string;
  likes: number;
  dislikes: number;
  total: number;
  likePercent: number;
};

/* ---------- Admin ---------- */

export type AdminMenuItem = {
  id: string;
  name: string;
  steps: string[];
  ingredients: string[];
  servingSize: string;
  source: "SEED" | "MANUAL";
  isActive: boolean;
  categorySlug: string;
  categoryName: string;
  categoryEmoji: string;
  pickCount: number;
  likes: number;
  dislikes: number;
};

export type AdminCategory = {
  id: string;
  slug: string;
  name: string;
  emoji: string;
  order: number;
  source: "SEED" | "MANUAL";
  itemCount: number;
};

export type AdminDataResponse = {
  categories: AdminCategory[];
  menuItems: AdminMenuItem[];
};

/* ---------- CSV import ---------- */

export type ImportRowResult = {
  line: number;
  menuName: string;
  categoryName: string;
  action: "create" | "update" | "error";
  message?: string;
  ingredientCount?: number;
  stepCount?: number;
  servingSize?: string;
};

export type ImportReport = {
  dryRun: boolean;
  totalRows: number;
  created: number;
  updated: number;
  errors: number;
  categoriesToCreate: string[];
  rows: ImportRowResult[];
};
