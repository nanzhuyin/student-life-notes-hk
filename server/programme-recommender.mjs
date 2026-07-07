export const RECOMMENDATION_DISCLAIMER = 'This recommendation is for reference only. Please refer to official programme websites for final information.';

export const DEEPSEEK_SYSTEM_PROMPT = `You are an education programme recommendation assistant.

You recommend academic programmes only based on the provided programme knowledge base.

Rules:
1. You must not invent programme names, course names, admission requirements, tuition fees, rankings, scholarships, or official claims.
2. You must use only the provided candidate programme data.
3. You must explain why each recommended programme matches the student's background.
4. You must identify the most important courses within each recommended programme for this specific student.
5. You must explain why those courses matter to the student.
6. You must provide preparation advice for important courses.
7. You must only mention courses that exist in the provided candidate programme data.
8. If course information is insufficient, clearly state that the official course information is insufficient.
9. You must not guarantee admission.
10. You must not present the result as official university advice.
11. The recommendation is for reference only, and final decisions should be based on official programme websites.
12. Output valid JSON only.`;

const OUTPUT_SHAPE = {
  summary: 'string',
  recommendations: [
    {
      programmeId: 'string',
      programmeName: 'string',
      matchScore: 0,
      matchLevel: 'high | medium | low',
      whyRecommended: ['string'],
      backgroundMatch: {
        matchedMajor: 'string',
        matchedCourses: ['string'],
        matchedSkills: ['string'],
        matchedInterests: ['string'],
        matchedCareerGoals: ['string'],
        explanation: 'string'
      },
      importantCoursesForThisStudent: [
        {
          courseName: 'string',
          courseType: 'core | elective | foundation | project | unknown',
          importance: 'high | medium | low',
          whyThisCourseMatters: 'string',
          relatedToUserInput: ['string'],
          studentPreparationAdvice: ['string'],
          sourceUrl: 'string'
        }
      ],
      potentialGaps: ['string'],
      suggestedPreparations: ['string'],
      careerFit: ['string'],
      sourceUrl: 'string'
    }
  ],
  notRecommended: [
    {
      programmeId: 'string',
      programmeName: 'string',
      reason: 'string'
    }
  ],
  informationLimits: ['string'],
  disclaimer: RECOMMENDATION_DISCLAIMER
};

function normalizeTerm(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9\u4e00-\u9fff]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenize(value) {
  return normalizeTerm(value).split(' ').filter((part) => part.length >= 2);
}

function unique(values) {
  return Array.from(new Set(values.map((value) => String(value || '').trim()).filter(Boolean)));
}

function trimString(value, max = 240) {
  return String(value || '').trim().slice(0, max);
}

function trimList(value, maxItems = 20, maxLength = 120) {
  return unique(Array.isArray(value) ? value.map((item) => trimString(item, maxLength)) : []).slice(0, maxItems);
}

function fieldContainsAny(values, terms) {
  const normalizedValues = values.map(normalizeTerm).filter(Boolean);
  const matches = new Set();
  for (const term of terms) {
    const normalizedTerm = normalizeTerm(term);
    if (!normalizedTerm) continue;
    const termTokens = tokenize(normalizedTerm);
    const hasMatch = normalizedValues.some((value) => {
      if (value.includes(normalizedTerm)) return true;
      if (!termTokens.length) return false;
      const matchedTokenCount = termTokens.filter((token) => token.length >= 4 && value.includes(token)).length;
      return matchedTokenCount >= Math.max(1, Math.ceil(termTokens.length * 0.5));
    });
    if (hasMatch) matches.add(term);
  }
  return Array.from(matches);
}

function buildWeightedFields(programme) {
  return [
    { field: 'programmeName', weight: 8, values: [programme.programmeName] },
    { field: 'degreeLevel', weight: 6, values: [programme.degreeLevel] },
    { field: 'suitableBackgrounds', weight: 14, values: programme.suitableBackgrounds || [] },
    { field: 'coreCourses', weight: 12, values: programme.coreCourses || [] },
    { field: 'courseDescriptions', weight: 12, values: (programme.courseDescriptions || []).flatMap((course) => [course.courseName, course.description]) },
    { field: 'importantCourses', weight: 12, values: (programme.importantCourses || []).flatMap((course) => [course.courseName, course.whyImportant, ...(course.relatedStudentBackgrounds || []), ...(course.relatedCareerGoals || [])]) },
    { field: 'skillsDeveloped', weight: 9, values: programme.skillsDeveloped || [] },
    { field: 'careerDirections', weight: 13, values: programme.careerDirections || [] },
    { field: 'keywords', weight: 7, values: programme.keywords || [] },
    { field: 'learningObjectives', weight: 7, values: programme.learningObjectives || [] },
    { field: 'summary', weight: 5, values: [programme.summary] },
    { field: 'sourceText', weight: 2, values: [programme.sourceText] }
  ];
}

