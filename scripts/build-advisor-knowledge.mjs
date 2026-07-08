import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');
const platformDataPath = join(rootDir, 'src', 'data', 'platformData.json');
const programmesJsonPath = join(rootDir, 'src', 'data', 'programmes.json');
const outputPath = join(rootDir, 'src', 'data', 'advisorKnowledge.json');
const reviewPath = join(rootDir, 'docs', 'advisor-knowledge-review.md');

const levelRank = { low: 1, medium: 2, high: 3 };

function normalize(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9\u4e00-\u9fff+#./]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function slugProgrammeName(value) {
  return normalize(value)
    .replace(/\bmaster of\b/g, 'master')
    .replace(/\bdoctor of\b/g, 'doctor')
    .replace(/\bexecutive master of\b/g, 'executive master')
    .replace(/\bprogramme\b/g, '')
    .replace(/\s+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function readJsonIfExists(path) {
  try {
    return JSON.parse(await readFile(path, 'utf8'));
  } catch {
    return null;
  }
}

function unique(values, max = 12) {
  return Array.from(new Set(values.map((item) => String(item || '').trim()).filter(Boolean))).slice(0, max);
}

function compactText(value, max = 900) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
}

function includesAny(text, patterns) {
  return patterns.some((pattern) => pattern.test(text));
}

function maxLevel(levels) {
  return levels.sort((a, b) => levelRank[b] - levelRank[a])[0] || 'low';
}

function classifyDomains(text) {
  const domains = [];
  const normalized = normalize(text);
  const checks = [
    ['data_ai', [/数据|data|analytics|analysis|statistics|统计|regression|回归|classification|分类|clustering|聚类|machine learning|机器学习|artificial intelligence|人工智能|算法|algorithm|model|模型|python|programming|编程|coding|r语言|shiny|database|visuali[sz]ation|可视化/]],
    ['computing_systems', [/software|软件|web|系统|system|database|网络|network|cyber|information technology|资讯科技|computer|计算机|coding|programming|编程|automation|自动化/]],
    ['robotics_spatial', [/robot|机器人|spatial|空间|gis|navigation|导航|ar|vr|virtual reality|augmented reality|感知|perception|sensor|传感|control|控制/]],
    ['policy_governance', [/policy|政策|governance|治理|regulation|监管|law|法律|legal|合规|compliance|privacy|隐私|security|安全|risk|风险|ethic|伦理|公共|public/]],
    ['education_learning', [/education|教育|teaching|教学|learning|学习|school|学校|curriculum|课程|pedagog|教师|teacher|student|学生|assessment|评估/]],
    ['business_management', [/business|商业|management|管理|marketing|市场|finance|金融|accounting|会计|economics|经济|entrepreneur|创业|operation|运营|strategy|战略|leadership|领导/]],
    ['media_communication', [/media|媒体|communication|传播|journalism|新闻|content|内容|digital marketing|社交媒体|social media|translation|翻译|language|语言|writing|写作/]],
    ['health_social_service', [/health|医疗|健康|public health|护理|nursing|therapy|治疗|social service|社会服务|ageing|老龄|gerontology|心理|psychology|wellbeing|福祉/]],
    ['arts_culture_humanities', [/art|艺术|culture|文化|history|历史|philosophy|哲学|humanities|人文|creative|创意|music|音乐|visual|视觉|literature|文学/]],
    ['environment_sustainability', [/environment|环境|sustainability|可持续|esg|climate|气候|ecology|生态|urban|城市|housing|房屋|planning|规划|governance|治理/]],
    ['research_methods', [/research|研究|method|方法|thesis|论文|dissertation|capstone|project|项目|seminar|专题|fieldwork|田野|case stud|案例/]]
  ];
  for (const [domain, patterns] of checks) {
    if (includesAny(normalized, patterns)) domains.push(domain);
  }
  return unique(domains, 8);
}

function classifyIntensity(text, domains) {
  const normalized = normalize(text);
  const technical = includesAny(normalized, [/machine learning|机器学习|artificial intelligence|人工智能|algorithm|算法|programming|编程|python|r语言|software|软件|robot|机器人|gis|spatial|空间|database|cyber|网络安全|data science|数据科学|analytics|数据分析|model|模型|regression|回归|classification|分类|clustering|聚类/])
    ? 'high'
    : includesAny(normalized, [/digital|数字|technology|技术|quantitative|量化|statistics|统计|research method|研究方法|risk|风险|finance|金融|assessment|评估|data|数据/])
      ? 'medium'
      : 'low';
  const math = includesAny(normalized, [/statistics|统计|mathematics|数学|linear|线性|regression|回归|econometrics|计量|quantitative|量化|risk model|风险模型|actuarial|精算|probability|概率|calculus|微积分|algorithm|算法|clustering|聚类|classification|分类/])
    ? 'high'
    : includesAny(normalized, [/data|数据|analytics|分析|research method|研究方法|finance|金融|economics|经济|assessment|评估|evaluation|评价|survey|问卷/])
      ? 'medium'
      : 'low';
  const programming = includesAny(normalized, [/programming|编程|python|r语言|r\/|shiny|software|软件|web|coding|代码|database|system development|应用开发|app development|开发/])
    ? 'high'
    : includesAny(normalized, [/artificial intelligence|人工智能|machine learning|机器学习|data science|数据科学|robot|机器人|gis|spatial|空间|automation|自动化|digital|数字/])
      ? 'medium'
      : 'low';
  const reading = includesAny(normalized, [/law|法律|policy|政策|philosophy|哲学|history|历史|theory|理论|ethic|伦理|governance|治理|literature|文学|culture|文化|communication|传播/])
    ? 'high'
    : includesAny(normalized, [/case|案例|seminar|专题|research|研究|management|管理|education|教育/])
      ? 'medium'
      : 'low';
  const practice = includesAny(normalized, [/project|项目|capstone|workshop|工作坊|field|实地|practicum|实习|laboratory|实验|studio|工作室|case|案例|application|应用|design|设计/])
    ? 'high'
    : includesAny(normalized, [/analysis|分析|assessment|评估|report|报告|presentation|展示|planning|规划/])
      ? 'medium'
      : 'low';
  return { technical, math, programming, reading, practice };
}

function domainAudience(domains) {
  const suitable = [];
  const lessSuitable = [];
  const careers = [];
  const focus = [];
  const risks = [];
  const profiles = {
    data_ai: {
      suitable: ['想走数据分析、AI 产品、技术产品、研究助理或业务分析方向的学生'],
      lessSuitable: ['没有数学、统计或编程准备，只想轻松开阔视野的学生'],
      careers: ['数据分析', 'BI / 运营分析', 'AI 产品', '研究助理', '业务分析'],
      focus: ['统计概念', '数据处理', '模型解释', '结果可视化'],
      risks: ['需要预留时间补数学、统计或编程基础']
    },
    computing_systems: {
      suitable: ['愿意接触系统、工具、工程或平台应用的学生'],
      lessSuitable: ['完全排斥技术工具和系统概念的学生'],
      careers: ['技术产品', '教育科技', '数字化项目', '系统/平台运营'],
      focus: ['系统逻辑', '工具链', '应用场景', '技术边界']
    },
    robotics_spatial: {
      suitable: ['对机器人、空间智能、AR/VR、GIS 或智能硬件场景感兴趣的学生'],
      lessSuitable: ['完全不想接触空间、硬件或技术应用概念的学生'],
      careers: ['机器人教育', '空间智能项目', '智能硬件产品', 'AR/VR 应用'],
      focus: ['空间感知', '场景设计', '硬件/软件协作', '应用落地']
    },
    policy_governance: {
      suitable: ['法律、政策、传媒、教育管理、公共服务或企业治理背景的学生'],
      careers: ['政策研究', '合规治理', '公共事务', '风险管理', '行业研究'],
      focus: ['政策框架', '风险识别', '案例分析', '治理边界']
    },
    education_learning: {
      suitable: ['教师、教育管理者、培训从业者、教育科技或公共服务背景的学生'],
      careers: ['教育科技', '课程设计', '学习分析', '学校管理', '培训产品'],
      focus: ['学习场景', '教学设计', '评估指标', '学生支持']
    },
    business_management: {
      suitable: ['商科、管理、运营、市场、金融或创业背景的学生'],
      careers: ['管理咨询', '市场/运营', '金融业务', '商业分析', '项目管理'],
      focus: ['商业问题定义', '指标设计', '组织落地', '案例复盘']
    },
    media_communication: {
      suitable: ['媒体、传播、内容、翻译、品牌或公共表达背景的学生'],
      careers: ['内容策略', '品牌传播', '用户研究', '新媒体运营', '翻译/本地化'],
      focus: ['受众理解', '叙事表达', '内容生产', '跨文化沟通']
    },
    health_social_service: {
      suitable: ['医疗健康、社会服务、心理、护理、老龄化或公共服务背景的学生'],
      careers: ['健康管理', '社会服务管理', '公共健康', '机构运营', '服务评估'],
      focus: ['服务对象', '伦理风险', '数据解释', '跨专业协作']
    },
    arts_culture_humanities: {
      suitable: ['艺术、文化、人文、创意产业或公共传播背景的学生'],
      careers: ['文化项目', '创意策划', '艺术教育', '研究与策展', '公共传播'],
      focus: ['文本/作品分析', '文化语境', '创意表达', '批判性思考']
    },
    environment_sustainability: {
      suitable: ['城市治理、环境、ESG、规划、公共政策或企业可持续方向的学生'],
      careers: ['ESG 咨询', '城市治理', '环境规划', '公共政策', '可持续项目'],
      focus: ['城市/环境议题', '利益相关者', '指标体系', '政策与实践连接']
    },
    research_methods: {
      suitable: ['需要做论文、研究报告、项目评估或继续深造的学生'],
      careers: ['研究助理', '政策研究', '咨询分析', '项目评估'],
      focus: ['研究设计', '证据收集', '方法选择', '报告写作']
    }
  };

  for (const domain of domains) {
    const item = profiles[domain];
    if (!item) continue;
    suitable.push(...(item.suitable || []));
    lessSuitable.push(...(item.lessSuitable || []));
    careers.push(...(item.careers || []));
    focus.push(...(item.focus || []));
    risks.push(...(item.risks || []));
  }

  return {
    suitableFor: unique(suitable.length ? suitable : ['希望系统理解该专业主题，并能把课程内容转成学习计划或职业叙事的学生'], 6),
    lessSuitableFor: unique(lessSuitable.length ? lessSuitable : ['目标与课程主题完全不相关，或只想获得与本专业无关技能的学生'], 5),
    careerDirections: unique(careers.length ? careers : ['行业研究', '项目管理', '教育/公共服务', '专业进修'], 8),
    studyFocus: unique(focus.length ? focus : ['核心概念', '案例分析', '课堂输出', '职业表达'], 8),
    riskWarnings: unique(risks.length ? risks : ['课程适配仍需结合个人背景、开课安排和官方最新要求判断'], 5)
  };
}

function buildProgrammeSourceIndex(programmes) {
  const byName = new Map();
  const bySlug = new Map();
  for (const item of programmes || []) {
    const name = item.programmeName || item.title || '';
    if (!name) continue;
    byName.set(normalize(name), item);
    bySlug.set(slugProgrammeName(name), item);
  }
  return { byName, bySlug };
}

function isNoisyEvidence(value) {
  const text = normalize(value);
  return !text ||
    text.length < 8 ||
    /gpa|ielts|toefl|cet|application|admission|requirement|acknowledgement|transcript|certificate|tuition|fee|scholarship|online application|warning letter|credits|prerequisite|required courses|elective courses|q[0-9]|hold a relevant|applicants|what kind|will benefit|assessment focuses|source |毕业要求|入学|申请|学费/.test(text);
}

function cleanEvidenceList(values, max = 10) {
  return unique((values || []).filter((item) => !isNoisyEvidence(item)).map((item) => compactText(item, 220)), max);
}

function findProgrammeSource(programme, index) {
  if (!index) return null;
  if (programme.schoolId !== 'lingnan') return null;
  const names = unique([
    programme.titleEn,
    programme.title,
    programme.titleZh,
    String(programme.title || '').replace(/\s*\[[^\]]+\]/g, '')
  ], 8);
  for (const name of names) {
    const direct = index.byName.get(normalize(name));
    if (direct) return direct;
    const slug = index.bySlug.get(slugProgrammeName(name));
    if (slug) return slug;
  }
  const programmeTitle = normalize(programme.titleEn || programme.title);
  for (const [key, value] of index.byName.entries()) {
    if (programmeTitle && (key.includes(programmeTitle) || programmeTitle.includes(key))) return value;
  }
  return null;
}

