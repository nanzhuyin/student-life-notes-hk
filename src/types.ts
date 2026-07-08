export type CategoryKey =
  | 'hk_rent'
  | 'sz_commute'
  | 'hk_life'
  | 'nearby_food'
  | 'transport_spots'
  | 'course_catalog';

export type SchoolId = 'eduhk' | 'lingnan';

export type CourseTypeKey = 'core' | 'elective' | 'project' | 'general';

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

export interface School {
  id: SchoolId;
  shortName: string;
  name: string;
  nameEn: string;
  accent: string;
  description: string;
}

export interface Programme {
  id: string;
  schoolId: SchoolId;
  school: string;
  faculty: string;
  unitName?: string;
  unitType?: string;
  unitLabel?: string;
  parentUnit?: string;
  unitNote?: string;
  title: string;
  titleZh?: string;
  titleEn?: string;
  translationNote?: string;
  medium: string;
  mediumDetail: string;
  programmeCodes: string[];
  studyModes: string[];
  totalCredits: number | null;
  sourceUrl?: string;
  checkedAt?: string;
  courseCount?: number;
  dataLevel?: 'programme' | 'courses';
  statusBadge?: string;
  statusNote?: string;
  requirements: {
    core: number | null;
    elective: number | null;
    project: number | null;
    note: string;
  };
}

export interface Course {
  id: string;
  programmeId: string;
  programmeTitle: string;
  schoolId: SchoolId;
  school: string;
  faculty?: string;
  unitName?: string;
  unitType?: string;
  unitLabel?: string;
  parentUnit?: string;
  unitNote?: string;
  title: string;
  titleZh: string;
  type: string;
  typeKey: CourseTypeKey;
  credits: number | null;
  creditsText: string;
  required: boolean;
  description: string;
  medium: string;
  mediumDetail: string;
  programmeCodes: string[];
  sourceUrl: string;
  checkedAt: string;
  semester: string;
  prerequisites: string;
  courseCode: string;
  tags: string[];
  notes?: string;
  learnerFit?: string[];
  learningGains?: string[];
  careerLinks?: string[];
  selectionAdvice?: string;
  materialBasis?: string[];
}

export interface SharedPost {
  id: string;
  sectionId: string;
  title: string;
  content: string;
  summary?: string;
  tags: string[];
  region?: string;
  source?: string;
  authorRole: string;
  createdAt: string;
  updatedAt?: string;
  status: 'published' | 'draft' | 'deleted' | string;
  shared?: boolean;
  recommended?: boolean;
  ownerId?: string;
  schoolId?: SchoolId | 'shared';
  imageUrls?: string[];
  metadata?: Record<string, string>;
}

export interface PlatformData {
  version: string;
  generatedAt: string;
  schools: School[];
  programmes: Programme[];
  courses: Course[];
  sharedPosts: SharedPost[];
}