function safeProgrammeForModel(programme) {
  return {
    id: programme.id,
    programmeName: programme.programmeName,
    degreeLevel: programme.degreeLevel,
    school: programme.school,
    department: programme.department,
    officialUrl: programme.officialUrl,
    summary: programme.summary,
    keywords: programme.keywords || [],
    suitableBackgrounds: programme.suitableBackgrounds || [],
    learningObjectives: programme.learningObjectives || [],
    coreCourses: programme.coreCourses || [],
    courseDescriptions: (programme.courseDescriptions || []).slice(0, 80),
    importantCourses: programme.importantCourses || [],
    skillsDeveloped: programme.skillsDeveloped || [],
    careerDirections: programme.careerDirections || [],
    admissionNotes: programme.admissionNotes,
    informationInsufficient: Boolean(programme.informationInsufficient),
    informationLimits: programme.informationLimits || [],
    sourceUrls: programme.sourceUrls || [programme.officialUrl],
    lastUpdatedAt: programme.lastUpdatedAt
  };
}

export function validateStudentProfile(body) {
  const profile = {
    hasChosenProgramme: Boolean(body.hasChosenProgramme),
    selectedProgrammeId: trimString(body.selectedProgrammeId, 160),
    selectedProgrammeName: trimString(body.selectedProgrammeName, 240),
    undergraduateMajor: trimString(body.undergraduateMajor, 160),
    mainCourses: trimList(body.mainCourses),
    skills: trimList(body.skills),
    interests: trimList(body.interests),
    careerGoals: trimList(body.careerGoals),
    preferredDirections: trimList(body.preferredDirections),
    targetDegreeLevels: trimList(body.targetDegreeLevels, 8),
    studyPreferences: trimList(body.studyPreferences, 12),
    concerns: trimList(body.concerns, 12, 200),
    workExperience: trimList(body.workExperience, 12, 200)
  };
  const totalSignals = [
    profile.selectedProgrammeId,
    profile.selectedProgrammeName,
    profile.undergraduateMajor,
    ...profile.mainCourses,
    ...profile.skills,
    ...profile.interests,
    ...profile.careerGoals,
    ...profile.preferredDirections,
    ...profile.targetDegreeLevels,
    ...profile.studyPreferences,
    ...profile.concerns,
    ...profile.workExperience
  ].filter(Boolean).length;
  if (!totalSignals) throw new RecommendationError('VALIDATION_ERROR', 'Please provide at least one student background field.');
  for (const key of ['mainCourses', 'skills', 'interests', 'careerGoals', 'preferredDirections', 'targetDegreeLevels', 'studyPreferences', 'concerns', 'workExperience']) {
    if (profile[key].length > 20) throw new RecommendationError('VALIDATION_ERROR', `${key} supports up to 20 items.`);
  }
  return profile;
}

function isSelectedProgramme(programme, profile) {
  if (profile.selectedProgrammeId && programme.id === profile.selectedProgrammeId) return true;
  if (profile.selectedProgrammeName && normalizeTerm(programme.programmeName) === normalizeTerm(profile.selectedProgrammeName)) return true;
  return false;
}