function prioritizeProgrammeDomains(programme, domains) {
  const text = normalize([programme.title, programme.titleEn, programme.faculty, programme.unitName].join(' '));
  const priority = [];
  if (/data science|数据科学|artificial intelligence studies|smart city|smart manufacturing|innovative design|computing|software|analytics|分析|robot|机器人/.test(text)) priority.push('data_ai', 'computing_systems', 'robotics_spatial');
  if (/business|management|管理|marketing|市场|accountancy|会计|finance|金融|entrepreneurship|创业|supply chain|human resource|人力/.test(text)) priority.push('business_management');
  if (/policy|public|公共|governance|治理|law|法律|security|安全|leadership|领导/.test(text)) priority.push('policy_governance');
  if (/education|教育|teaching|教学|learning|学习|teacher|教师|curriculum|课程/.test(text)) priority.push('education_learning');
  if (/media|communication|传播|journalism|新闻|content|内容|translation|翻译|english|语言/.test(text)) priority.push('media_communication');
  if (/chinese|中文|culture|文化|history|历史|philosophy|哲学|curating|art|艺术|humanities|人文|literature|文学|creative|创意/.test(text)) priority.push('arts_culture_humanities');
  if (/health|健康|医疗|social service|社会服务|ageing|老龄|psychology|心理/.test(text)) priority.push('health_social_service');
  if (/environment|环境|sustainability|可持续|esg|climate|气候|urban|城市|housing|房屋/.test(text)) priority.push('environment_sustainability');
  return unique([...priority, ...domains], 8);
}

