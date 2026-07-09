import { spawn } from 'node:child_process';

const tasks = [
  ['import-posts-to-supabase.mjs', 'life posts'],
  ['import-course-catalog-to-supabase.mjs', 'course catalogue'],
  ['import-programmes-to-supabase.mjs', 'programme recommender knowledge base'],
  ['import-advisor-knowledge-to-supabase.mjs', 'course advisor knowledge base']
];

function runTask([script, label]) {
  return new Promise((resolve, reject) => {
    console.log(`\n=== Importing ${label} ===`);
    const child = spawn(process.execPath, [`scripts/${script}`], {
      stdio: 'inherit',
      env: process.env
    });
    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${label} import failed with exit code ${code}`));
    });
  });
}

async function main() {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.');
  }
  for (const task of tasks) await runTask(task);
  console.log('\nAll backend data imports completed.');
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
