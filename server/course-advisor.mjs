export const COURSE_ADVISOR_DISCLAIMER = '本建议基于当前课程库和学生自填信息生成，仅供选课参考，不代表学校官方意见。';

const COURSE_ADVISOR_SYSTEM_PROMPT = `You are an AI course-selection advisor for a student course guide.

You must answer only using the provided course knowledge base.
Rules:
1. Do not invent courses, admission rules, jobs, official claims, or school policies.
2. If the current course is required, clearly say the student must complete it, then personalize how to study it.
3. If the current course is elective or project-based, evaluate fit based on the student profile.
4. Explain how the course connects to employment, career transition, broader perspective, or professional upgrade.
5. Use the provided background perspectives and strategy focus as the primary knowledge.
6. Output valid JSON only.
7. All user-facing text must be Simplified Chinese.
8. Preserve course IDs and official English names exactly.`;

const OUTPUT_SHAPE = {
  summary: 'string',
  fitLevel: 'required | high | medium | low',
  fitScore: 0,
  keyReasons: ['string'],
  mustLearnNote: 'string',
  recommendedFocus: ['string'],
  careerConnection: ['string'],
  suggestedCourseCombination: ['string'],
  nextQuestionPrompts: ['string'],
  source: 'deepseek | local-rules',
  disclaimer: COURSE_ADVISOR_DISCLAIMER
};

function normalize(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9\u4e00-\u9fff]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function unique(values) {
  return Array.from(new Set(values.map((value) => String(value || '').trim()).filter(Boolean)));
}

function trimString(value, max = 400) {
  return String(value || '').trim().slice(0, max);
}

function parseAge(value) {
  const age = Number(value);
  return Number.isFinite(age) && age >= 15 && age <= 80 ? age : null;
}

export function validateCourseAdvisorInput(body) {
  const profile = {
    courseId: trimString(body.courseId, 160),
    age: parseAge(body.age),
    workExperience: trimString(body.workExperience, 600),
    isFreshGraduate: Boolean(body.isFreshGraduate),
    background: trimString(body.background, 400),
    goals: trimString(body.goals, 600),
    question: trimString(body.question, 600)
  };
  if (!profile.courseId) throw new Error('缺少课程 ID');
  if (![profile.workExperience, profile.background, profile.goals, profile.question].some(Boolean) && profile.age == null && !profile.isFreshGraduate) {
    throw new Error('请至少填写一个个人背景字段');
  }
  return profile;
}

function scoreCourseForProfile(course, profile) {
  const profileText = normalize([
    profile.age ? `${profile.age}` : '',
    profile.isFreshGraduate ? '应届生 求职 就业 entry graduate fresh' : '',
    profile.workExperience,
    profile.background,
    profile.goals,
    profile.question
  ].join(' '));
  const fields = [
    course.title,
    course.titleZh,
    course.type,
    course.description,
    course.selectionAdvice,
    course.perspectiveSummary,
    ...(course.strategyFocus || []),
    ...(course.learnerFit || []),
    ...(course.learningGains || []),
    ...(course.careerLinks || []),
    ...(course.tags || []),
    ...(course.backgroundPerspectives || []).flatMap((item) => [item.role, item.viewpoint, item.deepen, item.career])
  ];
  const courseText = normalize(fields.join(' '));
  const tokens = unique(profileText.split(' ').filter((token) => token.length >= 2));
  let score = course.required ? 42 : 30;
  for (const token of tokens) {
    if (courseText.includes(token)) score += token.length >= 4 ? 5 : 2;
  }
  const keywordBoosts = ['数据', '分析', '产品', '媒体', '内容', '教育', '管理', '就业', '求职', '作品', '安全', '隐私', '政策', '机器人', '空间', '模型', '部署', 'llm', 'rag', 'agent'];
  for (const keyword of keywordBoosts) {
    if (profileText.includes(keyword) && courseText.includes(keyword)) score += 8;
  }
  if (profile.isFreshGraduate && courseText.includes('就业')) score += 14;
  if (normalize(profile.goals).includes('就业') || normalize(profile.goals).includes('job')) score += 10;
  if (normalize(profile.workExperience).includes('媒体') && courseText.includes('媒体')) score += 12;
  if (/(媒体|传媒|内容|编辑|记者|传播)/.test(profileText) && /(data science|数据科学|数据分析|回归|聚类)/.test(courseText)) {
    const hasQuantReadiness = /(数学|线代|线性代数|统计|概率|微积分|算法|编程|python|r语言|数据分析|建模|量化)/.test(profileText);
    score += hasQuantReadiness ? 8 : -26;
  }
  if (normalize(profile.workExperience).includes('教育') && courseText.includes('教育')) score += 10;
  if (normalize(profile.background).includes('数据') && courseText.includes('数据')) score += 12;
  if (course.typeKey === 'project' && normalize(profile.goals).includes('作品')) score += 12;
  return Math.max(0, Math.min(100, score));
}

