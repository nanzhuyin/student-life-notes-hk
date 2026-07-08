import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildDeepSeekUserPrompt,
  DEEPSEEK_SYSTEM_PROMPT,
  findProgrammeCandidates,
  RECOMMENDATION_DISCLAIMER,
  validateStudentProfile
} from './programme-recommender.mjs';

const baseProgramme = {
  id: 'base',
  programmeName: 'Base Programme',
  degreeLevel: 'Master',
  school: 'School',
  department: 'Department',
  officialUrl: 'https://example.test/base',
  summary: '',
  keywords: [],
  suitableBackgrounds: [],
  learningObjectives: [],
  coreCourses: [],
  courseDescriptions: [],
  importantCourses: [],
  skillsDeveloped: [],
  careerDirections: [],
  admissionNotes: '',
  informationInsufficient: true,
  informationLimits: ['The official page does not provide detailed course information.'],
  sourceText: '',
  sourceUrls: ['https://example.test/base'],
  sourceHash: 'hash',
  sourceUpdatedAt: '',
  lastUpdatedAt: '2026-07-08T00:00:00.000Z'
};

test('validateStudentProfile preserves selected programme and richer student context', () => {
  const profile = validateStudentProfile({
    hasChosenProgramme: true,
    selectedProgrammeId: 'msc-data-science',
    selectedProgrammeName: 'Master of Science in Data Science',
    undergraduateMajor: 'Statistics',
    masterMajor: 'Marketing',
    mainCourses: ['Python', 'Database'],
    skills: ['SQL'],
    interests: ['AI'],
    careerGoals: ['data analyst'],
    preferredDirections: ['data science'],
    targetDegreeLevels: ['Master'],
    studyPreferences: ['full-time'],
    concerns: ['weak programming background'],
    workExperience: ['research assistant']
  });

  assert.equal(profile.hasChosenProgramme, true);
  assert.equal(profile.selectedProgrammeId, 'msc-data-science');
  assert.equal(profile.selectedProgrammeName, 'Master of Science in Data Science');
  assert.equal(profile.masterMajor, 'Marketing');
  assert.deepEqual(profile.targetDegreeLevels, ['Master']);
  assert.deepEqual(profile.studyPreferences, ['full-time']);
  assert.deepEqual(profile.concerns, ['weak programming background']);
  assert.deepEqual(profile.workExperience, ['research assistant']);
});

test('findProgrammeCandidates keeps a selected programme in the candidate set for suitability analysis', () => {
  const selected = {
    ...baseProgramme,
    id: 'msc-cultural-studies',
    programmeName: 'Master of Cultural Studies',
    keywords: ['culture']
  };
  const strongMatch = {
    ...baseProgramme,
    id: 'msc-data-science',
    programmeName: 'Master of Science in Data Science',
    keywords: ['data science'],
    coreCourses: ['Programming for Data Science', 'Database Management'],
    skillsDeveloped: ['SQL', 'data analysis'],
    careerDirections: ['data analyst']
  };
  const profile = validateStudentProfile({
    hasChosenProgramme: true,
    selectedProgrammeId: 'msc-cultural-studies',
    undergraduateMajor: 'Statistics',
    mainCourses: ['Database'],
    skills: ['SQL'],
    careerGoals: ['data analyst'],
    interests: ['AI']
  });

  const candidates = findProgrammeCandidates([strongMatch, selected], profile, 2);

  assert.equal(candidates.length, 2);
  assert.ok(candidates.some((candidate) => candidate.programme.id === 'msc-cultural-studies'));
});

test('buildDeepSeekUserPrompt includes selected programme status and concerns', () => {
  const profile = validateStudentProfile({
    hasChosenProgramme: true,
    selectedProgrammeName: 'Master of Science in Data Science',
    undergraduateMajor: 'Statistics',
    masterMajor: 'Marketing',
    concerns: ['not sure if programming is enough']
  });

  const prompt = buildDeepSeekUserPrompt(profile, [baseProgramme]);

  assert.match(prompt, /Has chosen programme: true/);
  assert.match(prompt, /Selected programme name: Master of Science in Data Science/);
  assert.match(prompt, /Master's major: Marketing/);
  assert.match(prompt, /Concerns: \["not sure if programming is enough"\]/);
});

test('DeepSeek prompt requires Simplified Chinese user-facing output', () => {
  const profile = validateStudentProfile({
    undergraduateMajor: 'Statistics',
    careerGoals: ['data analyst']
  });

  const prompt = buildDeepSeekUserPrompt(profile, [baseProgramme]);

  assert.match(DEEPSEEK_SYSTEM_PROMPT, /Simplified Chinese/);
  assert.match(prompt, /Write all user-facing text values in Simplified Chinese/);
  assert.equal(RECOMMENDATION_DISCLAIMER, '本推荐仅供参考，最终信息请以官方专业网站为准。');
});
