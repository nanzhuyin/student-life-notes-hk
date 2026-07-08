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

function programmeRow(item) {
  return {
    id: item.id,
    school_id: item.schoolId,
    school: item.school,
    faculty: item.faculty,
    unit_name: item.unitName,
    unit_label: item.unitLabel,
    title: item.title,
    title_en: item.titleEn,
    medium: item.medium,
    study_modes: item.studyModes || [],
    course_count: item.courseCount || 0,
    requirements: item.requirements || {},
    source_url: item.sourceUrl,
    checked_at: item.checkedAt,
    source_coverage: item.sourceCoverage,
    source_urls: item.sourceUrls || [],
    official_summary: item.officialSummary,
    official_career_evidence: item.officialCareerEvidence || [],
    official_learning_evidence: item.officialLearningEvidence || [],
    domains: item.domains || [],
    intensity: item.intensity || {},
    advisor_tags: item.advisorTags || [],
    suitable_for: item.suitableFor || [],
    suitable_student_profiles: item.suitableStudentProfiles || item.suitableFor || [],
    less_suitable_for: item.lessSuitableFor || [],
    not_recommended_for: item.notRecommendedFor || item.lessSuitableFor || [],
    career_directions: item.careerDirections || [],
    study_focus: item.studyFocus || [],
    risk_warnings: item.riskWarnings || [],
    advisor_summary: item.advisorSummary,
    retrieval_keywords: item.retrievalKeywords || [],
    confidence: item.confidence,
    review_status: item.reviewStatus,
    updated_at: new Date().toISOString()
  };
}

function courseRow(item) {
  return {
    id: item.id,
    base_id: item.baseId,
    school_id: item.schoolId,
    programme_id: item.programmeId,
    programme_title: item.programmeTitle,
    programme_title_en: item.programmeTitleEn,
    faculty: item.faculty,
    unit_name: item.unitName,
    title: item.title,
    title_zh: item.titleZh,
    type_key: item.typeKey,
    type: item.type,
    required: Boolean(item.required),
    credits: item.credits,
    medium: item.medium,
    source_url: item.sourceUrl,
    checked_at: item.checkedAt,
    official_basis: item.officialBasis || [],
    domains: item.domains || [],
    intensity: item.intensity || {},
    suitable_for: item.suitableFor || [],
    less_suitable_for: item.lessSuitableFor || [],
    career_directions: item.careerDirections || [],
    study_focus: item.studyFocus || [],
    learning_gains: item.learningGains || [],
    risk_warnings: item.riskWarnings || [],
    advisor_summary: item.advisorSummary,
    retrieval_keywords: item.retrievalKeywords || [],
    evidence_summary: item.evidenceSummary,
    confidence: item.confidence,
    review_status: item.reviewStatus,
    updated_at: new Date().toISOString()
  };
}

function ruleRow(item) {
  return {
    id: item.id,
    priority: item.priority || 0,
    rule: item.rule,
    enabled: true,
    updated_at: new Date().toISOString()
  };
}

async function upsertRows({ baseUrl, serviceRoleKey, table, rows }) {
  if (!rows.length) return;
  for (const batch of chunk(rows, BATCH_SIZE)) {
    const response = await fetch(`${baseUrl}/rest/v1/${table}?on_conflict=id`, {
      method: 'POST',
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates'
      },
      body: JSON.stringify(batch)
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
