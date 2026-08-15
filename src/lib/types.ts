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

export type PickResponse =
  | {
      ok: true;
      done: false;
      item: { name: string };
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