function levelText(level) {
  return level === 'high' ? '高' : level === 'medium' ? '中' : '低';
}

function buildProgrammeAdvisorTags({ programme, domains, intensity, source }) {
  const tags = [
    `技术强度：${levelText(intensity.technical)}`,
    `数学门槛：${levelText(intensity.math)}`,
    `编程门槛：${levelText(intensity.programming)}`,
    `阅读写作：${levelText(intensity.reading)}`,
    `实践项目：${levelText(intensity.practice)}`
  ];
  if (/英文|English/i.test(programme.medium)) tags.push('英文授课');
  if (/中文|Chinese|普通话|Putonghua/i.test(programme.medium)) tags.push('中文授课');
  const domainTagMap = {
    data_ai: '数据/AI 方向',
    computing_systems: '系统/平台方向',
    robotics_spatial: '空间/机器人方向',
    policy_governance: '政策治理方向',
    business_management: '商业管理方向',
    media_communication: '媒体传播方向',
    education_learning: '教育学习方向',
    arts_culture_humanities: '人文艺术方向',
    health_social_service: '健康社会服务方向',
    environment_sustainability: '城市/环境/ESG 方向',
    research_methods: '研究方法方向'
  };
  for (const domain of domains) {
    if (domainTagMap[domain]) tags.push(domainTagMap[domain]);
  }
  if (source?.sourceText) tags.push('已匹配官网长文本');
  return unique(tags, 18);
}

function buildProgrammeRiskWarnings({ intensity, domains, source }) {
  const warnings = [];
  if (intensity.math === 'high') warnings.push('数学、统计或量化要求较高，非量化背景学生需要预留补基础时间。');
  if (intensity.programming === 'high') warnings.push('编程或系统工具门槛较高，不适合完全排斥技术实践的人。');
  if (intensity.reading === 'high') warnings.push('阅读、写作、理论或政策分析要求较高，需要能持续输出论文、报告或案例分析。');
  if (domains.includes('data_ai') && !domains.includes('arts_culture_humanities')) warnings.push('不要只因为 AI / 数据热门就选择，应先确认自己是否接受技术和项目压力。');
  if (domains.includes('arts_culture_humanities') || domains.includes('media_communication')) warnings.push('如果目标是硬技术岗位，需要额外补数据、编程或产品项目。');
  if (!source?.sourceText) warnings.push('当前专业判断主要来自已整理课程结构和官网链接，后续仍需补官网长文本复核。');
  return unique(warnings.length ? warnings : ['仍需结合官方最新课程安排、个人背景和目标岗位判断适配度。'], 6);
}

function applyProgrammeIntensityHeuristics(programme, intensity) {
  const text = normalize([programme.title, programme.titleEn, programme.faculty, programme.unitName].join(' '));
  const next = { ...intensity };
  if (/artificial intelligence and the future|ai and the future|philosophy|哲学|humanities|人文/.test(text) && /faculty of arts|arts|philosophy|哲学|人文/.test(text)) {
    next.technical = 'medium';
    next.math = 'low';
    next.programming = 'low';
    next.reading = maxLevel([next.reading, 'high']);
    next.practice = maxLevel([next.practice, 'medium']);
    return next;
  }
  if (/data science|数据科学|artificial intelligence|人工智能|smart city|smart manufacturing|innovative design|robot|机器人|computing|software|information technology|analytics|分析|actuarial|精算|risk|风险|finance|金融/.test(text)) {
    next.technical = maxLevel([next.technical, 'high']);
    if (/data science|analytics|statistics|统计|actuarial|精算|risk|风险|finance|金融|smart city/.test(text)) next.math = maxLevel([next.math, 'high']);
    if (/data science|artificial intelligence|人工智能|software|computing|programming|smart city|innovative design/.test(text)) next.programming = maxLevel([next.programming, 'medium']);
    return next;
  }
  if (/chinese|中文|文化|culture|history|历史|philosophy|哲学|translation|翻译|curating|art|艺术|english|语言|literature|文学|creative|创意/.test(text)) {
    next.technical = next.technical === 'high' ? 'medium' : next.technical;
    next.math = 'low';
    next.programming = 'low';
    next.reading = maxLevel([next.reading, 'high']);
    return next;
  }
  if (/policy|public|公共|governance|治理|law|法律|security law|national security|education|教育|leadership|领导/.test(text)) {
    next.technical = next.technical === 'high' ? 'medium' : next.technical;
    next.math = next.math === 'high' ? 'medium' : next.math;
    next.programming = 'low';
    next.reading = maxLevel([next.reading, 'high']);
    return next;
  }
  if (/business|management|管理|marketing|市场|human resource|人力|accountancy|会计|entrepreneurship|创业|supply chain|供应链/.test(text)) {
    next.technical = next.technical === 'high' ? 'medium' : next.technical;
    next.programming = next.programming === 'high' ? 'medium' : next.programming;
    next.reading = maxLevel([next.reading, 'medium']);
    return next;
  }
  return next;
}

