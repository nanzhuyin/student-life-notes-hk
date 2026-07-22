import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { contentPosts } from '../content/posts.mjs';
import { courseResourcePosts } from '../content/course-posts.mjs';
import { courseSourceIndex } from '../content/course-source-index.mjs';
import { applyPostOverrides } from '../content/post-overrides.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dataDir = join(root, 'public', 'data');
const platformPath = join(root, 'server', 'data', 'platformData.json');
const staticPlatformPath = join(dataDir, 'platform-data.json');
const version = 'v1.84';

let platformText;
try {
  platformText = await readFile(platformPath, 'utf8');
} catch (error) {
  if (error?.code !== 'ENOENT') throw error;
  platformText = await readFile(staticPlatformPath, 'utf8');
}

const platform = JSON.parse(platformText);
const postsById = new Map((platform.sharedPosts || []).map((post) => [post.id, applyPostOverrides(post)]));
for (const post of contentPosts) postsById.set(post.id, applyPostOverrides(post));

const staticPlatform = {
  ...platform,
  version,
  generatedAt: new Date().toISOString(),
  sharedPosts: Array.from(postsById.values())
};

const staticSources = courseSourceIndex.map((source) => ({ ...source }));

const manifest = {
  version,
  generatedAt: staticPlatform.generatedAt,
  schools: staticPlatform.schools.length,
  programmes: staticPlatform.programmes.length,
  courses: staticPlatform.courses.length,
  allPosts: staticPlatform.sharedPosts.length,
  updatedPosts: contentPosts.length,
  courseAnalysisPosts: courseResourcePosts.length,
  courseSources: staticSources.length,
  archivedCourseScreenshots: 0
};

await mkdir(dataDir, { recursive: true });
await writeFile(join(dataDir, 'platform-data.json'), JSON.stringify(staticPlatform), 'utf8');
await writeFile(join(dataDir, 'course-sources.json'), JSON.stringify(staticSources), 'utf8');
await writeFile(join(dataDir, 'content-manifest.json'), JSON.stringify(manifest, null, 2), 'utf8');

const sectionLabels = {
  courses: '课程资源',
  housing: '租房',
  commute: '通勤',
  'new-student': '新生办理',
  food: '附近美食',
  travel: '玩乐攻略'
};
const lifePosts = contentPosts.filter((post) => post.sectionId !== 'courses');
const lines = [
  '# Otter v1.84 内容验收清单',
  '',
  `生成时间：${manifest.generatedAt}`,
  '',
  '## 本次更新总量',
  '',
  `- [ ] 静态数据包：${manifest.schools} 所学校、${manifest.programmes} 个项目、${manifest.courses} 门课程`,
  `- [ ] 本次整理帖子：${manifest.updatedPosts} 篇（生活攻略 ${lifePosts.length} 篇、课程分析 ${courseResourcePosts.length} 篇）`,
  `- [ ] 课程来源索引：${manifest.courseSources} 条（其中 ${manifest.archivedCourseScreenshots} 条附归档截图）`,
  `- [ ] 网站全部可见帖子：${manifest.allPosts} 篇（含原系统既有内容）`,
  '',
  '> 验收方式：本地网站中按“所在栏目”和“对应专业”进入；每验收一项，将 `[ ]` 改成 `[x]`。课程来源中的“课程相关线索”只展示标题与原帖入口，不参与公开课程结论。',
  '',
  '> 第三方资料说明：课程经验只保留来源标题、核验状态和原帖入口；网站不再公开展示社交平台归档截图。',
  '',
  '## A. 生活攻略与原创流程图',
  ''
];

for (const [index, post] of lifePosts.entries()) {
  lines.push(`${index + 1}. [ ] **${post.title}**`);
  lines.push(`   - 栏目：${sectionLabels[post.sectionId] || post.sectionId}`);
  lines.push(`   - 学校范围：${post.schoolId === 'shared' ? '两校通用' : post.schoolId}`);
  lines.push(`   - 图片：${post.imageUrls?.length || 0} 张`);
  lines.push(`   - 帖子 ID：\`${post.id}\``);
  lines.push('');
}

lines.push('## B. 已改写课程分析', '');
for (const [index, post] of courseResourcePosts.entries()) {
  lines.push(`${index + 1}. [ ] **${post.title}**`);
  lines.push(`   - 学校：${post.schoolId === 'eduhk' ? 'EdUHK' : 'LU'}`);
  lines.push(`   - 对应专业：${post.metadata?.programmeName || ''}`);
  lines.push(`   - 帖子 ID：\`${post.id}\``);
  lines.push('');
}

lines.push('## C. 100 条课程帖子来源', '');
for (const schoolId of ['eduhk', 'lingnan']) {
  const schoolSources = staticSources.filter((source) => source.schoolId === schoolId);
  lines.push(`### ${schoolId === 'eduhk' ? 'EdUHK 香港教育大学' : 'LU 岭南大学'}（${schoolSources.length} 条）`, '');
  for (const [index, source] of schoolSources.entries()) {
    lines.push(`${index + 1}. [ ] [${source.title}](${source.url})`);
    lines.push(`   - 专业：${source.programmeName}${source.abbreviation ? ` [${source.abbreviation}]` : ''}`);
    lines.push(`   - 状态：${source.reviewStatus}；仅保留原帖入口`);
    lines.push(`   - 主题：${source.topic}`);
    lines.push('');
  }
}

lines.push(
  '## D. 未作为独立帖子上传的文件',
  '',
  '- Word/PDF 多轮渲染页：属于同一文档的排版检查副本，不重复作为帖子。',
  '- 搜索结果页：仅保留在原始资料库作检索凭证，不当作内容结论。',
  '- 页面文本、帖子记录 JSON、项目资料 JSON 与课程清单 CSV/JSON：已用于生成课程分析、课程库和来源索引，不直接暴露本机路径。',
  '- 原始资料不随网站发布；网站只展示经分类、核验和重新绘制的原创流程图。',
  ''
);

await writeFile(join(root, 'CONTENT_ACCEPTANCE_CHECKLIST.md'), lines.join('\n'), 'utf8');
console.log(JSON.stringify(manifest, null, 2));
