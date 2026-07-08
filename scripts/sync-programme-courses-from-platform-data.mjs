import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';

const PROGRAMMES_PATH = new URL('../src/data/programmes.json', import.meta.url);
const OPTIONS_PATH = new URL('../src/data/programmeOptions.json', import.meta.url);
const PLATFORM_DATA_PATH = new URL('../src/data/platformData.json', import.meta.url);

const COURSE_NAME_ONLY_LIMIT =
  '课程知识库已收录该项目的课程名称、中文参考名、课程类型、授课语言和来源；若官网未公开详细课程描述，推荐助手会按课程名称保守分析。';

const COMMON_TRANSLATIONS = [
  ['Artificial Intelligence', '人工智能'],
  ['Chinese Mainland', '中国内地'],
  ['Regulatory Environment', '监管环境'],
  ['Critical Thinking', '批判性思维'],
  ['Computer Graphics', '计算机图形学'],
  ['Motion Graphics', '动态图形'],
  ['Virtual Reality', '虚拟现实'],
  ['Experimental Animation', '实验动画'],
  ['Interactive Art', '互动艺术'],
  ['Virtual Studio Production', '虚拟演播室制作'],
  ['Field Trip', '实地考察'],
  ['Field Experience', '实地经验'],
  ['Overseas Experiential Learning', '海外体验式学习'],
  ['Cognitive Learning Theories', '认知学习理论'],
  ['Organizational Dynamics', '组织动力学'],
  ['Group Work', '小组工作'],
  ['Computer Vision', '计算机视觉'],
  ['Cloud Computing', '云计算'],
  ['Blockchain', '区块链'],
  ['Fixed Income Securities', '固定收益证券'],
  ['Derivative Securities', '衍生证券'],
  ['Financial Econometrics', '金融计量经济学'],
  ['Personal Growth', '个人成长'],
  ['Applied Survey Methodology', '应用调查方法'],
  ['Non-Profit Organisations', '非营利组织'],
  ['Voluntary Sector', '志愿部门'],
  ['Platform Regulation', '平台监管'],
  ['Human Resource Information System', '人力资源信息系统'],
  ['Practical Phonetics', '实用语音学'],
  ['American Literature', '美国文学'],
  ['The Graphic Novel', '图像小说'],
  ['Historian’s Craft', '历史学家的技艺'],
  ["Historian's Craft", '历史学家的技艺'],
  ['Psycholinguistics', '心理语言学'],
  ['Lifewriting', '生命写作'],
  ['Korean Cinema', '韩国电影'],
  ['Independent Cinema', '独立电影'],
  ['Understanding Museums', '理解博物馆'],
  ['Ancient Civilisations', '古代文明'],
  ['Cities Across Civilisations', '跨文明城市'],
  ['Translating Cultures', '文化翻译'],
  ['Liaison Interpreting', '联络口译'],
  ['Translating Travel Literature', '旅行文学翻译'],
  ['AI-Assisted Interpreting', '人工智能辅助口译'],
  ['Automobile Construction', '汽车构造'],
  ['Credit Point', '学分点'],
  ['Generative AI', '生成式人工智能'],
  ['Machine Learning', '机器学习'],
  ['Deep Learning', '深度学习'],
  ['Data Science', '数据科学'],
  ['Data Analytics', '数据分析'],
  ['Business Analytics', '商业分析'],
  ['Digital Economy', '数字经济'],
  ['Public Policy', '公共政策'],
  ['Policy Studies', '政策研究'],
  ['Policy Analysis', '政策分析'],
  ['Governance', '治理'],
  ['Management', '管理'],
  ['Leadership', '领导力'],
  ['Education', '教育'],
  ['Higher Education', '高等教育'],
  ['Early Childhood', '幼儿教育'],
  ['Special Education', '特殊教育'],
  ['Social Sciences', '社会科学'],
  ['Social Policy', '社会政策'],
  ['Psychology', '心理学'],
  ['Counselling', '辅导'],
  ['Research Methods', '研究方法'],
  ['Research Methodology', '研究方法论'],
  ['Capstone Project', '毕业项目'],
  ['Final Project', '最终项目'],
  ['Project', '项目'],
  ['Thesis', '论文'],
  ['Dissertation', '论文'],
  ['Workshop', '工作坊'],
  ['Internship', '实习'],
  ['Seminar', '研讨课'],
  ['Special Topics', '专题'],
  ['Contemporary Issues', '当代议题'],
  ['Critical Issues', '关键议题'],
  ['Professional Writing', '专业写作'],
  ['Strategic Communication', '战略传播'],
  ['Public Communications', '公共传播'],
  ['Cultural Policy', '文化政策'],
  ['Cultural Studies', '文化研究'],
  ['Chinese Studies', '中国研究'],
  ['Translation', '翻译'],
  ['Film', '电影'],
  ['Visual Arts', '视觉艺术'],
  ['Media', '媒体'],
  ['Finance', '金融'],
  ['Accounting', '会计'],
  ['Marketing', '市场营销'],
  ['Economics', '经济学'],
  ['Entrepreneurship', '创业'],
  ['Innovation', '创新'],
  ['Sustainability', '可持续发展'],
  ['Environmental', '环境'],
  ['Health', '健康'],
  ['Ageing', '老龄化'],
  ['Gerontology', '老年学'],
  ['Housing', '住房'],
  ['Smart Manufacturing', '智能制造'],
  ['Robotics', '机器人'],
  ['Automation', '自动化'],
  ['Technology', '技术'],
  ['Engineering', '工程'],
  ['Mathematics', '数学'],
  ['Statistics', '统计学'],
  ['Language', '语言'],
  ['English', '英语'],
  ['Chinese', '中文'],
  ['History', '历史'],
  ['Philosophy', '哲学'],
  ['Ethics', '伦理'],
  ['Law', '法律'],
  ['Security', '安全'],
  ['Privacy', '隐私'],
  ['Risk', '风险'],
  ['Healthcare', '医疗健康'],
  ['Science', '科学'],
  ['Medicine', '医学'],
  ['Logic', '逻辑'],
  ['Communication', '传播'],
  ['Development', '发展'],
  ['Comparative', '比较'],
  ['International', '国际'],
  ['Regional', '区域'],
  ['China', '中国'],
  ['Asia Pacific', '亚太'],
  ['Global', '全球'],
  ['Practice', '实践'],
  ['Applications', '应用'],
  ['Principles', '原理'],
  ['Introduction', '导论'],
  ['Foundation', '基础'],
  ['Advanced', '高级'],
  ['Methods', '方法'],
  ['Theory', '理论'],
  ['Analysis', '分析'],
  ['Design', '设计'],
  ['Systems', '系统'],
  ['Modelling', '建模'],
  ['Models', '模型'],
  ['Topics', '专题'],
  ['Issues', '议题'],
  ['Studies', '研究'],
  ['Course', '课程']
];

