export type CategoryKey =
  | 'hk_rent'
  | 'sz_commute'
  | 'hk_life'
  | 'nearby_food'
  | 'transport_spots'
  | 'course_catalog';

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