export function findProgrammeCandidates(programmes, profile, limit = 5) {
  const terms = {
    selectedProgramme: unique([profile.selectedProgrammeId, profile.selectedProgrammeName]),
    undergraduateMajor: unique([profile.undergraduateMajor]),
    mainCourses: unique(profile.mainCourses),
    skills: unique(profile.skills),
    interests: unique([...(profile.interests || []), ...(profile.preferredDirections || []), ...(profile.studyPreferences || [])]),
    careerGoals: unique(profile.careerGoals),
    targetDegreeLevels: unique(profile.targetDegreeLevels || []),
    concerns: unique(profile.concerns || []),
    workExperience: unique(profile.workExperience || [])
  };
  const allTerms = unique([
    ...terms.selectedProgramme,
    ...terms.undergraduateMajor,
    ...terms.mainCourses,
    ...terms.skills,
    ...terms.interests,
    ...terms.careerGoals,
    ...terms.targetDegreeLevels,
    ...terms.concerns,
    ...terms.workExperience
  ]);

  const ranked = programmes
    .map((programme) => {
      const matchedFields = [];
      let score = 0;
      for (const field of buildWeightedFields(programme)) {
        const fieldTerms =
          field.field === 'programmeName' ? [...terms.selectedProgramme, ...terms.interests, ...terms.careerGoals]
            : field.field === 'degreeLevel' ? terms.targetDegreeLevels
          : field.field === 'suitableBackgrounds' ? terms.undergraduateMajor
            : field.field === 'coreCourses' || field.field === 'courseDescriptions' || field.field === 'importantCourses' ? [...terms.mainCourses, ...terms.undergraduateMajor, ...terms.careerGoals]
              : field.field === 'skillsDeveloped' ? terms.skills
                : field.field === 'careerDirections' ? terms.careerGoals
                  : field.field === 'keywords' || field.field === 'learningObjectives' || field.field === 'summary' ? [...terms.interests, ...terms.careerGoals, ...terms.skills, ...terms.concerns, ...terms.workExperience]
                    : allTerms;
        const matchedTerms = fieldContainsAny(field.values, fieldTerms);
        if (!matchedTerms.length) continue;
        score += field.weight * matchedTerms.length;
        matchedFields.push({ field: field.field, matchedTerms, weight: field.weight });
      }
      if (profile.hasChosenProgramme && isSelectedProgramme(programme, profile)) {
        score += 35;
        matchedFields.push({ field: 'selectedProgramme', matchedTerms: unique([profile.selectedProgrammeId, profile.selectedProgrammeName]), weight: 35 });
      }
      return { programme, score: Math.min(100, Math.round(score)), matchedFields };
    })
    .sort((a, b) => b.score - a.score || String(a.programme.programmeName).localeCompare(String(b.programme.programmeName)))
    .slice(0, limit);

  if (!profile.hasChosenProgramme || !terms.selectedProgramme.length || ranked.some((candidate) => isSelectedProgramme(candidate.programme, profile))) return ranked;
  const selected = programmes.find((programme) => isSelectedProgramme(programme, profile));
  if (!selected) return ranked;
  return ranked.slice(0, Math.max(0, limit - 1)).concat({
    programme: selected,
    score: 35,
    matchedFields: [{ field: 'selectedProgramme', matchedTerms: terms.selectedProgramme, weight: 35 }]
  });
}

export function buildDeepSeekUserPrompt(profile, candidateProgrammes) {
  return `Student background:
- Has chosen programme: ${profile.hasChosenProgramme}
- Selected programme id: ${profile.selectedProgrammeId}
- Selected programme name: ${profile.selectedProgrammeName}
- Undergraduate major: ${profile.undergraduateMajor}
- Main courses: ${JSON.stringify(profile.mainCourses)}
- Skills: ${JSON.stringify(profile.skills)}
- Interests: ${JSON.stringify(profile.interests)}
- Career goals: ${JSON.stringify(profile.careerGoals)}
- Preferred directions: ${JSON.stringify(profile.preferredDirections)}
- Target degree levels: ${JSON.stringify(profile.targetDegreeLevels)}
- Study preferences: ${JSON.stringify(profile.studyPreferences)}
- Concerns: ${JSON.stringify(profile.concerns)}
- Work experience: ${JSON.stringify(profile.workExperience)}

Candidate programmes from knowledge base:
${JSON.stringify(candidateProgrammes.map(safeProgrammeForModel), null, 2)}

Task:
Recommend the most suitable programmes based only on the candidate programme data.
If the student has already chosen a programme and it is present in candidate data, evaluate whether that chosen programme is suitable before comparing alternatives.

For each recommended programme, explain:
1. Why this programme is recommended;
2. How the student's major, courses, skills, interests and career goals match the programme;
3. Which courses in this programme are most important for this student;
4. Why those courses matter;
5. What the student should prepare before entering the programme;
6. What potential gaps the student may have.

Important restrictions:
- Do not invent course names.
- Do not invent programme information.
- If the candidate programme does not include course information, say that course information is insufficient.
- Output valid JSON only.

Required JSON output shape:
${JSON.stringify(OUTPUT_SHAPE, null, 2)}`;
}

export class RecommendationError extends Error {
  constructor(code, message, status = 400) {
    super(message);
    this.name = 'RecommendationError';
    this.code = code;
    this.status = status;
  }
}

function assertArray(value, path) {
  if (!Array.isArray(value)) throw new RecommendationError('MODEL_OUTPUT_INVALID', `Model output field ${path} must be an array.`);
}

function assertString(value, path) {
  if (typeof value !== 'string') throw new RecommendationError('MODEL_OUTPUT_INVALID', `Model output field ${path} must be a string.`);
}