function buildProgrammeAdvisorSummary({ programme, audience, intensity, domains, source, courses }) {
  const title = programme.title;
  const sourceSummary = compactText(source?.summary, 180);
  const base = sourceSummary || `${title} 已根据官网项目资料、学院单位和 ${courses.length} 门课程建立专业知识卡。`;
  const firstFit = audience.suitableFor[0] || '目标与专业主题匹配的学生';
  const pressure = `整体门槛：技术${levelText(intensity.technical)}、数学${levelText(intensity.math)}、编程${levelText(intensity.programming)}、阅读写作${levelText(intensity.reading)}。`;
  const primaryDomain = domains[0] || '';
  const domainNote = primaryDomain === 'data_ai'
    ? '推荐时要重点检查学生是否接受数据、模型、系统或 AI 应用训练。'
    : primaryDomain === 'arts_culture_humanities' || primaryDomain === 'media_communication'
      ? '推荐时要重点看学生是否需要视野、表达、研究和行业理解，而不是硬技术训练。'
      : primaryDomain === 'policy_governance'
        ? '推荐时要重点看学生是否关注制度、治理、风险、公共事务或组织决策。'
        : primaryDomain === 'business_management'
          ? '推荐时要重点看学生是否需要商业判断、组织管理、运营分析和项目落地能力。'
          : primaryDomain === 'education_learning'
            ? '推荐时要重点看学生是否关注教学、学习支持、教育管理或教育科技场景。'
        : '推荐时要结合学生背景、课程输出和职业方向判断。';
  return `${base} 平台判断：更适合${firstFit}。${pressure}${domainNote}`;
}

function buildProgrammeSourceEvidence(source, programme) {
  if (!source) {
    return {
      officialSummary: '',
      officialCareerEvidence: [],
      officialLearningEvidence: [],
      sourceUrls: unique([programme.sourceUrl], 6),
      sourceCoverage: 'platform-programme-course-data'
    };
  }
  return {
    officialSummary: compactText(source.summary, 700),
    officialCareerEvidence: cleanEvidenceList([
      ...(source.careerDirections || []),
      source.graduateOutcomeSummary,
      ...(source.graduateOutcomes || []).map((item) => item.position || item.title || item.sourceText)
    ], 10),
    officialLearningEvidence: cleanEvidenceList([
      ...(source.learningObjectives || []),
      ...(source.skillsDeveloped || []),
      ...(source.importantCourses || []).map((item) => item.title || item.name || item.courseName)
    ], 12),
    sourceUrls: unique([source.officialUrl, ...(source.sourceUrls || []), programme.sourceUrl], 10),
    sourceCoverage: source.sourceText ? 'official-long-text-matched' : 'official-structured-record-matched'
  };
}

function buildEvidenceSummary(item) {
  const parts = [];
  if (item.description) parts.push(`课程描述：${item.description}`);
  if (item.selectionAdvice) parts.push(`已有建议：${item.selectionAdvice}`);
  if (item.perspectiveSummary) parts.push(`人群判断：${item.perspectiveSummary}`);
  if (item.statusNote) parts.push(`数据状态：${item.statusNote}`);
  if (item.requirements?.note) parts.push(`项目要求：${item.requirements.note}`);
  return parts.join(' ').slice(0, 800);
}

function buildCourseKnowledge(course, programme) {
  const sourceText = [
    course.title,
    course.titleZh,
    course.type,
    course.description,
    course.selectionAdvice,
    course.perspectiveSummary,
    course.faculty,
    course.unitName,
    course.medium,
    ...(course.tags || []),
    ...(course.learnerFit || []),
    ...(course.learningGains || []),
    ...(course.careerLinks || []),
    ...(course.strategyFocus || []),
    ...(course.backgroundPerspectives || []).flatMap((item) => [item.role, item.viewpoint, item.deepen, item.career])
  ].join(' ');
  const domains = classifyDomains(sourceText);
  const intensity = classifyIntensity(sourceText, domains);
  const audience = domainAudience(domains);
  const curated = Boolean(course.selectionAdvice || course.perspectiveSummary || course.courseGuide);
  const base = {
    id: course.id,
    baseId: course.baseId || course.id,
    schoolId: course.schoolId,
    programmeId: course.programmeId,
    programmeTitle: course.programmeTitle,
    programmeTitleEn: programme?.titleEn || '',
    faculty: course.faculty || programme?.faculty || '',
    unitName: course.unitName || programme?.unitName || '',
    title: course.title,
    titleZh: course.titleZh || '',
    typeKey: course.typeKey,
    type: course.type,
    required: Boolean(course.required),
    credits: course.credits,
    medium: course.medium,
    sourceUrl: course.descriptionSourceUrl || course.sourceUrl || programme?.sourceUrl || '',
    checkedAt: course.checkedAt || programme?.checkedAt || '',
    officialBasis: unique([
      course.descriptionSourceType ? `description:${course.descriptionSourceType}` : '',
      course.descriptionSourceUrl ? 'course-description-url' : '',
      course.sourceUrl ? 'programme-source-url' : '',
      ...(course.materialBasis || [])
    ], 8),
    domains,
    intensity,
    suitableFor: unique([...(course.learnerFit || []), ...audience.suitableFor], 8),
    lessSuitableFor: audience.lessSuitableFor,
    careerDirections: unique([...(course.careerLinks || []), ...audience.careerDirections], 8),
    studyFocus: unique([...(course.strategyFocus || []), ...audience.studyFocus], 8),
    learningGains: unique(course.learningGains || [], 6),
    riskWarnings: audience.riskWarnings,
    advisorSummary: course.perspectiveSummary || course.selectionAdvice || buildAdvisorSummary(course, domains, intensity),
    retrievalKeywords: unique([
      course.title,
      course.titleZh,
      course.programmeTitle,
      course.faculty,
      course.unitName,
      course.medium,
      ...domains,
      ...audience.careerDirections,
      ...(course.tags || [])
    ], 30),
    evidenceSummary: buildEvidenceSummary(course),
    confidence: curated ? 'curated-first-pass' : course.description ? 'auto-from-official-description' : 'auto-from-title-only',
    reviewStatus: curated ? 'needs-human-review-curated' : 'needs-human-review-auto'
  };

  return applyCuratedOverrides(base, course);
}

