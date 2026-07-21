import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const defaultInput = resolve(repoRoot, '..', '..', '港硕资料', '港硕-EdUHK与LU硕士课程资源', '00-总索引', '100篇课程帖子整理.json');
const inputFile = process.env.COURSE_RESEARCH_INDEX_FILE || defaultInput;
const outputFile = join(repoRoot, 'content', 'course-source-index.mjs');
const source = JSON.parse((await readFile(inputFile, 'utf8')).replace(/^\uFEFF/, ''));

const rows = source.posts.map((post) => ({
  id: `xiaohongshu-${post.postId}`,
  postId: post.postId,
  schoolId: post.school === 'EdUHK' ? 'eduhk' : 'lingnan',
  programmeId: post.projectId,
  programmeName: post.programmeNameZh,
  abbreviation: post.abbreviation,
  title: post.title,
  url: post.url,
  topic: post.topic,
  reviewStatus: post.reviewStatus,
  quality: post.quality,
  publicUse: post.publicUse,
  placement: post.placement || 'programme'
}));

const output = `export const courseSourceIndex = ${JSON.stringify(rows, null, 2)};\n`;
await writeFile(outputFile, output, 'utf8');
console.log(`Wrote ${rows.length} course source records to ${outputFile}`);