function knowledgeText(knowledge) {
  if (!knowledge) return '';
  return [
    knowledge.advisorSummary,
    ...(knowledge.suitableFor || []),
    ...(knowledge.lessSuitableFor || []),
    ...(knowledge.careerDirections || []),
    ...(knowledge.studyFocus || []),
    ...(knowledge.riskWarnings || []),
    ...(knowledge.retrievalKeywords || [])
  ].join(' ');
}

function selectPerspective(course, profile) {
  const perspectives = course.backgroundPerspectives || [];
  if (!perspectives.length) return null;
  const text = normalize([profile.workExperience, profile.background, profile.goals, profile.question, profile.isFreshGraduate ? '应届生 就业' : ''].join(' '));
  const ranked = perspectives
    .map((item) => {
      const itemText = normalize([item.role, item.viewpoint, item.deepen, item.career].join(' '));
      let score = 0;
      for (const token of unique(text.split(' ').filter((part) => part.length >= 2))) {
        if (itemText.includes(token)) score += token.length >= 4 ? 4 : 1;
      }
      if (profile.isFreshGraduate && itemText.includes('应届生')) score += 30;
      return { item, score };
    })
    .sort((a, b) => b.score - a.score);
  return ranked[0]?.item || perspectives[0];
}

function fitLevelFor(course, score) {
  if (course.required) return 'required';
  if (score >= 74) return 'high';
  if (score >= 52) return 'medium';
  return 'low';
}

