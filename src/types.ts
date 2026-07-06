export type CategoryKey =
  | 'housing'
  | 'commute'
  | 'food'
  | 'travel'
  | 'adaptation'
  | 'hk-life';

export interface NotePost {
  id: string;
  title: string;
  category: CategoryKey;
  categoryName: string;
  summary: string;
  content: string[];
  tags: string[];
  region: string;
  source: string;
  updatedAt: string;
  recommended: boolean;
}

export interface CategoryMeta {
  key: CategoryKey;
  name: string;
  description: string;
  accent: string;
}