const WORD_TRANSLATIONS = new Map(Object.entries({
  and: '与',
  in: '中的',
  of: '的',
  for: '面向',
  to: '至',
  with: '与',
  from: '来自',
  the: '',
  a: '',
  an: '',
  i: 'I',
  ii: 'II',
  iii: 'III',
  iv: 'IV',
  v: 'V',
  vi: 'VI',
  ai: '人工智能',
  digital: '数字',
  business: '商业',
  administration: '行政管理',
  policy: '政策',
  accounting: '会计',
  regulatory: '监管',
  mainland: '内地',
  critical: '批判性',
  thinking: '思维',
  argumentation: '论证',
  computer: '计算机',
  graphics: '图形学',
  motion: '动态',
  virtual: '虚拟',
  reality: '现实',
  animation: '动画',
  experimental: '实验',
  interactive: '互动',
  art: '艺术',
  studio: '演播室',
  production: '制作',
  field: '实地',
  trip: '考察',
  experience: '经验',
  overseas: '海外',
  experiential: '体验式',
  learning: '学习',
  cognitive: '认知',
  theories: '理论',
  school: '学校',
  based: '本位',
  teacher: '教师',
  organizational: '组织',
  dynamics: '动力学',
  visualising: '视觉化',
  culture: '文化',
  group: '小组',
  work: '工作',
  practicum: '实习',
  sociolinguistics: '社会语言学',
  composition: '写作',
  pedagogy: '教学法',
  comprehensive: '综合',
  practical: '实践',
  planning: '规划',
  certification: '认证',
  examination: '考试',
  award: '奖励',
  summer: '夏季',
  exchange: '交流',
  programme: '项目',
  scholarship: '奖学金',
  pedagogical: '教学',
  grammar: '语法',
  year: '年级',
  supported: '支持',
  collaborative: '协作',
  approach: '方法',
  auditing: '审计',
  optional: '选修',
  sessions: '课程环节',
  esg: 'ESG',
  investing: '投资',
  fixed: '固定',
  income: '收益',
  securities: '证券',
  derivative: '衍生',
  resource: '资源',
  information: '信息',
  managing: '管理',
  ethically: '伦理地',
  econometrics: '计量经济学',
  psychopathology: '精神病理学',
  personal: '个人',
  growth: '成长',
  applied: '应用',
  survey: '调查',
  methodology: '方法论',
  nonprofit: '非营利',
  organisations: '组织',
  voluntary: '志愿',
  sector: '部门',
  frameworks: '框架',
  application: '应用',
  blockchain: '区块链',
  cloud: '云',
  computing: '计算',
  vision: '视觉',
  governance: '治理',
  research: '研究',
  methods: '方法',
  method: '方法',
  professional: '专业',
  writing: '写作',
  guided: '指导式',
  study: '学习',
  dissemination: '传播',
  strategic: '战略',
  communication: '传播',
  dialogue: '对话',
  practitioners: '实践者',
  seminar: '研讨',
  social: '社会',
  change: '变迁',
  media: '媒体',
  public: '公共',
  comparative: '比较',
  development: '发展',
  cultural: '文化',
  heritage: '遗产',
  management: '管理',
  practice: '实践',
  politics: '政治',
  international: '国际',
  health: '健康',
  systems: '系统',
  principles: '原理',
  analytics: '分析',
  housing: '住房',
  contemporary: '当代',
  ageing: '老龄化',
  society: '社会',
  education: '教育',
  institutional: '机构',
  strategy: '战略',
  finance: '金融',
  higher: '高等',
  generative: '生成式',
  applications: '应用',
  challenges: '挑战',
  data: '数据',
  modelling: '建模',
  statistical: '统计',
  environment: '环境',
  entrepreneurial: '创业',
  leadership: '领导力',
  startups: '初创组织',
  innovation: '创新',
  perspectives: '视角',
  frontiers: '前沿',
  smart: '智能',
  manufacturing: '制造',
  industry: '产业',
  advanced: '高级',
  materials: '材料',
  technology: '技术',
  additive: '增材',
  robotics: '机器人',
  industrial: '工业',
  automation: '自动化',
  engineering: '工程',
  optimization: '优化',
  modern: '现代',
  product: '产品',
  design: '设计',
  green: '绿色',
  energy: '能源',
  storage: '储存',
  carbon: '碳',
  neutrality: '中和',
  environmental: '环境',
  sustainable: '可持续',
  special: '专题',
  doctoral: '博士',
  thesis: '论文',
  science: '科学',
  medicine: '医学',
  ethics: '伦理',
  logic: '逻辑',
  automated: '自动化',
  reasoning: '推理',
  risk: '风险',
  regulatory: '监管',
  issues: '议题',
  futures: '未来',
  internship: '实习',
  dissertation: '论文',
  curatorial: '策展',
  globalisation: '全球化',
  changing: '变化中的',
  economics: '经济学',
  accounting: '会计',
  marketing: '市场营销',
  psychology: '心理学',
  counselling: '辅导',
  language: '语言',
  english: '英语',
  chinese: '中文',
  translation: '翻译',
  film: '电影',
  visual: '视觉',
  arts: '艺术',
  history: '历史',
  philosophy: '哲学',
  law: '法律',
  security: '安全',
  privacy: '隐私'
}));

