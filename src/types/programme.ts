export type ProgrammeDegreeLevel = 'Bachelor' | 'Master' | 'Doctor' | 'Postgraduate Diploma' | 'Certificate' | 'Other';

export type ProgrammeCourseType = 'core' | 'elective' | 'foundation' | 'project' | 'unknown';

export type ImportanceLevel = 'high' | 'medium' | 'low';

export type MatchLevel = 'high' | 'medium' | 'low';

export type GraduateOutcomeType = 'graduateDestination' | 'careerProspect' | 'employmentSector' | 'furtherStudy' | 'professionalAccreditation' | 'unknown';

export type ProgrammeSourceType = 'official' | 'officialSocial' | 'publicSocial';

export interface CourseDescription {
  courseName: string;
  description: string;
  courseType: ProgrammeCourseType;
  sourceUrl: string;
}

export interface ImportantCourse {
  courseName: string;
  courseType: ProgrammeCourseType;
  importance: ImportanceLevel;
  whyImportant: string;
  relatedStudentBackgrounds: string[];
  relatedCareerGoals: string[];
  recommendedPreparations: string[];
  sourceUrl: string;
}

export interface GraduateOutcome {
  year: string;
  outcomeType: GraduateOutcomeType;
  description: string;
  roles: string[];
  sectors: string[];
  employers: string[];
  sourceType: ProgrammeSourceType;
  sourceName: string;
  sourceReliability: 'official' | 'verified-public' | 'public-reference';
  sourceUrl: string;
  sourceText: string;
}

export interface Programme {
  id: string;
  programmeName: string;
  degreeLevel: ProgrammeDegreeLevel;
  school: string;
  department: string;
  officialUrl: string;
  summary: string;
  keywords: string[];
  suitableBackgrounds: string[];
  learningObjectives: string[];
  coreCourses: string[];
  courseDescriptions: CourseDescription[];
  importantCourses: ImportantCourse[];
  skillsDeveloped: string[];
  careerDirections: string[];
  graduateOutcomeSummary: string;
  graduateOutcomes: GraduateOutcome[];
  graduateOutcomeInformationInsufficient: boolean;
  graduateOutcomeInformationLimits: string[];
  admissionNotes: string;
  informationInsufficient: boolean;
  informationLimits: string[];
  sourceText: string;
  sourceUrls: string[];
  sourceHash: string;
  sourceUpdatedAt: string;
  lastUpdatedAt: string;
}

export interface StudentProfile {
  hasChosenProgramme: boolean;
  selectedProgrammeId: string;
  selectedProgrammeName: string;
  undergraduateMajor: string;
  masterMajor: string;
  mainCourses: string[];
  skills: string[];
  interests: string[];
  careerGoals: string[];
  preferredDirections: string[];
  targetDegreeLevels: ProgrammeDegreeLevel[];
  studyPreferences: string[];
  concerns: string[];
  workExperience: string[];
  otherContext: string;
}

export interface ImportantCourseForStudent {
  courseName: string;
  courseType: ProgrammeCourseType;
  importance: ImportanceLevel;
  whyThisCourseMatters: string;
  relatedToUserInput: string[];
  studentPreparationAdvice: string[];
  sourceUrl: string;
}

export interface ProgrammeRecommendation {
  programmeId: string;
  programmeName: string;
  matchScore: number;
  matchLevel: MatchLevel;
  whyRecommended: string[];
  backgroundMatch: {
    matchedMajor: string;
    matchedCourses: string[];
    matchedSkills: string[];
    matchedInterests: string[];
    matchedCareerGoals: string[];
    explanation: string;
  };
  importantCoursesForThisStudent: ImportantCourseForStudent[];
  potentialGaps: string[];
  suggestedPreparations: string[];
  careerFit: string[];
  futureOutcomes: string[];
  sourceUrl: string;
}

export interface ProgrammeRecommendationResult {
  summary: string;
  recommendations: ProgrammeRecommendation[];
  notRecommended: Array<{
    programmeId: string;
    programmeName: string;
    reason: string;
  }>;
  informationLimits: string[];
  disclaimer: string;
}

export type RecommendationApiRequest = StudentProfile;

export type RecommendationApiResponse =
  | {
      ok: true;
      data: ProgrammeRecommendationResult;
    }
  | {
      ok: false;
      message: string;
      code: 'VALIDATION_ERROR' | 'AUTH_REQUIRED' | 'NO_CANDIDATE_PROGRAMMES' | 'MODEL_API_ERROR' | 'MODEL_OUTPUT_INVALID' | 'INTERNAL_ERROR';
    };