function buildAdvisorSummary(course, domains, intensity) {
  const title = course.titleZh || course.title;
  const domainText = domains.length ? domains.join(', ') : 'general';
  if (course.required) {
    return `${title} 是必修或核心课程，推荐重点不是判断是否选择，而是根据个人背景决定学习侧重、项目输出和职业表达。`;
  }
  if (intensity.technical === 'high') {
    return `${title} 技术含量较高，适合愿意投入工具、数据、模型或系统理解的学生；非技术背景学生应先评估数学、统计或编程准备。`;
  }
  if (domains.includes('policy_governance') || domains.includes('media_communication') || domains.includes('arts_culture_humanities')) {
    return `${title} 更偏理解、判断和表达，适合用来拓宽视野、建立行业解释框架，并连接政策、传播、文化或管理类职业目标。`;
  }
  return `${title} 可作为 ${domainText} 方向的课程知识卡，建议结合个人背景、目标岗位和课程输出判断适配度。`;
}

function applyCuratedOverrides(record, course) {
  const isAiep = course.programmeId === 'aiep-emi' || course.programmeId === 'aiep-cmi';
  if (!isAiep) return record;
  const baseId = course.baseId || course.id;
  const overrides = {
    'foundation-ai': {
      domains: ['data_ai', 'education_learning', 'research_methods'],
      intensity: { technical: 'medium', math: 'medium', programming: 'medium', reading: 'medium', practice: 'medium' },
      suitableFor: ['所有 AIEP 学生；尤其适合需要建立 AI 基础语言、模型边界和应用判断的人'],
      lessSuitableFor: ['不能跳过；这是必修课，不作为选不选的问题处理'],
      careerDirections: ['AI 产品理解', '教育科技', '数字化项目管理', '行业研究'],
      studyFocus: ['AI 基础概念', '模型能力边界', '数据与评估', '把技术讲给非技术团队'],
      riskWarnings: ['不要只停留在工具体验，要形成可解释的 AI 判断语言'],
      advisorSummary: '人工智能基础是 AIEP 的共同语言课。它不要求所有人转成工程师，但要求学生理解模型、数据、评估和应用边界，方便后续把不同背景连接到 AI 场景。'
    },
    'ai-tech-engineering': {
      domains: ['data_ai', 'computing_systems', 'research_methods'],
      intensity: { technical: 'high', math: 'medium', programming: 'high', reading: 'medium', practice: 'high' },
      suitableFor: ['想理解 AI 系统如何落地、部署、评估和与业务流程连接的学生'],
      lessSuitableFor: ['完全不愿接触系统架构、技术流程或部署概念的人会感到吃力'],
      careerDirections: ['AI 产品', '教育科技', '数字化项目', '技术项目管理', 'AI 转型顾问'],
      studyFocus: ['系统架构', 'RAG / Agent / 知识库', '部署流程', '工程边界', '非技术沟通'],
      riskWarnings: ['重点不是背工具名，而是理解组织是否真的具备落地条件'],
      advisorSummary: '人工智能技术与工程把 AI 从工具体验推进到系统落地。它适合想判断一个组织能不能部署 RAG、Agent、知识库或多模态应用的人。'
    },
    'humanities-ai': {
      domains: ['arts_culture_humanities', 'policy_governance', 'media_communication'],
      intensity: { technical: 'low', math: 'low', programming: 'low', reading: 'high', practice: 'medium' },
      suitableFor: ['媒体、教育、管理、人文、公共政策或想拓宽 AI 社会影响视野的学生'],
      lessSuitableFor: ['只想训练编程、算法或模型部署的人，不应把它当作硬技术课'],
      careerDirections: ['公共传播', 'AI 伦理治理', '教育管理', '内容策略', '行业研究'],
      studyFocus: ['AI 与人文', '伦理与信任', '社会影响', '公共表达', '批判性判断'],
      riskWarnings: ['不要用技术课标准衡量它；它的价值在判断、表达和社会理解'],
      advisorSummary: '人文与人工智能是 AIEP 的视野课。它回答的不是 AI 怎么更快，而是 AI 怎样改变人、学习、组织、文化和信任。'
    },
    'contemporary-ai-issues': {
      domains: ['data_ai', 'policy_governance', 'business_management'],
      intensity: { technical: 'medium', math: 'low', programming: 'low', reading: 'high', practice: 'medium' },
      suitableFor: ['想理解 AI 热点、行业变化、组织准备度和社会影响的学生'],
      lessSuitableFor: ['只想获得算法训练或代码项目的人'],
      careerDirections: ['行业研究', 'AI 咨询', '数字化管理', '政策研究', '产品策略'],
      studyFocus: ['技术趋势拆解', '组织准备度', '成本与风险', '伦理与治理', '落地条件'],
      riskWarnings: ['需要避免追热点，要把趋势拆成可验证的组织和行业问题'],
      advisorSummary: '人工智能技术当代议题适合作为 AI 趋势判断课。它帮助学生把技术热点拆成基础设施、组织准备度、成本、伦理和落地条件。'
    },
    'data-science': {
      domains: ['data_ai', 'research_methods'],
      intensity: { technical: 'high', math: 'high', programming: 'high', reading: 'medium', practice: 'high' },
      suitableFor: [
        '应届生中想走数据分析、统计分析、产品分析、运营分析、AI 产品或技术路线的人',
        '明确愿意挑战数学、统计、R / Python 或基础编程的人',
        '已有 Excel、统计、问卷、运营数据、用户研究或业务分析基础，希望转向数据判断的人'
      ],
      lessSuitableFor: [
        '没有数学、统计或编程基础，只想轻松打开 AI 视野的文科或资深从业者',
        '30 岁左右媒体/内容从业者且不准备补量化基础的人',
        '目标是政策、伦理、传播或管理视野，但不想做数据项目的人'
      ],
      careerDirections: ['数据分析助理', 'BI / 运营分析', '产品分析', '市场研究', '教育数据分析', 'AI 产品助理'],
      studyFocus: ['统计学基础', 'R / 数据处理', '线性回归', '分类算法', '聚类算法', '模型评估', '结果可视化和非技术表达'],
      riskWarnings: ['不要因为“数据科学就业好”就盲选；这门课的门槛主要在统计、算法和基础编程。', '没有线代、统计或编程基础的学生，应先补基础或优先考虑政策、安全、趋势类选修课。'],
      advisorSummary: 'Data Science 偏统计学和算法应用，不是轻松的 AI 视野课。它适合应届生中想走数据、统计、产品分析或技术路线，并愿意挑战数学、统计和编程的人；不适合完全无量化基础、只想拓宽视野的文科或资深从业者作为首选。'
    },
    'spatial-intelligence': {
      domains: ['robotics_spatial', 'data_ai', 'computing_systems'],
      intensity: { technical: 'high', math: 'medium', programming: 'medium', reading: 'medium', practice: 'high' },
      suitableFor: ['对机器人、AR/VR、GIS、导航、空间计算、智能硬件或沉浸式应用感兴趣的学生', '愿意理解空间数据、感知和现实场景中 AI 应用的人'],
      lessSuitableFor: ['完全不想接触技术概念，只希望读政策、伦理或趋势视野的人'],
      careerDirections: ['智能硬件产品', 'AR/VR 应用', 'GIS / 城市科技', '机器人教育', '空间智能项目'],
      studyFocus: ['空间感知', '深度感知', '空间数据解释', '机器人/AR/VR/GIS 案例', '应用场景设计'],
      riskWarnings: ['技术概念密度高于普通视野课，但不一定像 Data Science 那样以统计建模为主'],
      advisorSummary: 'Spatial Intelligence 技术含量较高，但更偏空间应用理解。它适合想把 AI 放进现实空间、硬件、AR/VR、GIS 或机器人场景的人。'
    },
    'privacy-security-policy': {
      domains: ['policy_governance', 'business_management', 'media_communication'],
      intensity: { technical: 'medium', math: 'low', programming: 'low', reading: 'high', practice: 'medium' },
      suitableFor: ['媒体、法律、教育管理、公共政策、企业管理、金融、医疗或内容平台背景的学生', '未来需要判断 AI 上线、数据使用、版权、安全、合规和风险的人'],
      lessSuitableFor: ['只想做纯算法、编程或模型训练，不关心治理边界的人'],
      careerDirections: ['AI 治理', '合规/风控', '数据保护', '政策研究', '版权管理', '企业安全治理'],
      studyFocus: ['隐私保护', '安全风险', 'AI 治理', '政策法规', '组织上线边界'],
      riskWarnings: ['这不是数学课，技术门槛主要来自理解系统风险和治理语言'],
      advisorSummary: 'Privacy, Security, and Policy 是中等技术门槛的治理课。它适合文科、媒体、法律、政策和管理背景学生建立 AI 上线、隐私、安全与责任判断。'
    },
    'ai-trends-work-home': {
      domains: ['business_management', 'education_learning', 'media_communication'],
      intensity: { technical: 'low', math: 'low', programming: 'low', reading: 'medium', practice: 'medium' },
      suitableFor: ['不确定自己要走技术、管理还是应用方向，想先建立 AI 行业图谱的人', '资深从业者、媒体人、教师、管理者、创业者和服务业从业者'],
      lessSuitableFor: ['已经明确要训练算法、统计建模或系统部署的人，不应只停留在这门课'],
      careerDirections: ['行业研究', 'AI 咨询', '产品运营', '教育培训', '企业数字化', '创新管理'],
      studyFocus: ['AI 场景地图', '职场与家庭应用', '行业趋势', '社会影响', '机会识别'],
      riskWarnings: ['技术门槛较低，但要避免只听概念；最好结合自己的行业做趋势判断'],
      advisorSummary: 'Trends in Artificial Intelligence at Workplace and at Home 是低技术门槛的视野型选修。它适合想打开 AI 行业地图、理解不同生活和工作场景变化的人。'
    },
    'project-chatbot': {
      domains: ['data_ai', 'computing_systems', 'business_management'],
      intensity: { technical: 'high', math: 'medium', programming: 'high', reading: 'medium', practice: 'high' },
      suitableFor: ['想把课程成果转成可展示原型、作品集或 AI 产品案例的学生'],
      lessSuitableFor: ['只想阅读讨论、不想做原型或项目迭代的人'],
      careerDirections: ['AI 产品助理', '教育科技产品', '内容/服务自动化', '项目管理', '创业原型'],
      studyFocus: ['聊天机器人原型', '用户需求', '提示词与流程', '测试迭代', '作品集表达'],
      riskWarnings: ['项目课重点是过程和结果，不要只停留在工具演示'],
      advisorSummary: 'Project I 是把想法做成产品的关键课。它最能体现从课程到就业的衔接，因为学生可以带着原型、分工和迭代过程去讲求职故事。'
    },
    'project-llm-elm': {
      domains: ['data_ai', 'computing_systems', 'research_methods'],
      intensity: { technical: 'high', math: 'medium', programming: 'high', reading: 'medium', practice: 'high' },
      suitableFor: ['想把 AIEP 学习成果转成模型部署、组织解决方案或技术型作品集的人'],
      lessSuitableFor: ['完全不想接触模型部署、系统配置或技术落地的人'],
      careerDirections: ['AI 工程助理', 'AI 产品', '数字化转型', '技术项目管理', '研究型作品集'],
      studyFocus: ['大语言模型部署', '组织问题定义', '模型评估', '系统落地', '项目复盘'],
      riskWarnings: ['这是技术深度最高的一类项目课，需要准备系统学习和持续调试'],
      advisorSummary: 'Project II 更偏模型和部署，是技术深度最高的一类项目课。适合想把 AIEP 学习成果转成 AI 工程能力或研究型作品的人。'
    }
  };
  const override = overrides[baseId];
  if (!override) return record;
  return {
    ...record,
    domains: override.domains,
    intensity: override.intensity,
    suitableFor: override.suitableFor,
    lessSuitableFor: override.lessSuitableFor,
    careerDirections: override.careerDirections,
    studyFocus: override.studyFocus,
    riskWarnings: override.riskWarnings,
    advisorSummary: override.advisorSummary,
    confidence: 'curated-aiep-rule',
    reviewStatus: 'human-curated-first-pass',
    retrievalKeywords: unique([
      record.title,
      record.titleZh,
      record.programmeTitle,
      record.medium,
      ...override.domains,
      ...override.careerDirections,
      ...override.studyFocus
    ], 30)
  };
}