function hasCjk(value) {
  return /[\u3400-\u9fff]/.test(String(value || ''));
}

function normalise(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

function unique(values) {
  return Array.from(new Set(values.map((value) => String(value || '').trim()).filter(Boolean)));
}

function hash(value) {
  return createHash('sha256').update(String(value || '')).digest('hex');
}

function translatePart(part) {
  let value = String(part || '').trim();
  if (!value) return '';
  for (const [english, chinese] of COMMON_TRANSLATIONS) {
    value = value.replace(new RegExp(english.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), chinese);
  }
  return value
    .split(/\s+/)
    .map((word) => {
      if (hasCjk(word)) return word;
      const clean = word.replace(/^[^a-z0-9]+|[^a-z0-9]+$/gi, '');
      const prefix = word.slice(0, word.indexOf(clean) >= 0 ? word.indexOf(clean) : 0);
      const suffix = clean ? word.slice(prefix.length + clean.length) : '';
      const translated = WORD_TRANSLATIONS.get(clean.toLowerCase());
      return translated === undefined ? word : `${prefix}${translated}${suffix}`;
    })
    .filter(Boolean)
    .join('')
    .replace(/\s+/g, ' ')
    .trim();
}

function translateEnglishTitle(title) {
  const text = String(title || '').trim();
  if (!text) return '';
  if (/^\d+\s+courses?$/i.test(text)) return `${text.replace(/\D/g, '')} 门课程`;
  if (/^\d+\s+credits?$/i.test(text)) return `${text.replace(/\D/g, '')} 学分`;
  if (/^type$/i.test(text)) return '类型';
  if (/^credits?$/i.test(text)) return '学分';
  if (/^full-time$/i.test(text)) return '全日制';
  if (/^part-time$/i.test(text)) return '兼读制';
  if (/^\d+$/.test(text)) return `课程项 ${text}`;
  if (/^(ms|mr|dr|prof)\b/i.test(text)) return `教师：${text}`;
  if (/^[A-Z]{2,}\d{3,}$/i.test(text)) return `课程代码 ${text}`;
  const translated = text
    .split(/(\/|:|;|\(|\)|,|\bor\b|\band\b)/i)
    .map((part) => {
      if (/^(\/|:|;|,|\(|\))$/.test(part)) return part;
      if (/^or$/i.test(part.trim())) return '或';
      if (/^and$/i.test(part.trim())) return '与';
      return translatePart(part);
    })
    .join('')
    .replace(/\s+([:;,/)])/g, '$1')
    .replace(/([(])\s+/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
  return hasCjk(translated) ? translated : `课程参考：${text}`;
}

function getChineseCourseName(course) {
  if (hasCjk(course.titleZh)) return String(course.titleZh).trim();
  if (hasCjk(course.title)) return String(course.title).trim();
  return translateEnglishTitle(course.title);
}

function getOfficialCourseName(course) {
  const title = String(course.title || '').trim();
  if (title) return title;
  return String(course.titleZh || '').trim();
}

function courseTypeFromPlatformCourse(course) {
  const typeKey = String(course.typeKey || '').toLowerCase();
  const type = String(course.type || '');
  if (typeKey === 'core' || /必修|核心|core/i.test(type)) return 'core';
  if (typeKey === 'elective' || /選修|选修|elective/i.test(type)) return 'elective';
  if (typeKey === 'project' || /项目|研究|project|thesis|dissertation/i.test(type)) return 'project';
  if (/foundation|基础/i.test(type)) return 'foundation';
  return 'unknown';
}

function getDegreeLevel(programme) {
  const text = [programme.titleEn, programme.title, programme.studyModes?.join(' ')].join(' ');
  if (/doctor|doctoral|博士/i.test(text)) return 'Doctor';
  if (/bachelor|undergraduate|本科/i.test(text)) return 'Bachelor';
  if (/postgraduate diploma|pgd|研究生文凭/i.test(text)) return 'Postgraduate Diploma';
  if (/certificate|证书/i.test(text)) return 'Certificate';
  if (/master|msc|ma |med|mpp|硕士/i.test(text)) return 'Master';
  return 'Other';
}

function programmeNameZh(programme) {
  if (hasCjk(programme.title)) return programme.title;
  if (hasCjk(programme.titleZh)) return programme.titleZh;
  return '';
}

function programmeNameEn(programme) {
  return programme.titleEn || programme.title || programme.titleZh || programme.id;
}

function buildCourseDescription(course) {
  const courseName = getOfficialCourseName(course);
  const courseNameZh = getChineseCourseName(course);
  const facts = unique([
    courseNameZh && courseNameZh !== courseName ? `中文参考名：${courseNameZh}` : '',
    course.description ? `课程简介：${course.description}` : '',
    course.selectionAdvice ? `选课建议：${course.selectionAdvice}` : '',
    course.medium ? `授课语言：${course.medium}` : '',
    course.type ? `课程类别：${course.type}` : '',
    course.creditsText ? `学分：${course.creditsText}` : '',
    course.prerequisites ? `先修要求：${course.prerequisites}` : '',
    course.semester ? `开课学期：${course.semester}` : '',
    course.tags?.length ? `标签：${course.tags.join('、')}` : ''
  ]);
  return {
    courseName,
    courseNameZh,
    description: facts.join('。'),
    courseType: courseTypeFromPlatformCourse(course),
    sourceUrl: course.sourceUrl || ''
  };
}

function pickImportantCourses(courses) {
  const score = { core: 0, foundation: 1, project: 2, elective: 3, unknown: 4 };
  return courses
    .slice()
    .sort((a, b) => (score[a.courseType] ?? 9) - (score[b.courseType] ?? 9) || a.courseName.localeCompare(b.courseName))
    .slice(0, 12);
}

function buildImportantCourse(course) {
  return {
    courseName: course.courseName,
    courseNameZh: course.courseNameZh,
    courseType: course.courseType,
    importance: course.courseType === 'core' || course.courseType === 'foundation' ? 'high' : course.courseType === 'project' ? 'medium' : 'medium',
    whyImportant:
      course.description || '课程知识库已收录该课程名称、中文参考名、课程类型和来源；推荐助手应结合学生背景保守解释其相关性。',
    relatedStudentBackgrounds: [],
    relatedCareerGoals: [],
    recommendedPreparations: [
      '查看最新官方项目页面和课程大纲。',
      '对照课程中文参考名、课程类别和自身本科/硕士课程背景，提前补足相关基础。'
    ],
    sourceUrl: course.sourceUrl
  };
}

function buildKeywords(programme, courses, existing = {}) {
  return unique([
    ...(existing.keywords || []),
    programme.title,
    programme.titleEn,
    programme.faculty,
    programme.unitName,
    programme.medium,
    ...(programme.programmeCodes || []),
    ...courses.flatMap((course) => [course.courseName, course.courseNameZh, course.courseType])
  ]).slice(0, 80);
}

function mergeProgramme(platformProgramme, platformCourses, existing) {
  const courses = platformCourses.map(buildCourseDescription).filter((course) => course.courseName);
  const nameEn = programmeNameEn(platformProgramme);
  const nameZh = programmeNameZh(platformProgramme);
  const sourceUrls = unique([
    platformProgramme.sourceUrl,
    ...(existing?.sourceUrls || []),
    ...platformCourses.map((course) => course.sourceUrl)
  ]);
  const department = unique([platformProgramme.parentUnit, platformProgramme.faculty, platformProgramme.unitName]).join(' · ');
  const summaryParts = unique([
    nameZh && nameZh !== nameEn ? `${nameZh} / ${nameEn}` : nameEn,
    platformProgramme.school,
    department,
    platformProgramme.medium,
    platformProgramme.statusNote,
    platformProgramme.requirements?.note
  ]);
  return {
    id: platformProgramme.id,
    programmeName: nameEn,
    programmeNameZh: nameZh,
    degreeLevel: getDegreeLevel(platformProgramme),
    school: platformProgramme.school,
    schoolId: platformProgramme.schoolId,
    department,
    officialUrl: platformProgramme.sourceUrl || existing?.officialUrl || '',
    summary: existing?.summary || summaryParts.join('。'),
    keywords: buildKeywords(platformProgramme, courses, existing),
    suitableBackgrounds: existing?.suitableBackgrounds?.length
      ? existing.suitableBackgrounds
      : unique([
          platformProgramme.medium,
          platformProgramme.faculty,
          platformProgramme.unitName,
          platformProgramme.statusNote,
          platformProgramme.requirements?.note
        ]),
    learningObjectives: existing?.learningObjectives?.length
      ? existing.learningObjectives
      : unique([
          `课程库收录 ${courses.length} 门课程，含中文参考名、课程类别、授课语言和来源。`,
          platformProgramme.requirements?.note,
          platformProgramme.statusNote
        ]),
    coreCourses: courses.map((course) => course.courseName),
    courseDescriptions: courses,
    importantCourses: pickImportantCourses(courses).map(buildImportantCourse),
    skillsDeveloped: existing?.skillsDeveloped?.length ? existing.skillsDeveloped : unique(courses.flatMap((course) => [course.courseNameZh, course.courseType])).slice(0, 30),
    careerDirections: existing?.careerDirections?.length ? existing.careerDirections : unique([platformProgramme.faculty, platformProgramme.unitName, platformProgramme.title, platformProgramme.titleEn]),
    admissionNotes: existing?.admissionNotes || platformProgramme.mediumDetail || '',
    informationInsufficient: courses.some((course) => !course.description),
    informationLimits: unique([COURSE_NAME_ONLY_LIMIT, ...(existing?.informationLimits || [])]),
    sourceText: existing?.sourceText || summaryParts.join('\n'),
    sourceUrls,
    sourceHash: hash(JSON.stringify({ platformProgramme, courseCount: courses.length })),
    sourceUpdatedAt: platformProgramme.checkedAt || existing?.sourceUpdatedAt || '',
    lastUpdatedAt: new Date().toISOString()
  };
}

const existingProgrammes = JSON.parse(await fs.readFile(PROGRAMMES_PATH, 'utf8')).filter(Boolean);
const platformData = JSON.parse(await fs.readFile(PLATFORM_DATA_PATH, 'utf8'));
const existingByName = new Map(existingProgrammes.map((programme) => [normalise(programme.programmeName), programme]));
const existingByUrl = new Map(existingProgrammes.filter((programme) => programme.officialUrl).map((programme) => [programme.officialUrl, programme]));
const coursesByProgramme = new Map();

for (const course of platformData.courses) {
  if (!coursesByProgramme.has(course.programmeId)) coursesByProgramme.set(course.programmeId, []);
  coursesByProgramme.get(course.programmeId).push(course);
}

const programmes = platformData.programmes.map((platformProgramme) => {
  const existing =
    existingByName.get(normalise(programmeNameEn(platformProgramme))) ||
    existingByName.get(normalise(platformProgramme.title)) ||
    existingByUrl.get(platformProgramme.sourceUrl);
  return mergeProgramme(platformProgramme, coursesByProgramme.get(platformProgramme.id) || [], existing);
});

const options = programmes
  .map(({ id, programmeName, programmeNameZh, degreeLevel, school, schoolId }) => ({ id, programmeName, programmeNameZh, degreeLevel, school, schoolId }))
  .sort((a, b) => a.school.localeCompare(b.school) || a.degreeLevel.localeCompare(b.degreeLevel) || a.programmeName.localeCompare(b.programmeName));

await fs.writeFile(PROGRAMMES_PATH, `${JSON.stringify(programmes, null, 2)}\n`);
await fs.writeFile(OPTIONS_PATH, `${JSON.stringify(options, null, 2)}\n`);

const totalCourses = programmes.reduce((sum, programme) => sum + programme.courseDescriptions.length, 0);
const withChinese = programmes.reduce(
  (sum, programme) => sum + programme.courseDescriptions.filter((course) => hasCjk(course.courseNameZh)).length,
  0
);

console.log(JSON.stringify({
  programmes: programmes.length,
  courses: totalCourses,
  coursesWithChineseReferenceName: withChinese,
  options: options.length
}, null, 2));
