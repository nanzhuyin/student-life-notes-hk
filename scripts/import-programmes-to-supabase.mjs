import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createStorage } from '../server/storage.mjs';

const DATA_PATH = process.env.PROGRAMMES_JSON_FILE || 'src/data/programmes.json';

async function main() {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.');
  }
  const programmes = JSON.parse(await readFile(DATA_PATH, 'utf8'));
  const storage = createStorage({
    dbFile: join('server', 'data', 'app-data.json'),
    supabaseUrl: process.env.SUPABASE_URL,
    supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY
  });
  const saved = await storage.upsertProgrammes(programmes);
  const withCourses = saved.filter((programme) => (programme.courseDescriptions || []).length > 0).length;
  console.log(`Imported ${saved.length} programmes into Supabase.`);
  console.log(`With course information: ${withCourses}`);
  console.log(`Without course information: ${saved.length - withCourses}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
