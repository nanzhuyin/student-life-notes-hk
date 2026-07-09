import { readFile } from 'node:fs/promises';

const DATA_PATH = process.env.ADVISOR_KNOWLEDGE_JSON_FILE || 'src/data/advisorKnowledge.json';
const BATCH_SIZE = Number(process.env.SUPABASE_IMPORT_BATCH_SIZE || 200);

function validateSupabaseProjectUrl(value) {
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error('SUPABASE_URL must be a valid URL, for example https://YOUR_PROJECT.supabase.co');
  }
  if (!parsed.hostname.endsWith('.supabase.co')) {
    throw new Error('SUPABASE_URL must be the Supabase Project URL, for example https://YOUR_PROJECT.supabase.co');
  }
  return `${parsed.protocol}//${parsed.hostname}`;
}

function chunk(items, size) {
  const batches = [];
  for (let index = 0; index < items.length; index += size) batches.push(items.slice(index, index + size));
  return batches;
}

function text(value) {
  return value === null || value === undefined ? '' : String(value);
}

function nullableNumber(value) {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function arrayValue(value) {
  return Array.isArray(value) ? value : [];
}

function objectValue(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function normalizeRowsForPostgrest(rows) {
  const keys = Array.from(new Set(rows.flatMap((row) => Object.keys(row))));
  return rows.map((row) => Object.fromEntries(keys.map((key) => [key, row[key] === undefined ? null : row[key]])));
}

function programmeRow(item) {
  return {
    id: text(item.id),
    school_id: text(item.schoolId),
    school: text(item.school),
    faculty: text(item.faculty),
    unit_name: text(item.unitName),
    unit_label: text(item.unitLabel),
    title: text(item.title),
    title_en: text(item.titleEn),
    medium: text(item.medium),
    study_modes: arrayValue(item.studyModes),
    course_count: Number(item.courseCount || 0),
    requirements: objectValue(item.requirements),
    source_url: text(item.sourceUrl),
    checked_at: text(item.checkedAt),
    source_coverage: text(item.sourceCoverage),
    source_urls: arrayValue(item.sourceUrls),
    official_summary: text(item.officialSummary),
    official_career_evidence: arrayValue(item.officialCareerEvidence),
    official_learning_evidence: arrayValue(item.officialLearningEvidence),
    domains: arrayValue(item.domains),
    intensity: objectValue(item.intensity),
    advisor_tags: arrayValue(item.advisorTags),
    suitable_for: arrayValue(item.suitableFor),
    suitable_student_profiles: arrayValue(item.suitableStudentProfiles || item.suitableFor),
    less_suitable_for: arrayValue(item.lessSuitableFor),
    not_recommended_for: arrayValue(item.notRecommendedFor || item.lessSuitableFor),
    career_directions: arrayValue(item.careerDirections),
    study_focus: arrayValue(item.studyFocus),
    risk_warnings: arrayValue(item.riskWarnings),
    advisor_summary: text(item.advisorSummary),
    retrieval_keywords: arrayValue(item.retrievalKeywords),
    confidence: text(item.confidence),
    review_status: text(item.reviewStatus),
    updated_at: new Date().toISOString()
  };
}

function courseRow(item) {
  return {
    id: text(item.id),
    base_id: text(item.baseId),
    school_id: text(item.schoolId),
    programme_id: text(item.programmeId),
    programme_title: text(item.programmeTitle),
    programme_title_en: text(item.programmeTitleEn),
    faculty: text(item.faculty),
    unit_name: text(item.unitName),
    title: text(item.title),
    title_zh: text(item.titleZh),
    type_key: text(item.typeKey),
    type: text(item.type),
    required: Boolean(item.required),
    credits: nullableNumber(item.credits),
    medium: text(item.medium),
    source_url: text(item.sourceUrl),
    checked_at: text(item.checkedAt),
    official_basis: arrayValue(item.officialBasis),
    domains: arrayValue(item.domains),
    intensity: objectValue(item.intensity),
    suitable_for: arrayValue(item.suitableFor),
    less_suitable_for: arrayValue(item.lessSuitableFor),
    career_directions: arrayValue(item.careerDirections),
    study_focus: arrayValue(item.studyFocus),
    learning_gains: arrayValue(item.learningGains),
    risk_warnings: arrayValue(item.riskWarnings),
    advisor_summary: text(item.advisorSummary),
    retrieval_keywords: arrayValue(item.retrievalKeywords),
    evidence_summary: text(item.evidenceSummary),
    confidence: text(item.confidence),
    review_status: text(item.reviewStatus),
    updated_at: new Date().toISOString()
  };
}

function ruleRow(item) {
  return {
    id: text(item.id),
    priority: Number(item.priority || 0),
    rule: text(item.rule),
    enabled: true,
    updated_at: new Date().toISOString()
  };
}

async function upsertRows({ baseUrl, serviceRoleKey, table, rows }) {
  if (!rows.length) return;
  for (const batch of chunk(rows, BATCH_SIZE)) {
    const normalizedBatch = normalizeRowsForPostgrest(batch);
    const response = await fetch(`${baseUrl}/rest/v1/${table}?on_conflict=id`, {
      method: 'POST',
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates'
      },
      body: JSON.stringify(normalizedBatch)
    });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Failed to import ${table}: ${response.status} ${text}`);
    }
  }
}

async function main() {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.');
  }
  const baseUrl = validateSupabaseProjectUrl(process.env.SUPABASE_URL);
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const knowledge = JSON.parse(await readFile(DATA_PATH, 'utf8'));

  const programmeRows = (knowledge.programmeKnowledge || []).map(programmeRow);
  const courseRows = (knowledge.courseKnowledge || []).map(courseRow);
  const ruleRows = (knowledge.retrievalRules || []).map(ruleRow);

  await upsertRows({ baseUrl, serviceRoleKey, table: 'advisor_programmes', rows: programmeRows });
  await upsertRows({ baseUrl, serviceRoleKey, table: 'advisor_courses', rows: courseRows });
  await upsertRows({ baseUrl, serviceRoleKey, table: 'advisor_rules', rows: ruleRows });

  console.log(`Imported advisor programmes: ${programmeRows.length}`);
  console.log(`Imported advisor courses: ${courseRows.length}`);
  console.log(`Imported advisor rules: ${ruleRows.length}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
