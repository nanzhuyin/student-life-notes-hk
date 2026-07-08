import fs from 'node:fs/promises';

const PROGRAMMES_PATH = new URL('../src/data/programmes.json', import.meta.url);
const PLATFORM_DATA_PATH = new URL('../src/data/platformData.json', import.meta.url);

const TARGET_PROGRAMME_NAMES = [
  'Doctor of Business Administration in Global Digital Economy and Governance',
  'Master of Science in Arts Technology and Business',
  'Master of Social Sciences in Applied Psychology',
  'Master of Science in Smart Ageing and Gerontology',
  'Master of Science in Sustainability and Environmental Analytics'
];

const COURSE_NAME_ONLY_LIMIT =
  'The official public course library lists course names or programme structure for this programme, but detailed course descriptions are not available.';

function normalise(value) {
  return String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function cleanCourseName(value) {
  return String(value || '')
    .replace(/^[•\-\s]+/, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function isStructuralRow(courseName) {
  return /^(any\s+\d+\s+courses|optional sessions|course title|credits?|type)$/i.test(courseName);
}

function courseTypeFromPlatformCourse(course) {
  const typeKey = String(course.typeKey || '').toLowerCase();
  const type = String(course.type || '');
  if (typeKey === 'core' || /必修|核心/.test(type)) return 'core';
  if (typeKey === 'elective' || /選修|选修|elective/i.test(type)) return 'elective';
  if (typeKey === 'project' || /项目|研究|project/i.test(type)) return 'project';
  if (/foundation/i.test(type)) return 'foundation';
  return 'unknown';
}

function uniqueCourses(courses) {
  const seen = new Set();
  const result = [];
  for (const course of courses) {
    const courseName = cleanCourseName(course.title || course.titleZh);
    if (!courseName || isStructuralRow(courseName)) continue;
    const key = normalise(courseName);
    if (seen.has(key)) continue;
    seen.add(key);
    result.push({
      courseName,
      courseType: courseTypeFromPlatformCourse(course),
      sourceUrl: course.sourceUrl || ''
    });
  }
  return result;
}

function pickImportantCourses(courses) {
  const score = { core: 0, foundation: 1, project: 2, unknown: 3, elective: 4 };
  return courses
    .slice()
    .sort((a, b) => (score[a.courseType] ?? 9) - (score[b.courseType] ?? 9))
    .slice(0, 6);
}

function buildImportantCourse(course) {
  return {
    courseName: course.courseName,
    courseType: course.courseType,
    importance: course.courseType === 'core' || course.courseType === 'foundation' ? 'high' : course.courseType === 'project' ? 'medium' : 'medium',
    whyImportant:
      'The existing official-source course library lists this course as part of the programme structure, but detailed course description is not available. The recommendation assistant should interpret it conservatively based on the course title only.',
    relatedStudentBackgrounds: [],
    relatedCareerGoals: [],
    recommendedPreparations: [
      'Review the latest official programme page and course syllabus if available.',
      'Prepare by checking whether the course title aligns with your prior coursework and career goals.'
    ],
    sourceUrl: course.sourceUrl
  };
}

function findPlatformProgramme(platformData, programmeName) {
  return platformData.programmes.find((programme) =>
    [programme.title, programme.titleEn, programme.titleZh].some((value) => normalise(value) === normalise(programmeName))
  );
}

const programmes = JSON.parse(await fs.readFile(PROGRAMMES_PATH, 'utf8'));
const platformData = JSON.parse(await fs.readFile(PLATFORM_DATA_PATH, 'utf8'));
const lastUpdatedAt = new Date().toISOString();
const summary = [];

for (const programmeName of TARGET_PROGRAMME_NAMES) {
  const programme = programmes.find((item) => item.programmeName === programmeName);
  const platformProgramme = findPlatformProgramme(platformData, programmeName);
  if (!programme || !platformProgramme) {
    summary.push({ programmeName, status: 'missing', courseCount: 0 });
    continue;
  }

  const platformCourses = platformData.courses.filter((course) => course.programmeId === platformProgramme.id);
  const courses = uniqueCourses(platformCourses);
  const sourceUrls = Array.from(new Set([
    ...(programme.sourceUrls || []),
    platformProgramme.sourceUrl,
    ...platformCourses.map((course) => course.sourceUrl)
  ].filter(Boolean)));

  programme.coreCourses = courses.map((course) => course.courseName);
  programme.courseDescriptions = [];
  programme.importantCourses = pickImportantCourses(courses).map(buildImportantCourse);
  programme.informationInsufficient = true;
  programme.informationLimits = Array.from(new Set([
    COURSE_NAME_ONLY_LIMIT,
    ...((programme.informationLimits || []).filter((limit) => limit !== 'The official page does not provide detailed course information.'))
  ]));
  programme.sourceUrls = sourceUrls;
  programme.lastUpdatedAt = lastUpdatedAt;

  summary.push({
    programmeName,
    status: 'synced',
    courseCount: programme.coreCourses.length,
    importantCourseCount: programme.importantCourses.length
  });
}

await fs.writeFile(PROGRAMMES_PATH, `${JSON.stringify(programmes, null, 2)}\n`);
console.log(JSON.stringify(summary, null, 2));
