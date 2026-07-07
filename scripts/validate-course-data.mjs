import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const args = new Set(process.argv.slice(2));
const shouldCheckSources = args.has('--check-sources');
const shouldWriteReport = args.has('--write-report');
const root = process.cwd();
const data = JSON.parse(readFileSync(join(root, 'src/data/platformData.json'), 'utf8'));
const errors = [];
const warnings = [];
const sourceChecks = [];

function addError(message) {
  errors.push(message);
}

function addWarning(message) {
  warnings.push(message);
}

function hasText(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function isKnownMedium(value) {
  return hasText(value) && (
    value.includes('英文') ||
    value.includes('中文') ||
    value.includes('按项目官网说明') ||
    value.includes('以项目官方安排为准') ||
    value.includes('按项目课程清单查看') ||
    value.includes('按课程说明') ||
    value.includes('以官网') ||
    value.includes('双语')
  );
}

const schoolIds = new Set(data.schools.map((school) => school.id));
const programmesById = new Map();
const courseIds = new Set();
const programmeCourseCounts = new Map();
const courseCodeKeys = new Set();

for (const programme of data.programmes) {
  if (!hasText(programme.id)) addError('存在缺少 id 的项目');
  if (programmesById.has(programme.id)) addError(`项目 id 重复：${programme.id}`);
  programmesById.set(programme.id, programme);
  if (!schoolIds.has(programme.schoolId)) addError(`项目 ${programme.id} 的 schoolId 无效：${programme.schoolId}`);
  if (!hasText(programme.title)) addError(`项目 ${programme.id} 缺少 title`);
  if (!hasText(programme.faculty)) addError(`项目 ${programme.id} 缺少 faculty`);
  if (!isKnownMedium(programme.medium)) addWarning(`项目 ${programme.id} 授课语言需要人工复核：${programme.medium || '(空)'}`);
  if (!hasText(programme.mediumDetail)) addWarning(`项目 ${programme.id} 缺少 mediumDetail`);
  if (!hasText(programme.sourceUrl)) addWarning(`项目 ${programme.id} 缺少 sourceUrl`);
  if (!hasText(programme.checkedAt)) addWarning(`项目 ${programme.id} 缺少 checkedAt`);
}

for (const course of data.courses) {
  if (!hasText(course.id)) addError('存在缺少 id 的课程');
  if (courseIds.has(course.id)) addError(`课程 id 重复：${course.id}`);
  courseIds.add(course.id);

  const programme = programmesById.get(course.programmeId);
  if (!programme) {
    addError(`课程 ${course.id} 指向不存在的项目：${course.programmeId}`);
  } else {
    programmeCourseCounts.set(course.programmeId, (programmeCourseCounts.get(course.programmeId) || 0) + 1);
    if (course.schoolId !== programme.schoolId) addError(`课程 ${course.id} 与项目 ${programme.id} 学校不一致`);
    if (course.school !== programme.school) addWarning(`课程 ${course.id} 与项目 ${programme.id} 学校名称不一致`);
  }

  if (!schoolIds.has(course.schoolId)) addError(`课程 ${course.id} 的 schoolId 无效：${course.schoolId}`);
  if (!hasText(course.title) && !hasText(course.titleZh)) addError(`课程 ${course.id} 缺少课程标题`);
  if (!hasText(course.type)) addWarning(`课程 ${course.id} 缺少课程类型`);
  if (!['core', 'elective', 'project', 'general'].includes(course.typeKey)) addError(`课程 ${course.id} typeKey 无效：${course.typeKey}`);
  if (!isKnownMedium(course.medium)) addWarning(`课程 ${course.id} 授课语言需要人工复核：${course.medium || '(空)'}`);
  if (!hasText(course.mediumDetail)) addWarning(`课程 ${course.id} 缺少 mediumDetail`);
  if (!hasText(course.sourceUrl)) addWarning(`课程 ${course.id} 缺少 sourceUrl`);
  if (!hasText(course.checkedAt)) addWarning(`课程 ${course.id} 缺少 checkedAt`);
  if (!hasText(course.creditsText) && !(typeof course.credits === 'number' && course.credits > 0)) addWarning(`课程 ${course.id} 缺少学分说明`);
  if (hasText(course.courseCode)) {
    const key = `${course.programmeId}:${course.courseCode.trim().toLowerCase()}`;
    if (courseCodeKeys.has(key)) addWarning(`同一项目内课程代码重复：${key}`);
    courseCodeKeys.add(key);
  }
}

for (const programme of data.programmes) {
  const actual = programmeCourseCounts.get(programme.id) || 0;
  if (programme.dataLevel === 'courses' && actual === 0) addWarning(`项目 ${programme.id} 标记有课程数据，但没有课程条目`);
  if (typeof programme.courseCount === 'number' && programme.courseCount !== actual) {
    addWarning(`项目 ${programme.id} courseCount=${programme.courseCount}，实际课程=${actual}`);
  }
}

async function checkUrl(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  try {
    let response = await fetch(url, { method: 'HEAD', redirect: 'follow', signal: controller.signal });
    if (response.status === 405 || response.status === 403) {
      response = await fetch(url, { method: 'GET', redirect: 'follow', signal: controller.signal });
    }
    return { url, ok: response.ok, status: response.status };
  } catch (error) {
    return { url, ok: false, status: 'ERR', error: error instanceof Error ? error.message : String(error) };
  } finally {
    clearTimeout(timer);
  }
}

if (shouldCheckSources) {
  const urls = Array.from(new Set([
    ...data.programmes.map((item) => item.sourceUrl),
    ...data.courses.map((item) => item.sourceUrl)
  ].filter(hasText)));
  let index = 0;
  const workers = Array.from({ length: 6 }, async () => {
    while (index < urls.length) {
      const url = urls[index++];
      sourceChecks.push(await checkUrl(url));
    }
  });
  await Promise.all(workers);
  sourceChecks
    .filter((item) => !item.ok)
    .forEach((item) => addWarning(`来源 URL 无法确认访问：${item.url} (${item.status}${item.error ? ` ${item.error}` : ''})`));
}

const bySchool = data.schools.map((school) => {
  const programmes = data.programmes.filter((programme) => programme.schoolId === school.id);
  const courses = data.courses.filter((course) => course.schoolId === school.id);
  const mediumCounts = courses.reduce((acc, course) => {
    const key = course.medium || '未标注';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
  return { school: school.name, programmes: programmes.length, courses: courses.length, mediumCounts };
});

const reportLines = [
  '# Course Data Audit',
  '',
  `Generated at: ${new Date().toISOString()}`,
  `Data version: ${data.version}`,
  `Programmes: ${data.programmes.length}`,
  `Courses: ${data.courses.length}`,
  `Errors: ${errors.length}`,
  `Warnings: ${warnings.length}`,
  `Source URL checks: ${sourceChecks.length || 'not run'}`,
  '',
  '## By School',
  '',
  ...bySchool.flatMap((item) => [
    `### ${item.school}`,
    '',
    `- Programmes: ${item.programmes}`,
    `- Courses: ${item.courses}`,
    `- Medium labels: ${Object.entries(item.mediumCounts).map(([label, count]) => `${label} ${count}`).join('; ') || 'none'}`,
    ''
  ]),
  '## Errors',
  '',
  ...(errors.length ? errors.map((item) => `- ${item}`) : ['- None']),
  '',
  '## Warnings',
  '',
  ...(warnings.length ? warnings.slice(0, 300).map((item) => `- ${item}`) : ['- None']),
  warnings.length > 300 ? `\n${warnings.length - 300} more warnings omitted from report.` : '',
  '',
  '## Source URL Checks',
  '',
  ...(sourceChecks.length ? sourceChecks.map((item) => `- ${item.ok ? 'OK' : 'CHECK'} ${item.status} ${item.url}`) : ['- Not run. Use `npm run validate:courses -- --check-sources`.'])
].filter(Boolean);

const report = `${reportLines.join('\n')}\n`;
if (shouldWriteReport) writeFileSync(join(root, 'docs/COURSE_DATA_AUDIT.md'), report);

console.log(JSON.stringify({
  version: data.version,
  schools: bySchool,
  programmes: data.programmes.length,
  courses: data.courses.length,
  errors: errors.length,
  warnings: warnings.length,
  sourceChecks: sourceChecks.length,
  report: shouldWriteReport ? 'docs/COURSE_DATA_AUDIT.md' : null
}, null, 2));

if (errors.length) process.exitCode = 1;