function buildProgrammeKnowledge(programme, courses, programmeSource = null) {
  const text = [
    programme.title,
    programme.titleEn,
    programme.titleZh,
    programme.faculty,
    programme.unitName,
    programme.medium,
    programme.statusNote,
    programme.requirements?.note,
    programmeSource?.summary,
    ...(programmeSource?.learningObjectives || []),
    ...(programmeSource?.skillsDeveloped || []),
    ...(programmeSource?.careerDirections || []),
    programmeSource?.graduateOutcomeSummary,
    ...courses.flatMap((course) => [course.title, course.titleZh, course.description, ...(course.tags || [])])
  ].join(' ');
  const domains = prioritizeProgrammeDomains(programme, classifyDomains(text));
  const audience = domainAudience(domains);
  const intensities = courses.map((course) => classifyIntensity([
    course.title,
    course.titleZh,
    course.description,
    course.selectionAdvice,
    ...(course.tags || [])
  ].join(' '), classifyDomains(`${course.title} ${course.titleZh} ${course.description}`)));
  const aggregateIntensity = applyProgrammeIntensityHeuristics(programme, {
    technical: maxLevel(intensities.map((item) => item.technical)),
    math: maxLevel(intensities.map((item) => item.math)),
    programming: maxLevel(intensities.map((item) => item.programming)),
    reading: maxLevel(intensities.map((item) => item.reading)),
    practice: maxLevel(intensities.map((item) => item.practice))
  });
  const sourceEvidence = buildProgrammeSourceEvidence(programmeSource, programme);
  const suitableFor = unique([
    ...audience.suitableFor
  ], 10);
  const careerDirections = unique([
    ...audience.careerDirections,
    ...cleanEvidenceList(programmeSource?.careerDirections || [], 6),
    ...cleanEvidenceList((programmeSource?.graduateOutcomes || []).map((item) => item.position || item.title || item.sourceText), 6)
  ], 10);
  const studyFocus = unique([
    ...audience.studyFocus,
    ...cleanEvidenceList(programmeSource?.learningObjectives || [], 6),
    ...cleanEvidenceList(programmeSource?.skillsDeveloped || [], 6)
  ], 10);
  const riskWarnings = buildProgrammeRiskWarnings({ intensity: aggregateIntensity, domains, source: programmeSource });
  const advisorTags = buildProgrammeAdvisorTags({ programme, domains, intensity: aggregateIntensity, source: programmeSource });
  const advisorSummary = buildProgrammeAdvisorSummary({
    programme,
    audience: { ...audience, suitableFor },
    intensity: aggregateIntensity,
    domains,
    source: programmeSource,
    courses
  });
  return {
    id: programme.id,
    schoolId: programme.schoolId,
    school: programme.school,
    faculty: programme.faculty,
    unitName: programme.unitName || '',
    unitLabel: programme.unitLabel || '',
    title: programme.title,
    titleEn: programme.titleEn || '',
    medium: programme.medium,
    studyModes: programme.studyModes || [],
    courseCount: courses.length || programme.courseCount || 0,
    requirements: programme.requirements,
    sourceUrl: programme.sourceUrl || '',
    checkedAt: programme.checkedAt || '',
    sourceCoverage: sourceEvidence.sourceCoverage,
    sourceUrls: sourceEvidence.sourceUrls,
    officialSummary: sourceEvidence.officialSummary,
    officialCareerEvidence: sourceEvidence.officialCareerEvidence,
    officialLearningEvidence: sourceEvidence.officialLearningEvidence,
    domains,
    intensity: aggregateIntensity,
    advisorTags,
    suitableFor,
    suitableStudentProfiles: suitableFor,
    lessSuitableFor: audience.lessSuitableFor,
    notRecommendedFor: audience.lessSuitableFor,
    careerDirections,
    studyFocus,
    riskWarnings,
    advisorSummary,
    retrievalKeywords: unique([
      programme.title,
      programme.titleEn,
      programme.faculty,
      programme.unitName,
      programme.medium,
      ...advisorTags,
      ...domains,
      ...careerDirections
    ], 30),
    confidence: programmeSource?.sourceText
      ? 'programme-official-long-text'
      : courses.length
        ? 'auto-from-programme-and-courses'
        : 'auto-from-programme-only',
    reviewStatus: programmeSource?.sourceText ? 'needs-human-review-official-text' : 'needs-human-review-auto'
  };
}

