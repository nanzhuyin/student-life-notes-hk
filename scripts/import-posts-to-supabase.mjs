import { readFile } from 'node:fs/promises';
import { contentPosts } from '../content/posts.mjs';

const DATA_PATH = process.env.PLATFORM_DATA_JSON_FILE || '';
const BATCH_SIZE = Number(process.env.SUPABASE_IMPORT_BATCH_SIZE || 100);

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

function normalizeDate(value) {
  const date = value ? new Date(value) : new Date();
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
}

function normalizeSchoolId(value) {
  return ['eduhk', 'lingnan', 'shared'].includes(value) ? value : 'shared';
}

function postRow(post) {
  const schoolId = normalizeSchoolId(post.schoolId);
  const createdAt = normalizeDate(post.createdAt);
  return {
    id: String(post.id),
    section_id: String(post.sectionId || ''),
    title: String(post.title || ''),
    summary: String(post.summary || ''),
    content: String(post.content || ''),
    tags: Array.isArray(post.tags) ? post.tags.map(String).filter(Boolean) : [],
    region: String(post.region || ''),
    source: String(post.source || ''),
    author_role: String(post.authorRole || '管理员'),
    status: ['published', 'draft', 'deleted', 'archived'].includes(post.status) ? post.status : 'published',
    shared: Boolean(post.shared ?? schoolId === 'shared'),
    recommended: Boolean(post.recommended),
    pinned: Boolean(post.pinned),
    owner_id: String(post.ownerId || ''),
    school_id: schoolId,
    image_urls: Array.isArray(post.imageUrls) ? post.imageUrls.map(String).filter(Boolean) : [],
    metadata: post.metadata && typeof post.metadata === 'object' && !Array.isArray(post.metadata) ? post.metadata : {},
    created_at: createdAt,
    updated_at: normalizeDate(post.updatedAt || createdAt)
  };
}

async function upsertRows({ baseUrl, serviceRoleKey, rows }) {
  for (const batch of chunk(rows, BATCH_SIZE)) {
    const response = await fetch(`${baseUrl}/rest/v1/otter_posts?on_conflict=id`, {
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
      throw new Error(`Failed to import otter_posts: ${response.status} ${text}`);
    }
  }
}

async function main() {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.');
  }
  const baseUrl = validateSupabaseProjectUrl(process.env.SUPABASE_URL);
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const platformData = DATA_PATH ? JSON.parse(await readFile(DATA_PATH, 'utf8')) : null;
  const legacyPosts = platformData
    ? (Array.isArray(platformData) ? platformData : platformData.sharedPosts || platformData.posts || [])
    : [];
  const postsById = new Map(contentPosts.map((post) => [post.id, post]));
  for (const post of legacyPosts) postsById.set(post.id, post);
  const sourcePosts = Array.from(postsById.values());
  const rows = sourcePosts
    .map(postRow)
    .filter((row) => row.id && row.section_id && row.title && row.content);

  await upsertRows({ baseUrl, serviceRoleKey, rows });

  console.log(`Imported ${rows.length} posts into Supabase.`);
  console.log(`Pinned posts: ${rows.filter((row) => row.pinned).length}`);
  console.log(`Recommended posts: ${rows.filter((row) => row.recommended).length}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
