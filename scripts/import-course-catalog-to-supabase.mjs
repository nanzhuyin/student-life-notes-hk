import { readFile } from 'node:fs/promises';
import { filterKnownNonCourses, KNOWN_NON_COURSE_IDS } from '../shared/course-data-quality.mjs';

const DATA_PATH = process.env.PLATFORM_DATA_JSON_FILE || 'public/data/platform-data.json';
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

function arrayOfStrings(value) {
  return Array.isArray(value) ? value.map((item) => String(item).trim()).filter(Boolean) : [];
}

function nullableNumber(value) {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function objectOrEmpty(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function schoolRow(item, source) {
  return {
    id: String(item.id || ''),
    short_name: String(item.shortName || ''),
    name: String(item.name || ''),
    name_en: String(item.nameEn || ''),
    accent: String(item.accent || ''),
    description: String(item.description || ''),
    source_version: String(source.version || ''),
    generated_at: String(source.generatedAt || ''),
    updated_at: new Date().toISOString()
  };
}

function programmeRow(item) {
  return {
    id: String(item.id || ''),
    school_id: String(item.schoolId || ''),
    school: String(item.school || ''),
    faculty: String(item.faculty || ''),
    unit_name: String(item.unitName || ''),
    unit_type: String(item.unitType || ''),
    unit_label: String(item.unitLabel || ''),
    parent_unit: String(item.parentUnit || ''),
    unit_note: String(item.unitNote || ''),
    title: String(item.title || ''),
    title_zh: String(item.titleZh || ''),
    title_en: String(item.titleEn || ''),
    translation_note: String(item.translationNote || ''),
    medium: String(item.medium || ''),
    medium_detail: String(item.mediumDetail || ''),
    programme_codes: arrayOfStrings(item.programmeCodes),
    study_modes: arrayOfStrings(item.studyModes),
    total_credits: nullableNumber(item.totalCredits),
    source_url: String(item.sourceUrl || ''),
    checked_at: String(item.checkedAt || ''),
    course_count: Number(item.courseCount || 0),
    data_level: String(item.dataLevel || ''),
    status_badge: String(item.statusBadge || ''),
    status_note: String(item.statusNote || ''),
    requirements: objectOrEmpty(item.requirements),
    updated_at: new Date().toISOString()
  };
}

function courseRow(item) {
  return {
    id: String(item.id || ''),
    base_id: String(item.baseId || ''),
    programme_id: String(item.programmeId || ''),
    programme_title: String(item.programmeTitle || ''),
    school_id: String(item.schoolId || ''),
    school: String(item.school || ''),
    faculty: String(item.faculty || ''),
    unit_name: String(item.unitName || ''),
    unit_type: String(item.unitType || ''),
    unit_label: String(item.unitLabel || ''),
    parent_unit: String(item.parentUnit || ''),
    unit_note: String(item.unitNote || ''),
    title: String(item.title || ''),
    title_zh: String(item.titleZh || ''),
    type: String(item.type || ''),
    type_key: String(item.typeKey || ''),
    credits: nullableNumber(item.credits),
    credits_text: String(item.creditsText || ''),
    required: Boolean(item.required),
    description: String(item.description || ''),
    official_description_en: String(item.officialDescriptionEn || ''),
    official_description_zh: String(item.officialDescriptionZh || ''),
    description_source_url: String(item.descriptionSourceUrl || ''),
    description_source_type: String(item.descriptionSourceType || ''),
    course_guide: objectOrEmpty(item.courseGuide),
    medium: String(item.medium || ''),
    medium_detail: String(item.mediumDetail || ''),
    programme_codes: arrayOfStrings(item.programmeCodes),
    source_url: String(item.sourceUrl || ''),
    checked_at: String(item.checkedAt || ''),
    semester: String(item.semester || ''),
    prerequisites: String(item.prerequisites || ''),
    course_code: String(item.courseCode || ''),
    tags: arrayOfStrings(item.tags),
    notes: String(item.notes || ''),
    learner_fit: arrayOfStrings(item.learnerFit),
    learning_gains: arrayOfStrings(item.learningGains),
    career_links: arrayOfStrings(item.careerLinks),
    selection_advice: String(item.selectionAdvice || ''),
    perspective_summary: String(item.perspectiveSummary || ''),
    background_perspectives: Array.isArray(item.backgroundPerspectives) ? item.backgroundPerspectives : [],
    strategy_focus: arrayOfStrings(item.strategyFocus),
    material_basis: arrayOfStrings(item.materialBasis),
    updated_at: new Date().toISOString()
  };
}

async function upsertRows({ baseUrl, serviceRoleKey, table, rows }) {
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

async function deleteRowsByIds({ baseUrl, serviceRoleKey, table, ids }) {
  if (!ids.length) return;
  const response = await fetch(`${baseUrl}/rest/v1/${table}?id=in.(${ids.map(encodeURIComponent).join(',')})`, {
    method: 'DELETE',
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`
    }
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to remove invalid rows from ${table}: ${response.status} ${text}`);
  }
}

async function main() {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.');
  }
  const baseUrl = validateSupabaseProjectUrl(process.env.SUPABASE_URL);
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const platformData = JSON.parse(await readFile(DATA_PATH, 'utf8'));

  const schoolRows = (platformData.schools || []).map((item) => schoolRow(item, platformData)).filter((row) => row.id && row.name);
  const programmeRows = (platformData.programmes || []).map(programmeRow).filter((row) => row.id && row.school_id && row.title);
  const cleanCourses = filterKnownNonCourses(platformData.courses || []);
  const courseRows = cleanCourses.map(courseRow).filter((row) => row.id && row.programme_id && row.school_id && row.title);

  await upsertRows({ baseUrl, serviceRoleKey, table: 'platform_schools', rows: schoolRows });
  await upsertRows({ baseUrl, serviceRoleKey, table: 'course_programmes', rows: programmeRows });
  await upsertRows({ baseUrl, serviceRoleKey, table: 'course_catalog_courses', rows: courseRows });
  await deleteRowsByIds({ baseUrl, serviceRoleKey, table: 'course_catalog_courses', ids: KNOWN_NON_COURSE_IDS });

  console.log(`Imported platform schools: ${schoolRows.length}`);
  console.log(`Imported course programmes: ${programmeRows.length}`);
  console.log(`Imported course catalog courses: ${courseRows.length}`);
  console.log(`Removed known non-course navigation records: ${KNOWN_NON_COURSE_IDS.length}`);
  console.log(`Courses with descriptions: ${courseRows.filter((row) => row.description).length}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