function buildRetrievalRules() {
  return [
    {
      id: 'required-course',
      priority: 100,
      rule: '必修课不判断“是否选择”，只判断不同背景学生应该怎样学习、如何转成项目或职业叙事。'
    },
    {
      id: 'data-science-gate',
      priority: 95,
      rule: 'Data Science、统计、回归、分类、聚类、机器学习类课程需要先检查数学、统计、编程准备；应届生只有目标指向数据/统计/产品分析/技术路线或明确愿意挑战数学时才强推荐。'
    },
    {
      id: 'senior-humanities-profile',
      priority: 90,
      rule: '30 岁左右或资深媒体、内容、管理、人文背景学生，若无量化基础且目标是拓宽视野，优先推荐政策、安全、伦理、趋势、传播、治理类课程。'
    },
    {
      id: 'career-first-fresh-graduate',
      priority: 85,
      rule: '应届生推荐时必须连接简历项目、作品集、岗位关键词和可展示输出，不能只说“这门课有用”。'
    },
    {
      id: 'ai-grounding',
      priority: 80,
      rule: 'DeepSeek 或其他 AI 只能基于 advisorKnowledge 中的课程卡、来源和规则生成回答；没有来源的内容必须标注为平台建议，不得伪装成官方信息。'
    }
  ];
}

