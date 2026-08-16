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

/* ---------- Per-user analytics ---------- */

export type DeviceInfo = {
  browser: string;
  os: string;
  deviceType: string;
};

export type UserSummary = {
  id: string;
  name: string;
  createdAt: string;
  pickCount: number;
  voteCount: number;
  resetCount: number;
  visitCount: number;
  lastSeen: string | null;
  lastDevice: DeviceInfo | null;
  hasLocation: boolean;
};

export type MapPin = {
  userId: string;
  userName: string;
  latitude: number;
  longitude: number;
  accuracy: number | null;
  recordedAt: string;
};

export type UsersResponse = {
  users: UserSummary[];
  deviceMix: { label: string; count: number }[];
  browserMix: { label: string; count: number }[];
  osMix: { label: string; count: number }[];
  pins: MapPin[];
  locationConsentCount: number;
};

export type UserVisit = {
  id: string;
  browser: string;
  os: string;
  deviceType: string;
  locationConsent: boolean;
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  createdAt: string;
};

export type UserPickRow = {
  id: string;
  menuItemName: string;
  categoryName: string;
  categoryEmoji: string;
  method: PickMethod | null;
  vote: Vote | null;
  createdAt: string;
};

export type UserDetail = {
  id: string;
  name: string;
  createdAt: string;
  pickCount: number;
  likeCount: number;
  dislikeCount: number;
  resetCount: number;
  visitCount: number;
  lastSeen: string | null;
  visits: UserVisit[];
  picks: UserPickRow[];
  categoryBreakdown: { name: string; emoji: string; count: number; percent: number }[];
  dailyActivity: { date: string; count: number }[];
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