function siblingSuggestions(course, profile, programmeCourses, programmeCourseKnowledge = []) {
  const currentBaseId = course.baseId || course.id;
  const knowledgeById = new Map(programmeCourseKnowledge.map((item) => [item.id, item]));
  const ranked = programmeCourses
    .filter((item) => item.id !== course.id)
    .map((item) => ({ item, score: scoreCourseForProfile(item, profile) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);
  const required = programmeCourses.filter((item) => item.required).slice(0, 4);
  const base = course.required
    ? [`必修链路：${required.map((item) => item.titleZh || item.title).join('、')} 都需要完成。`]
    : [`当前是${course.type}，可结合必修课形成方向组合。`];
  const pair = ranked.map(({ item }) => {
    const knowledge = knowledgeById.get(item.id);
    return `${item.titleZh || item.title}：${knowledge?.advisorSummary || item.selectionAdvice || item.perspectiveSummary || '可作为同项目课程搭配参考。'}`;
  });
  if (currentBaseId === 'data-science') pair.unshift('与 Project II 搭配可形成“数据分析 + 模型部署”的作品集。');
  if (currentBaseId === 'project-chatbot') pair.unshift('与 AI Technologies and Engineering 搭配，可形成“系统理解 + 产品落地”的求职叙事。');
  if (currentBaseId === 'privacy-security-policy') pair.unshift('与 AI Technologies and Engineering 搭配，可形成“工程方案 + 负责任上线”的方向。');
  return unique([...base, ...pair]).slice(0, 5);
}

export function buildLocalCourseAdvisorResult({ course, programmeCourses, profile, courseKnowledge = null, programmeCourseKnowledge = [], retrievalRules = [] }) {
  const scoredCourse = courseKnowledge ? {
    ...course,
    selectionAdvice: unique([course.selectionAdvice, courseKnowledge.advisorSummary, ...(courseKnowledge.suitableFor || []), ...(courseKnowledge.lessSuitableFor || [])]).join(' '),
    perspectiveSummary: unique([course.perspectiveSummary, knowledgeText(courseKnowledge)]).join(' '),
    strategyFocus: unique([...(course.strategyFocus || []), ...(courseKnowledge.studyFocus || [])]),
    learnerFit: unique([...(course.learnerFit || []), ...(courseKnowledge.suitableFor || [])]),
    learningGains: unique([...(course.learningGains || []), ...(courseKnowledge.learningGains || [])]),
    careerLinks: unique([...(course.careerLinks || []), ...(courseKnowledge.careerDirections || [])]),
    tags: unique([...(course.tags || []), ...(courseKnowledge.domains || []), ...(courseKnowledge.retrievalKeywords || [])])
  } : course;
  const score = scoreCourseForProfile(scoredCourse, profile);
  const fitLevel = fitLevelFor(course, score);
  const perspective = selectPerspective(course, profile);
  const mustLearnNote = course.required
    ? '这是必修课，不能作为“是否选择”的问题处理；更重要的是根据你的背景决定学习重点和项目表达方式。'
    : '';
  const keyReasons = unique([
    courseKnowledge?.advisorSummary,
    course.selectionAdvice,
    perspective?.viewpoint,
    ...(courseKnowledge?.riskWarnings || []).slice(0, 2),
    profile.isFreshGraduate ? '你选择了应届生身份，系统会优先把课程价值转成就业、作品集和岗位表达。' : '',
    profile.workExperience ? `你的经历信息显示：${profile.workExperience}` : ''
  ]).slice(0, 4);
  const recommendedFocus = unique([
    ...(courseKnowledge?.studyFocus || []),
    ...(course.strategyFocus || []),
    perspective?.deepen,
    ...(course.learningGains || []).slice(0, 2)
  ]).slice(0, 5);
  const careerConnection = unique([
    ...(courseKnowledge?.careerDirections || []),
    perspective?.career,
    ...(course.careerLinks || [])
  ]).slice(0, 5);
  const summary = course.required
    ? `${course.titleZh || course.title} 是必修课，你必须学习；AI 顾问建议你把重点放在“${recommendedFocus[0] || '课程核心能力'}”，并把它转化成可解释的项目/职业叙事。`
    : `${course.titleZh || course.title} 对你的适配度为${fitLevel === 'high' ? '高' : fitLevel === 'medium' ? '中等' : '较低'}。建议重点看它能否帮助你实现：${profile.goals || perspective?.career || '就业或职业升级目标'}。`;
  return {
    summary,
    fitLevel,
    fitScore: course.required ? 100 : score,
    keyReasons,
    mustLearnNote,
    recommendedFocus,
    careerConnection,
    suggestedCourseCombination: siblingSuggestions(course, profile, programmeCourses, programmeCourseKnowledge),
    nextQuestionPrompts: [
      '如果我的目标是尽快就业，这门课应如何写进简历？',
      '如果我是非技术背景，学习这门课前要补什么？',
      '这门课和同项目其他课程应该怎么搭配？'
    ],
    source: 'local-rules',
    knowledgeBase: courseKnowledge ? {
      confidence: courseKnowledge.confidence,
      reviewStatus: courseKnowledge.reviewStatus,
      intensity: courseKnowledge.intensity,
      retrievalRules: retrievalRules.slice(0, 5).map((item) => item.rule)
    } : undefined,
    disclaimer: COURSE_ADVISOR_DISCLAIMER
  };
}

function safeCourse(course) {
  return {
    id: course.id,
    baseId: course.baseId,
    title: course.title,
    titleZh: course.titleZh,
    type: course.type,
    typeKey: course.typeKey,
    required: Boolean(course.required),
    description: course.description,
    selectionAdvice: course.selectionAdvice,
    perspectiveSummary: course.perspectiveSummary,
    strategyFocus: course.strategyFocus || [],
    backgroundPerspectives: course.backgroundPerspectives || [],
    learnerFit: course.learnerFit || [],
    learningGains: course.learningGains || [],
    careerLinks: course.careerLinks || [],
    materialBasis: course.materialBasis || []
  };
}

function safeKnowledge(knowledge) {
  if (!knowledge) return null;
  return {
    id: knowledge.id,
    programmeId: knowledge.programmeId,
    title: knowledge.title,
    titleZh: knowledge.titleZh,
    typeKey: knowledge.typeKey,
    required: Boolean(knowledge.required),
    medium: knowledge.medium,
    domains: knowledge.domains || [],
    intensity: knowledge.intensity || {},
    suitableFor: knowledge.suitableFor || [],
    lessSuitableFor: knowledge.lessSuitableFor || [],
    careerDirections: knowledge.careerDirections || [],
    studyFocus: knowledge.studyFocus || [],
    riskWarnings: knowledge.riskWarnings || [],
    advisorSummary: knowledge.advisorSummary || '',
    evidenceSummary: knowledge.evidenceSummary || '',
    confidence: knowledge.confidence || '',
    reviewStatus: knowledge.reviewStatus || ''
  };
}

function buildDeepSeekCoursePrompt({ profile, course, programmeCourses, courseKnowledge, programmeCourseKnowledge = [], retrievalRules = [], localResult }) {
  return JSON.stringify({
    task: 'Generate a personalized course-selection answer.',
    outputShape: OUTPUT_SHAPE,
    studentProfile: profile,
    currentCourse: safeCourse(course),
    sameProgrammeCourses: programmeCourses.map(safeCourse),
    currentCourseAdvisorKnowledge: safeKnowledge(courseKnowledge),
    sameProgrammeAdvisorKnowledge: programmeCourseKnowledge.map(safeKnowledge).filter(Boolean),
    retrievalRules,
    localRuleBasedDraft: localResult
  }, null, 2);
}

function parseJsonContent(content) {
  const text = String(content || '').trim();
  try {
    return JSON.parse(text);
  } catch {
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start >= 0 && end > start) return JSON.parse(text.slice(start, end + 1));
    throw new Error('DeepSeek did not return valid JSON.');
  }
}

function normalizeAdvisorOutput(output, localResult) {
  const next = {
    ...localResult,
    ...(output && typeof output === 'object' ? output : {}),
    source: 'deepseek',
    disclaimer: COURSE_ADVISOR_DISCLAIMER
  };
  next.keyReasons = unique(Array.isArray(next.keyReasons) ? next.keyReasons : localResult.keyReasons).slice(0, 6);
  next.recommendedFocus = unique(Array.isArray(next.recommendedFocus) ? next.recommendedFocus : localResult.recommendedFocus).slice(0, 6);
  next.careerConnection = unique(Array.isArray(next.careerConnection) ? next.careerConnection : localResult.careerConnection).slice(0, 6);
  next.suggestedCourseCombination = unique(Array.isArray(next.suggestedCourseCombination) ? next.suggestedCourseCombination : localResult.suggestedCourseCombination).slice(0, 6);
  next.nextQuestionPrompts = unique(Array.isArray(next.nextQuestionPrompts) ? next.nextQuestionPrompts : localResult.nextQuestionPrompts).slice(0, 4);
  if (!['required', 'high', 'medium', 'low'].includes(next.fitLevel)) next.fitLevel = localResult.fitLevel;
  next.fitScore = Number.isFinite(Number(next.fitScore)) ? Math.max(0, Math.min(100, Number(next.fitScore))) : localResult.fitScore;
  return next;
}

export async function callDeepSeekCourseAdvisor({ apiKey, baseUrl, model, profile, course, programmeCourses, courseKnowledge = null, programmeCourseKnowledge = [], retrievalRules = [], localResult }) {
  if (!apiKey) return localResult;
  const endpoint = `${String(baseUrl || 'https://api.deepseek.com').replace(/\/$/, '')}/chat/completions`;
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: model || 'deepseek-v4-flash',
      thinking: { type: 'disabled' },
      messages: [
        { role: 'system', content: COURSE_ADVISOR_SYSTEM_PROMPT },
        { role: 'user', content: buildDeepSeekCoursePrompt({ profile, course, programmeCourses, courseKnowledge, programmeCourseKnowledge, retrievalRules, localResult }) }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.25,
      max_tokens: 3000,
      stream: false
    })
  });
  const text = await response.text();
  const payload = text ? JSON.parse(text) : {};
  if (!response.ok) return { ...localResult, source: 'local-rules', modelNote: payload?.error?.message || `DeepSeek API error: ${response.status}` };
  const content = payload?.choices?.[0]?.message?.content;
  if (!content) return localResult;
  return normalizeAdvisorOutput(parseJsonContent(content), localResult);
}