function buildReviewMarkdown(knowledge) {
  const courseByConfidence = knowledge.courseKnowledge.reduce((acc, item) => {
    acc[item.confidence] = (acc[item.confidence] || 0) + 1;
    return acc;
  }, {});
  const programmeByConfidence = knowledge.programmeKnowledge.reduce((acc, item) => {
    acc[item.confidence] = (acc[item.confidence] || 0) + 1;
    return acc;
  }, {});
  const highTech = knowledge.courseKnowledge.filter((item) => item.intensity.technical === 'high').length;
  const highMath = knowledge.courseKnowledge.filter((item) => item.intensity.math === 'high').length;
  const aiep = knowledge.courseKnowledge.filter((item) => item.programmeId === 'aiep-emi' || item.programmeId === 'aiep-cmi');
  const aiepRows = aiep.map((item) => `| ${item.titleZh || item.title} | ${item.medium} | ${item.type} | 技术 ${item.intensity.technical} / 数学 ${item.intensity.math} / 编程 ${item.intensity.programming} | ${item.advisorSummary.replace(/\|/g, '/')} |`).join('\n');
  const programmeSamples = knowledge.programmeKnowledge
    .filter((item) => item.confidence === 'programme-official-long-text' || item.id === 'aiep-emi' || item.schoolId === 'eduhk')
    .slice(0, 12)
    .map((item) => `| ${item.title.replace(/\|/g, '/')} | ${item.schoolId} | ${item.advisorTags.slice(0, 5).join('、')} | ${item.suitableStudentProfiles.slice(0, 2).join('；').replace(/\|/g, '/')} | ${item.advisorSummary.replace(/\|/g, '/')} |`)
    .join('\n');
  return `# Advisor Knowledge Review

Generated at: ${knowledge.meta.generatedAt}

## Coverage

- Schools: ${knowledge.meta.counts.schools}
- Programmes: ${knowledge.meta.counts.programmes}
- Courses: ${knowledge.meta.counts.courses}
- High technical courses: ${highTech}
- High math courses: ${highMath}

## Confidence

### Programme Confidence

${Object.entries(programmeByConfidence).map(([key, value]) => `- ${key}: ${value}`).join('\n')}

### Course Confidence

${Object.entries(courseByConfidence).map(([key, value]) => `- ${key}: ${value}`).join('\n')}

## Programme Sample

| Programme | School | Tags | Suitable students | Advisor summary |
| --- | --- | --- | --- | --- |
${programmeSamples}

## AIEP Sample

| Course | Medium | Type | Intensity | Advisor summary |
| --- | --- | --- | --- | --- |
${aiepRows}

## Review Notes

- This is the first full advisor knowledge base. It is generated from the current platform course data and existing official source URLs.
- AIEP Data Science has curated rules: it is treated as statistics / algorithm oriented, suitable for fresh graduates or students who actively want data, statistics, product analysis or technical routes.
- Other programmes are auto-classified by course titles, descriptions, tags, school units and official source traces. They still need gradual human review before being presented as final editorial advice.
- DeepSeek should use this file as grounding material. It should explain, compare and personalize, but should not invent course facts.
`;
}

async function main() {
  const platformData = JSON.parse(await readFile(platformDataPath, 'utf8'));
  const programmeSourceRecords = await readJsonIfExists(programmesJsonPath) || [];
  const programmeSourceIndex = buildProgrammeSourceIndex(programmeSourceRecords);
  const programmes = platformData.programmes || [];
  const courses = platformData.courses || [];
  const programmeById = new Map(programmes.map((programme) => [programme.id, programme]));
  const coursesByProgramme = new Map();
  for (const course of courses) {
    const list = coursesByProgramme.get(course.programmeId) || [];
    list.push(course);
    coursesByProgramme.set(course.programmeId, list);
  }

  const programmeKnowledge = programmes.map((programme) => buildProgrammeKnowledge(
    programme,
    coursesByProgramme.get(programme.id) || [],
    findProgrammeSource(programme, programmeSourceIndex)
  ));
  const courseKnowledge = courses.map((course) => buildCourseKnowledge(course, programmeById.get(course.programmeId)));

  const knowledge = {
    meta: {
      version: 'advisor-knowledge-v1',
      generatedAt: new Date().toISOString(),
      sourcePlatformVersion: platformData.version || '',
      sourceGeneratedAt: platformData.generatedAt || '',
      counts: {
        schools: (platformData.schools || []).length,
        programmes: programmeKnowledge.length,
        courses: courseKnowledge.length
      },
      scope: 'First full structured advisor knowledge base for all currently bundled programmes and courses.',
      disclaimer: '本知识库由平台公开资料和规则分析生成，仅供选课参考，不代表学校官方意见。'
    },
    retrievalRules: buildRetrievalRules(),
    programmeKnowledge,
    courseKnowledge
  };

  await writeFile(outputPath, `${JSON.stringify(knowledge, null, 2)}\n`, 'utf8');
  await writeFile(reviewPath, buildReviewMarkdown(knowledge), 'utf8');
  console.log(`Wrote ${outputPath}`);
  console.log(`Wrote ${reviewPath}`);
  console.log(JSON.stringify(knowledge.meta.counts));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
