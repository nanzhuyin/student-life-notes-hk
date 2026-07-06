import fs from 'node:fs';

const DATA_PATH = 'src/data/platformData.json';
const EXTRACT_PATH = 'tmp-eduhk-course-extract.json';

const data = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
const extracted = JSON.parse(fs.readFileSync(EXTRACT_PATH, 'utf8'));
const programmes = new Map(data.programmes.map((programme) => [programme.id, programme]));

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 90);
}

function cleanTitle(value) {
  return (value || '')
    .replace(/^\*+/, '')
    .replace(/^\d+[\).、]\s*/, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseCourse(rawCourse) {
  let title = cleanTitle(rawCourse.title);
  let type = rawCourse.type || '一般课程';
  let typeKey = rawCourse.typeKey || 'general';
  let credits = rawCourse.credits ?? null;
  let courseCode = rawCourse.courseCode || '';

  const labelled = title.match(/^(Core|Elective|Project|Thesis|Field Attachment)\s*:\s*(.+)$/i);
  if (labelled) {
    title = cleanTitle(labelled[2]);
    const label = labelled[1].toLowerCase();
    if (label === 'core') {
      type = '核心课';
      typeKey = 'core';
    } else if (label === 'elective') {
      type = '选修课';
      typeKey = 'elective';
    } else {
      type = '项目课';
      typeKey = 'project';
    }
  }

  const codeMatch = title.match(/^([A-Z]{2,8}\d{4,5}[A-Z]?)\s+(.+)$/);
  if (codeMatch) {
    courseCode = courseCode || codeMatch[1];
    title = cleanTitle(codeMatch[2]);
  }

  const creditMatch = title.match(/\((\d+(?:\.\d+)?)\s*cps?\)$/i);
  if (creditMatch) {
    credits = Number(creditMatch[1]);
    title = cleanTitle(title.replace(/\((\d+(?:\.\d+)?)\s*cps?\)$/i, ''));
  }

  if (/thesis|dissertation|field attachment|internship|capstone|project/i.test(title) && typeKey === 'general') {
    type = '项目课';
    typeKey = 'project';
  }

  return { ...rawCourse, title, type, typeKey, credits, courseCode };
}

function isNoise(course) {
  const title = cleanTitle(course.title);
  if (!title || title.length < 4) return true;
  if (/^\*?[A-Z]{2,8}\d{4,5}[A-Z]?$/.test(title)) return true;
  if (/^(credit points?|total credit points?|cps?|component|course title|taught courses|cross-semester core course|elective courses? - block [ab])$/i.test(title)) return true;
  if (/^(hotline|fax|e-?mail|website|in person|follow us on|scholarship|award|certifying institution)\s*:?$/i.test(title)) return true;
  if (/^(MA\(PFE\)|Master of Arts in Personal Finance Education).*(Full-time|Part-time)/i.test(title)) return true;
  if (/^(eligible for|completion of|risk management of|corporate finance services of|enhanced competency framework|institute of)/i.test(title)) return true;
  return false;
}

function requiredFor(typeKey) {
  return typeKey === 'core' || typeKey === 'project';
}

const newCourses = [];
const summaries = [];
const replacementProgrammeIds = new Set();

for (const item of extracted) {
  const programme = programmes.get(item.programmeId);
  if (!programme || !item.courses?.length) continue;

  const seen = new Set();
  const courses = item.courses
    .map(parseCourse)
    .filter((course) => !isNoise(course))
    .filter((course) => {
      const key = `${course.courseCode || ''}|${course.title}`.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

  for (const course of courses) {
    const id = `${programme.id}-${slugify(course.courseCode || course.title)}`;
    newCourses.push({
      id,
      programmeId: programme.id,
      programmeTitle: programme.title,
      schoolId: 'eduhk',
      school: '香港教育大学',
      faculty: programme.faculty,
      title: course.title,
      titleZh: course.title,
      type: course.type,
      typeKey: course.typeKey,
      credits: course.credits ?? null,
      creditsText: course.credits ? `${course.credits} cps` : '学分待官网进一步核对',
      required: requiredFor(course.typeKey),
      description: '课程名称与结构根据 EdUHK 官方项目页面公开资料整理；课程简介、开课学期和先修要求后续继续按 handbook / course catalogue 补齐。',
      medium: programme.medium,
      mediumDetail: programme.mediumDetail,
      programmeCodes: programme.programmeCodes || [],
      sourceUrl: programme.sourceUrl,
      checkedAt: '2026-07-06',
      semester: '待官网 handbook / course catalogue 进一步核对',
      prerequisites: '官网公开页暂未列明',
      courseCode: course.courseCode || '待官网 course catalogue 进一步核对',
      tags: [programme.title, course.type, programme.faculty].filter(Boolean),
      notes: '由 EdUHK 官方项目页面课程结构自动整理，需继续人工复核课程代码、学期和先修要求。'
    });
  }

  replacementProgrammeIds.add(programme.id);
  programme.courseCount = courses.length;
  programme.dataLevel = courses.length ? 'courses' : programme.dataLevel || 'programme';
  programme.statusNote = courses.length
    ? '已从官方项目页面抽取课程结构；课程代码、简介、开课学期和先修要求继续逐步复核。'
    : programme.statusNote;
  if (programme.requirements) {
    const core = courses.filter((course) => course.typeKey === 'core').length;
    const elective = courses.filter((course) => course.typeKey === 'elective').length;
    const project = courses.filter((course) => course.typeKey === 'project').length;
    programme.requirements = {
      ...programme.requirements,
      core: core || programme.requirements.core,
      elective: elective || programme.requirements.elective,
      project: project || programme.requirements.project,
      note: `已整理 ${courses.length} 门官网公开课程；毕业要求、选修规则和开课安排仍以官网最新资料为准。`
    };
  }
  summaries.push({ programme: programme.title, count: courses.length });
}

const keptCourses = data.courses.filter(
  (course) =>
    course.schoolId !== 'eduhk' ||
    course.programmeId.startsWith('aiep-') ||
    !replacementProgrammeIds.has(course.programmeId)
);
data.courses = [...keptCourses, ...newCourses];
data.version = 'v1.05';
data.generatedAt = '2026-07-06';

fs.writeFileSync(DATA_PATH, `${JSON.stringify(data, null, 2)}\n`);

console.log(JSON.stringify({
  addedCourses: newCourses.length,
  eduhkProgrammesWithCourses: data.programmes.filter((programme) => programme.schoolId === 'eduhk' && (programme.courseCount || 0) > 0).length,
  summaries
}, null, 2));
