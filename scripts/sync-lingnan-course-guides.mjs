import fs from 'node:fs/promises';

const PROGRAMMES_PATH = new URL('../src/data/programmes.json', import.meta.url);
const PLATFORM_DATA_PATH = new URL('../src/data/platformData.json', import.meta.url);
const TRANSLATE_DELAY_MS = Number(process.env.TRANSLATE_DELAY_MS || 220);
const TRANSLATE_ENDPOINT = 'https://translate.googleapis.com/translate_a/single';
const TRANSLATE_CHUNK_SIZE = 1600;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalize(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/[^a-z0-9\u4e00-\u9fff]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function stripCourseCode(value = '') {
  return String(value || '')
    .replace(/^[A-Z]{2,8}\d{3,5}[A-Z]?\s*[:：]?\s*/i, '')
    .replace(/\s*\(\s*\d+(?:\.\d+)?\s*(credits?|units?|cps?)\s*\)\s*/gi, ' ')
    .replace(/\s+\d+\s*(credits?|units?|cps?)$/i, '')
    .replace(/\s*\*\s*or\s*$/i, '')
    .replace(/\s*[#^*]+\s*$/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function courseCode(value = '') {
  return String(value || '').match(/\b[A-Z]{2,8}\d{3,5}[A-Z]?\b/)?.[0] || '';
}

function splitText(text, maxLength = TRANSLATE_CHUNK_SIZE) {
  const parts = [];
  let current = '';
  for (const sentence of String(text || '').split(/(?<=[.!?])\s+/)) {
    if ((current + sentence).length > maxLength && current) {
      parts.push(current.trim());
      current = '';
    }
    current += `${sentence} `;
  }
  if (current.trim()) parts.push(current.trim());
  return parts;
}

async function translateChunk(text) {
  const params = new URLSearchParams({
    client: 'gtx',
    sl: 'en',
    tl: 'zh-CN',
    dt: 't',
    q: text
  });
  const response = await fetch(`${TRANSLATE_ENDPOINT}?${params.toString()}`, {
    headers: { 'user-agent': 'Mozilla/5.0' }
  });
  if (!response.ok) throw new Error(`Translate HTTP ${response.status}`);
  const payload = await response.json();
  return (payload?.[0] || []).map((part) => part?.[0] || '').join('');
}

async function translateToChinese(text) {
  const clean = String(text || '').trim();
  if (!clean) return '';
  const translated = [];
  for (const chunk of splitText(clean)) {
    await sleep(TRANSLATE_DELAY_MS);
    translated.push(await translateChunk(chunk));
  }
  return protectAiTermsInChineseTranslation(translated.join(' ').replace(/\s+/g, ' ').trim());
}

function protectAiTermsInChineseTranslation(text) {
  return String(text || '')
    .replace(/学生将了解法学硕士的演变/g, '学生将了解大型语言模型的演变')
    .replace(/开发和部署法学硕士/g, '开发和部署大型语言模型')
    .replace(/由法学硕士支持/g, '由大型语言模型支持');
}

function includesAny(text, keywords) {
  const lower = String(text || '').toLowerCase();
  return keywords.some((keyword) => lower.includes(keyword));
}

function compact(items, limit = 5) {
  return Array.from(new Set(items.map((item) => String(item || '').trim()).filter(Boolean))).slice(0, limit);
}

function slug(value) {
  return normalize(value).replace(/\s+/g, '-').slice(0, 140) || 'course';
}

function parseCredits(value) {
  const match = String(value || '').match(/\b(\d+(?:\.\d+)?)\s*(credits?|units?|cps?)\b/i);
  if (!match) return { credits: null, creditsText: '学分以官网最新资料为准' };
  return {
    credits: Number(match[1]),
    creditsText: `${match[1]} ${match[2].toLowerCase()}`
  };
}

function isDisplayableOfficialCourse(course) {
  const name = String(course.courseName || '').toLowerCase();
  const description = String(course.description || '').toLowerCase();
  if (!description.trim()) return false;
  if (/auditing fee|tuition fee|members of the public|concentration|download syllabus/.test(name)) return false;
  if (/this pillar|focus areas|workflows and tools|tuition fee|cheques should/.test(description)) return false;
  return Boolean(courseCode(course.courseName)) || /this course|capstone project|doctoral thesis|research project/.test(description);
}

function officialCourseTitle(course) {
  const stripped = stripCourseCode(course.courseName);
  if (stripped && !/^[A-Z]{2,8}\d{3,5}[A-Z]?$/i.test(stripped)) return stripped;
  const beforeThisCourse = String(course.description || '').split(/\bThis course\b/i)[0].trim();
  if (beforeThisCourse && beforeThisCourse.length <= 120) return beforeThisCourse.replace(/\s+/g, ' ').trim();
  return stripped || course.courseName;
}

function makePlatformCourse({ platformProgramme, programme, officialCourse }) {
  const code = courseCode(officialCourse.courseName);
  const title = officialCourseTitle(officialCourse);
  const credits = parseCredits(officialCourse.courseName);
  return {
    id: `${platformProgramme.id}-${slug(code || title)}`,
    programmeId: platformProgramme.id,
    programmeTitle: platformProgramme.titleZh || platformProgramme.title || programme.programmeName,
    schoolId: 'lingnan',
    school: '岭南大学',
    faculty: platformProgramme.faculty || programme.school || '岭南大学',
    unitName: platformProgramme.unitName || '',
    unitType: platformProgramme.unitType || '',
    unitLabel: platformProgramme.unitLabel || '',
    parentUnit: platformProgramme.parentUnit || '',
    unitNote: platformProgramme.unitNote || '',
    title,
    titleZh: title,
    type: officialCourse.courseType === 'project' ? '项目 / 论文' : officialCourse.courseType === 'elective' ? '选修课程' : officialCourse.courseType === 'core' ? '核心课程' : '官网课程描述',
    typeKey: officialCourse.courseType === 'project' ? 'project' : officialCourse.courseType === 'elective' ? 'elective' : officialCourse.courseType === 'core' ? 'core' : 'general',
    credits: credits.credits,
    creditsText: credits.creditsText,
    required: officialCourse.courseType === 'core' || officialCourse.courseType === 'foundation' || officialCourse.courseType === 'project',
    description: officialCourse.descriptionZh || officialCourse.description,
    officialDescriptionEn: officialCourse.description,
    officialDescriptionZh: officialCourse.descriptionZh || '',
    descriptionSourceUrl: officialCourse.sourceUrl || programme.officialUrl,
    descriptionSourceType: 'official',
    courseGuide: officialCourse.courseGuide,
    medium: '以项目官方安排为准',
    mediumDetail: '课程描述来自官网公开页面；中文翻译用于浏览，最终以官网英文原文和项目办公室最新资料为准。',
    programmeCodes: [],
    sourceUrl: officialCourse.sourceUrl || programme.officialUrl,
    checkedAt: new Date().toISOString().slice(0, 10),
    semester: '',
    prerequisites: '',
    courseCode: code,
    tags: ['授课型研究生 TPG', platformProgramme.faculty || programme.school || '岭南大学', '官网课程描述'],
    notes: '官网公开课程描述补充；中文翻译用于浏览，最终以官网英文原文为准。'
  };
}

function buildCourseGuide(course, officialDescriptionEn, officialDescriptionZh) {
  const text = `${course.title} ${course.courseCode} ${officialDescriptionEn}`.toLowerCase();
  const isAi = includesAny(text, ['artificial intelligence', 'machine learning', 'deep learning', 'large language', 'agentic', 'computer vision', 'natural language']);
  const isData = includesAny(text, ['data', 'analytics', 'database', 'visualization', 'big data', 'cloud', 'blockchain']);
  const isBusiness = includesAny(text, ['business', 'management', 'marketing', 'project', 'decision', 'ebusiness', 'finance', 'operations']);
  const isProject = includesAny(text, ['project', 'hands-on', 'application', 'case stud', 'practice', 'implement', 'deploy']);
  const isProgramming = includesAny(text, ['python', 'programming', 'algorithm', 'model', 'software', 'system', 'code']);
  const isHealth = includesAny(text, ['health', 'healthcare', 'medical']);
  const isSustainability = includesAny(text, ['sustainable', 'sustainability', 'geospatial', 'sdg']);

  const suitableBackgrounds = compact([
    isAi || isData ? '想把原专业与 AI、数据分析或数字化工具结合的学生' : '',
    isBusiness ? '商科、管理、市场、运营或希望理解业务场景的学生' : '',
    isProgramming ? '有一定数理、编程或愿意补基础的转专业学生' : '',
    isProject ? '希望把课程内容转化成作品集、项目经历或面试案例的应届生' : '',
    isHealth ? '关注医疗、健康管理或公共服务数据应用的学生' : '',
    isSustainability ? '关注可持续发展、城市治理、GIS 或公共议题的学生' : '',
    '希望判断这门课能否服务自己职业转型或能力升级的在职学习者'
  ]);

  const deepenFocus = compact([
    isAi ? '重点理解 AI 方法的基本逻辑、适用边界和业务应用场景' : '',
    isData ? '重点深化数据获取、清洗、建模、分析和结果表达的完整流程' : '',
    isProgramming ? '提前补 Python、基础统计、算法或软件工具操作' : '',
    isBusiness ? '把技术内容放回商业问题、组织决策和行业案例中理解' : '',
    isProject ? '把作业或项目沉淀成可展示的案例：问题定义、方法选择、结果解释和反思' : '',
    '阅读官网课程描述时，优先抓住课程目标、核心方法、应用领域和评估产出'
  ]);

  const skillsGained = compact([
    isAi ? 'AI 概念识别、模型方法理解、应用场景判断' : '',
    isData ? '数据分析思维、数据管理、结果解释和可视化表达' : '',
    isProgramming ? '基础编程、工具使用、模型或系统实现能力' : '',
    isBusiness ? '业务问题拆解、管理决策支持和跨部门沟通能力' : '',
    isProject ? '项目执行、作品集表达和面向真实问题的方案设计能力' : '',
    '把课程知识转化为简历语言、面试案例或职业升级叙事的能力'
  ]);

  const careerConnections = compact([
    isAi || isData ? '可衔接 AI 产品、数据分析、商业分析、数字化运营等方向' : '',
    isBusiness ? '可衔接商业分析、项目管理、市场/运营分析、管理咨询等方向' : '',
    isProgramming ? '可作为转向技术协作、数据岗位或 AI 应用岗位的基础课程' : '',
    isHealth ? '可衔接健康数据、医疗科技、公共健康服务分析等方向' : '',
    isSustainability ? '可衔接智慧城市、可持续发展、GIS/空间数据、公共政策分析等方向' : '',
    '具体岗位匹配仍需结合学生原专业、实习经历、作品集和目标地区招聘要求判断'
  ]);

  const studentPerspectives = [
    {
      profile: '应届生',
      value: isProject || isData || isAi
        ? '这门课的价值不只是“学过”，而是能否产出一个可解释的课程项目、数据分析案例或 AI 应用思路。'
        : '这门课可以帮助你把专业知识整理成更清楚的求职表达。',
      suggestedFocus: '优先把课程作业整理成简历项目，说明问题、方法、工具、结果和个人贡献。'
    },
    {
      profile: '转专业学生',
      value: isProgramming || isData || isAi
        ? '如果基础较弱，不要一开始追求所有技术细节，先补核心概念、常见工具和基础数据/编程能力。'
        : '可以先建立学科语言和问题框架，再逐步补相关方法。',
      suggestedFocus: '课前补关键词、基础概念和入门工具；课中重点记录自己不熟悉的前置知识。'
    },
    {
      profile: '有工作经验或管理背景的学生',
      value: isBusiness || isAi
        ? '重点不一定是转码，而是理解技术如何改变业务流程、组织决策、风险管理和行业判断。'
        : '可以把课程内容和既有行业经验连接，形成职业升级叙事。',
      suggestedFocus: '把课程案例映射到自己熟悉的行业场景，思考管理问题、组织落地和风险边界。'
    }
  ];

  const preparationAdvice = compact([
    isProgramming ? '提前熟悉 Python、Excel/表格处理、基础统计或课程涉及的软件环境。' : '',
    isData ? '准备一两个自己熟悉的数据或业务问题，方便把课堂方法迁移到真实案例。' : '',
    isAi ? '先了解机器学习、生成式 AI、模型评估和 AI 伦理的基本概念。' : '',
    isBusiness ? '复习基本商业分析、市场/运营/管理问题拆解方式。' : '',
    '正式选课前仍需核对官网、课程大纲和项目办公室最新说明。'
  ]);

  return {
    sourceBasis: '基于官网英文课程描述生成的中文学生视角导读；不是学校官方选课建议。',
    suitableBackgrounds,
    deepenFocus,
    skillsGained,
    careerConnections,
    studentPerspectives,
    preparationAdvice,
    informationLimits: [
      '课程指南是基于公开官网课程描述的学生视角整理，不代表学校官方意见。',
      officialDescriptionZh ? '中文内容为机器翻译和规则化导读，关键表述请以官网英文原文为准。' : '当前未生成中文翻译，需以官网英文原文为准。'
    ]
  };
}

function findPlatformProgramme(platformData, programmeName) {
  const target = normalize(programmeName);
  return platformData.programmes.find((programme) =>
    programme.schoolId === 'lingnan' &&
    [programme.title, programme.titleEn, programme.titleZh].some((value) => normalize(value) === target)
  );
}

function buildOfficialCourseIndex(programme) {
  const byCode = new Map();
  const byTitle = new Map();
  for (const course of programme.courseDescriptions || []) {
    if (!String(course.description || '').trim()) continue;
    const code = courseCode(course.courseName);
    const titleKey = normalize(stripCourseCode(course.courseName));
    if (code) byCode.set(code, course);
    if (titleKey) byTitle.set(titleKey, course);
  }
  return { byCode, byTitle };
}

async function main() {
  const programmes = JSON.parse(await fs.readFile(PROGRAMMES_PATH, 'utf8'));
  const platformData = JSON.parse(await fs.readFile(PLATFORM_DATA_PATH, 'utf8'));
  const translatedCache = new Map();
  let matched = 0;
  let addedFrontendCourses = 0;
  let translated = 0;
  let officialDescriptions = 0;
  const touchedProgrammes = new Set();
  const lastUpdatedAt = new Date().toISOString().slice(0, 10);

  for (const programme of programmes) {
    for (const officialCourse of programme.courseDescriptions || []) {
      const officialDescriptionEn = String(officialCourse.description || '').trim();
      if (!officialDescriptionEn) continue;
      officialDescriptions += 1;
      let officialDescriptionZh = officialCourse.descriptionZh || '';
      if (!officialDescriptionZh) {
        if (!translatedCache.has(officialDescriptionEn)) {
          translatedCache.set(officialDescriptionEn, await translateToChinese(officialDescriptionEn));
          translated += 1;
        }
        officialDescriptionZh = translatedCache.get(officialDescriptionEn);
      } else {
        translatedCache.set(officialDescriptionEn, officialDescriptionZh);
      }
      officialCourse.descriptionZh = officialDescriptionZh;
      officialCourse.descriptionSourceType = 'official';
      officialCourse.courseGuide = buildCourseGuide({
        title: stripCourseCode(officialCourse.courseName),
        titleZh: stripCourseCode(officialCourse.courseName),
        courseCode: courseCode(officialCourse.courseName)
      }, officialDescriptionEn, officialDescriptionZh);
    }

    const platformProgramme = findPlatformProgramme(platformData, programme.programmeName);
    if (!platformProgramme) continue;
    const index = buildOfficialCourseIndex(programme);
    if (!index.byCode.size && !index.byTitle.size) continue;

    const platformCourses = platformData.courses.filter((course) => course.programmeId === platformProgramme.id);
    const existingCourseKeys = new Set(platformCourses.flatMap((course) => [
      course.courseCode ? `code:${course.courseCode}` : '',
      normalize(course.title) ? `title:${normalize(course.title)}` : '',
      normalize(course.titleZh) ? `title:${normalize(course.titleZh)}` : ''
    ].filter(Boolean)));

    for (const course of platformCourses) {
      const officialCourse =
        (course.courseCode && index.byCode.get(course.courseCode)) ||
        index.byTitle.get(normalize(course.title)) ||
        index.byTitle.get(normalize(course.titleZh));
      if (!officialCourse) continue;

      const officialDescriptionEn = String(officialCourse.description || '').trim();
      if (!officialDescriptionEn) continue;
      course.programmeTitle = platformProgramme.titleZh || course.programmeTitle || platformProgramme.title || programme.programmeName;
      let officialDescriptionZh = officialCourse.descriptionZh || (course.officialDescriptionEn === officialDescriptionEn ? course.officialDescriptionZh || '' : '');
      if (!officialDescriptionZh) {
        if (!translatedCache.has(officialDescriptionEn)) {
          translatedCache.set(officialDescriptionEn, await translateToChinese(officialDescriptionEn));
          translated += 1;
        }
        officialDescriptionZh = translatedCache.get(officialDescriptionEn);
      }

      course.officialDescriptionEn = officialDescriptionEn;
      course.officialDescriptionZh = officialDescriptionZh;
      course.description = officialDescriptionZh || officialDescriptionEn;
      course.descriptionSourceUrl = officialCourse.sourceUrl || programme.officialUrl;
      course.descriptionSourceType = 'official';
      course.sourceUrl = officialCourse.sourceUrl || course.sourceUrl || programme.officialUrl;
      course.checkedAt = lastUpdatedAt;
      const guideNote = '已补充官网课程描述中文翻译和学生视角课程指南；中文翻译用于浏览，最终以官网英文原文为准。';
      course.notes = String(course.notes || '').includes(guideNote)
        ? course.notes
        : [course.notes, guideNote].filter(Boolean).join(' ');
      course.courseGuide = officialCourse.courseGuide || buildCourseGuide(course, officialDescriptionEn, officialDescriptionZh);

      officialCourse.descriptionZh = officialDescriptionZh;
      officialCourse.courseGuide = course.courseGuide;
      officialCourse.descriptionSourceType = 'official';

      matched += 1;
      touchedProgrammes.add(programme.programmeName);
    }

    for (const officialCourse of programme.courseDescriptions || []) {
      if (!isDisplayableOfficialCourse(officialCourse)) continue;
      const officialCode = courseCode(officialCourse.courseName);
      const officialTitle = officialCourseTitle(officialCourse);
      const keys = [
        officialCode ? `code:${officialCode}` : '',
        normalize(officialTitle) ? `title:${normalize(officialTitle)}` : ''
      ].filter(Boolean);
      if (keys.some((key) => existingCourseKeys.has(key))) continue;

      const generatedCourse = makePlatformCourse({ platformProgramme, programme, officialCourse });
      let id = generatedCourse.id;
      let suffix = 2;
      while (platformData.courses.some((course) => course.id === id)) {
        id = `${generatedCourse.id}-${suffix}`;
        suffix += 1;
      }
      generatedCourse.id = id;
      platformData.courses.push(generatedCourse);
      platformCourses.push(generatedCourse);
      keys.forEach((key) => existingCourseKeys.add(key));
      addedFrontendCourses += 1;
      matched += 1;
      touchedProgrammes.add(programme.programmeName);
    }
  }

  await fs.writeFile(PROGRAMMES_PATH, `${JSON.stringify(programmes, null, 2)}\n`);
  await fs.writeFile(PLATFORM_DATA_PATH, `${JSON.stringify(platformData, null, 2)}\n`);
  console.log(JSON.stringify({
    matchedCourses: matched,
    addedFrontendCourses,
    officialCourseDescriptions: officialDescriptions,
    translatedDescriptions: translated,
    touchedProgrammes: touchedProgrammes.size,
    programmes: Array.from(touchedProgrammes).sort()
  }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
