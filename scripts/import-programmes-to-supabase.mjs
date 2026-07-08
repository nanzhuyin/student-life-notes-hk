import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createStorage } from '../server/storage.mjs';

const DATA_PATH = process.env.PROGRAMMES_JSON_FILE || 'src/data/programmes.json';

function validateSupabaseProjectUrl(value) {
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error('SUPABASE_URL must be a valid URL, for example https://YOUR_PROJECT.supabase.co');
  }
  const pathname = parsed.pathname.replace(/\/$/, '');
  if (!parsed.hostname.endsWith('.supabase.co')) {
    throw new Error('SUPABASE_URL must be the Supabase Project URL from Project Settings > Data API, for example https://YOUR_PROJECT.supabase.co. Do not use the dashboard URL.');
  }
  if (pathname && pathname !== '/rest/v1') {
    throw new Error('SUPABASE_URL should not include a table path or dashboard path. Use only https://YOUR_PROJECT.supabase.co');
  }
  return value;
}

async function main() {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.');
  }
  const supabaseUrl = validateSupabaseProjectUrl(process.env.SUPABASE_URL);
  const programmes = JSON.parse(await readFile(DATA_PATH, 'utf8'));
  const storage = createStorage({
    dbFile: join('server', 'data', 'app-data.json'),
    supabaseUrl,
    supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY
  });
  const saved = await storage.upsertProgrammes(programmes);
  const withCourseNamesOrStructure = saved.filter((programme) =>
    (programme.coreCourses || []).length > 0 ||
    (programme.courseDescriptions || []).length > 0 ||
    (programme.importantCourses || []).length > 0
  ).length;
  const withCourseDescriptionRows = saved.filter((programme) => (programme.courseDescriptions || []).length > 0).length;
  const withDetailedCourseDescriptions = saved.filter((programme) =>
    (programme.courseDescriptions || []).some((course) => String(course.description || '').trim())
  ).length;
  console.log(`Imported ${saved.length} programmes into Supabase.`);
  console.log(`With course names or programme structure: ${withCourseNamesOrStructure}`);
  console.log(`Without any course names or programme structure: ${saved.length - withCourseNamesOrStructure}`);
  console.log(`With course description rows: ${withCourseDescriptionRows}`);
  console.log(`With detailed non-empty course descriptions: ${withDetailedCourseDescriptions}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