export function validateRecommendationOutput(output, candidates) {
  if (!output || typeof output !== 'object') throw new RecommendationError('MODEL_OUTPUT_INVALID', 'Model output must be a JSON object.');
  assertString(output.summary, 'summary');
  assertArray(output.recommendations, 'recommendations');
  assertArray(output.notRecommended, 'notRecommended');
  assertArray(output.informationLimits, 'informationLimits');
  if (output.disclaimer !== RECOMMENDATION_DISCLAIMER) throw new RecommendationError('MODEL_OUTPUT_INVALID', 'Model output disclaimer is missing or changed.');

  const candidateById = new Map(candidates.map((programme) => [programme.id, programme]));
  const allowedCourseNames = new Map(candidates.map((programme) => [
    programme.id,
    new Set([
      ...(programme.coreCourses || []),
      ...(programme.courseDescriptions || []).map((course) => course.courseName),
      ...(programme.importantCourses || []).map((course) => course.courseName)
    ])
  ]));

  for (const [index, recommendation] of output.recommendations.entries()) {
    assertString(recommendation.programmeId, `recommendations[${index}].programmeId`);
    assertString(recommendation.programmeName, `recommendations[${index}].programmeName`);
    const programme = candidateById.get(recommendation.programmeId);
    if (!programme) throw new RecommendationError('MODEL_OUTPUT_INVALID', `Model recommended programme outside retrieved candidates: ${recommendation.programmeId}`);
    if (recommendation.programmeName !== programme.programmeName) throw new RecommendationError('MODEL_OUTPUT_INVALID', `Model changed programme name for ${recommendation.programmeId}`);
    if (!Number.isFinite(Number(recommendation.matchScore)) || recommendation.matchScore < 0 || recommendation.matchScore > 100) throw new RecommendationError('MODEL_OUTPUT_INVALID', 'matchScore must be 0-100.');
    if (!['high', 'medium', 'low'].includes(recommendation.matchLevel)) throw new RecommendationError('MODEL_OUTPUT_INVALID', 'matchLevel must be high, medium, or low.');
    assertArray(recommendation.whyRecommended, `recommendations[${index}].whyRecommended`);
    assertArray(recommendation.importantCoursesForThisStudent, `recommendations[${index}].importantCoursesForThisStudent`);
    if (programme.informationInsufficient && !(programme.importantCourses || []).length && recommendation.importantCoursesForThisStudent.length) {
      throw new RecommendationError('MODEL_OUTPUT_INVALID', `Model invented courses for information-insufficient programme: ${programme.programmeName}`);
    }
    for (const course of recommendation.importantCoursesForThisStudent) {
      assertString(course.courseName, `recommendations[${index}].importantCoursesForThisStudent.courseName`);
      if (!allowedCourseNames.get(programme.id)?.has(course.courseName)) {
        throw new RecommendationError('MODEL_OUTPUT_INVALID', `Model mentioned course outside candidate data: ${course.courseName}`);
      }
    }
  }
  return output;
}

function parseModelJsonContent(content) {
  if (content && typeof content === 'object') return content;
  const text = String(content || '').trim();
  try {
    return JSON.parse(text);
  } catch {
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start >= 0 && end > start) return JSON.parse(text.slice(start, end + 1));
    throw new RecommendationError('MODEL_OUTPUT_INVALID', 'DeepSeek did not return valid JSON.');
  }
}

export async function callDeepSeekRecommendation({ apiKey, baseUrl, model, profile, candidates }) {
  if (!apiKey) throw new RecommendationError('MODEL_API_ERROR', 'DEEPSEEK_API_KEY is not configured.', 503);
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
        { role: 'system', content: DEEPSEEK_SYSTEM_PROMPT },
        { role: 'user', content: buildDeepSeekUserPrompt(profile, candidates) }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.2,
      max_tokens: 5000,
      stream: false
    })
  });
  const text = await response.text();
  const payload = text ? JSON.parse(text) : {};
  if (!response.ok) {
    throw new RecommendationError('MODEL_API_ERROR', payload?.error?.message || payload?.message || `DeepSeek API error: ${response.status}`, 502);
  }
  const finishReason = payload?.choices?.[0]?.finish_reason;
  if (finishReason && finishReason !== 'stop') {
    throw new RecommendationError('MODEL_OUTPUT_INVALID', `DeepSeek response did not finish cleanly: ${finishReason}`);
  }
  const content = payload?.choices?.[0]?.message?.content;
  if (!content) throw new RecommendationError('MODEL_OUTPUT_INVALID', 'DeepSeek returned empty content.');
  const output = parseModelJsonContent(content);
  return validateRecommendationOutput(output, candidates);
}
