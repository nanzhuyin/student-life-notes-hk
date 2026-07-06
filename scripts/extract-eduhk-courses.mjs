import { execFileSync } from 'node:child_process';
import fs from 'node:fs';

const DATA_PATH = 'src/data/platformData.json';
const OUT_PATH = 'tmp-eduhk-course-extract.json';

const data = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
const programmes = data.programmes.filter((programme) => programme.schoolId === 'eduhk');

function decodeHtml(value = '') {
  return value
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#039;|&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&rsquo;/gi, "'")
    .replace(/&lsquo;/gi, "'")
    .replace(/&ldquo;|&rdquo;/gi, '"')
    .replace(/&ndash;|&mdash;/gi, '-')
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(Number.parseInt(hex, 16)))
    .replace(/&#([0-9]+);/g, (_, dec) => String.fromCodePoint(Number.parseInt(dec, 10)));
}

function stripTags(value = '') {
  return decodeHtml(value)
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function classifyType(text) {
  const lower = text.toLowerCase();
  if (/elective|選修|选修/.test(lower)) return { type: '选修课', typeKey: 'elective' };
  if (/project|capstone|thesis|dissertation|field attachment|internship|實習|实习|论文|論文/.test(lower)) return { type: '项目课', typeKey: 'project' };
  if (/core|compulsory|required|必修|核心/.test(lower)) return { type: '核心课', typeKey: 'core' };
  return { type: '一般课程', typeKey: 'general' };
}

function cleanCourseTitle(value) {
  return stripTags(value)
    .replace(/^\d+[\).、]\s*/, '')
    .replace(/^[A-Z]{2,6}\d{4,5}\s*[-:：]?\s*/, '')
    .replace(/\s+\d+\s*(cps?|credit points?)$/i, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function looksLikeCourseTitle(value) {
  const title = cleanCourseTitle(value);
  if (!title || title.length < 4 || title.length > 180) return false;
  if (/^(total|total credit points?|credit points?|cps?|course title|courses?|core courses?.*|elective courses?.*|programme structure|curriculum|choose \d.*|year|semester|component|taught courses|course code.*|full-time mode:?|part-time mode:?)$/i.test(title)) return false;
  if (/^(home|about|news|events|contact|application|admission|tuition|scholarship|career|language|medium|hotline:?|fax:?|e-?mail:?|website:?|in person:?|follow us on)$/i.test(title)) return false;
  if (/^(all \d+ core courses.*|\d+\s*cps?|research project)$/i.test(title)) return false;
  return /[A-Za-z\u4e00-\u9fff]/.test(title);
}

function splitCourseList(value) {
  return stripTags(value)
    .split(/\s*(?:,|;| and |及|和|、)\s*/i)
    .map(cleanCourseTitle)
    .filter(looksLikeCourseTitle);
}

function fetchHtml(url) {
  const escaped = url.replace(/'/g, "''");
  const command = [
    '$ProgressPreference="SilentlyContinue";',
    '[Console]::OutputEncoding=[Text.UTF8Encoding]::UTF8;',
    `[Net.ServicePointManager]::SecurityProtocol=[Net.SecurityProtocolType]::Tls12 -bor [Net.SecurityProtocolType]::Tls13;`,
    `$r=Invoke-WebRequest -UseBasicParsing -Uri '${escaped}' -Headers @{'User-Agent'='Mozilla/5.0'} -TimeoutSec 35;`,
    'Write-Output $r.Content'
  ].join(' ');
  try {
    return execFileSync('powershell', ['-NoProfile', '-Command', command], {
      encoding: 'utf8',
      maxBuffer: 30 * 1024 * 1024
    });
  } catch {
    return execFileSync('curl.exe', ['-L', '-A', 'Mozilla/5.0', '--max-time', '35', url], {
      encoding: 'utf8',
      maxBuffer: 30 * 1024 * 1024
    });
  }
}

function candidateUrls(programme) {
  const base = (programme.sourceUrl || '').replace(/#$/, '').replace(/\/$/, '');
  const urls = [programme.sourceUrl];
  if (base.includes('/fhm/') && !base.endsWith('/programme-structure')) urls.push(`${base}/programme-structure`);
  if (base === 'https://www.eduhk.hk/mamp') urls.push('http://www.eduhk.hk/mit/en/mamp');
  if (base === 'https://www.eduhk.hk/mame') urls.push('http://www.eduhk.hk/mame/prog_info.htm');
  return Array.from(new Set(urls.filter(Boolean)));
}

function extractCells(rowHtml) {
  return [...rowHtml.matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)].map((match) => match[1]);
}

function extractLists(html) {
  return [...html.matchAll(/<(?:li|p)[^>]*>([\s\S]*?)<\/(?:li|p)>/gi)].map((match) => stripTags(match[1]));
}

function extractFromTables(html) {
  const results = [];
  let current = { type: '一般课程', typeKey: 'general' };
  const tables = [...html.matchAll(/<table[\s\S]*?<\/table>/gi)].map((match) => match[0]);

  for (const table of tables) {
    if (!/(course|curriculum|credit|cps|核心|必修|選修|选修|課程|课程|PPG|CFE|MSc|MA)/i.test(stripTags(table))) continue;
    const rows = [...table.matchAll(/<tr[\s\S]*?<\/tr>/gi)].map((match) => match[0]);
    for (const row of rows) {
      const cells = extractCells(row);
      if (!cells.length) continue;
      const rowText = stripTags(row);
      const headingRow = /colspan|<strong|<th/i.test(row) && /core courses?|compulsory|required|elective courses?|project|capstone|thesis|dissertation|核心|必修|選修|选修/i.test(rowText);
      if (headingRow) {
        current = classifyType(rowText);
      }

      const listItems = [...row.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)].map((match) => cleanCourseTitle(match[1]));
      for (const item of listItems) {
        if (looksLikeCourseTitle(item)) results.push({ title: item, ...current });
      }

      if (listItems.length) continue;

      const cellTexts = cells.map(stripTags).filter(Boolean);
      const code = cellTexts.find((cell) => /^[A-Z]{2,8}\d{4,5}[A-Z]?$/.test(cell.replace(/\s+/g, '')));
      const creditCell = cellTexts.find((cell) => /^\d+(\.\d+)?$/.test(cell));
      const candidate =
        cellTexts.find((cell) => looksLikeCourseTitle(cell) && !/^[A-Z]{2,8}\d{4,5}[A-Z]?$/.test(cell.replace(/\s+/g, '')) && cell !== creditCell) || '';

      if (looksLikeCourseTitle(candidate)) {
        results.push({ title: cleanCourseTitle(candidate), courseCode: code || '', credits: creditCell ? Number(creditCell) : null, ...current });
      }
    }
  }
  return results;
}

function extractFromCourseComponents(html) {
  const results = [];
  let current = { type: '一般课程', typeKey: 'general' };
  const blocks = [
    ...html.matchAll(/<div[^>]*class="[^"]*programmes__courses__category[^"]*"[^>]*>([\s\S]*?)<\/div>/gi),
    ...html.matchAll(/<h[2-5][^>]*>(?:\s|<[^>]+>)*(Core Courses?|Elective Courses?|Compulsory Courses?|Required Courses?|Project|Thesis|Dissertation|核心课程|必修课程|选修课程|選修課程)(?:\s|<[^>]+>)*<\/h[2-5]>/gi),
    ...html.matchAll(/<div[^>]*class="[^"]*(?:course-category|course_type|course-type)[^"]*"[^>]*>([\s\S]*?)<\/div>/gi)
  ].sort((a, b) => (a.index || 0) - (b.index || 0));
  for (const match of blocks) {
    const index = match.index || 0;
    const heading = stripTags(match[1] || match[0]);
    const nextIndex = blocks.find((candidate) => (candidate.index || 0) > index)?.index || html.length;
    current = classifyType(heading);
    const chunk = html.slice(index, nextIndex);
    const titleMatches = [
      ...chunk.matchAll(/<div[^>]*class="[^"]*programmes__courses__item__title[^"]*"[^>]*>([\s\S]*?)<\/div>/gi),
      ...chunk.matchAll(/<[^>]+class="[^"]*(?:course-title|course_title)[^"]*"[^>]*>([\s\S]*?)<\/[^>]+>/gi)
    ];
    for (const titleMatch of titleMatches) {
      const raw = cleanCourseTitle(titleMatch[1]);
      if (!looksLikeCourseTitle(raw)) continue;
      const code = raw.match(/^([A-Z]{2,8}\d{4,5}[A-Z]?)\s+(.+)$/);
      results.push({
        title: code ? cleanCourseTitle(code[2]) : raw,
        courseCode: code ? code[1] : '',
        credits: null,
        ...current
      });
    }
  }
  return results;
}

function extractFromOverview(html) {
  const text = stripTags(html);
  const results = [];
  const patterns = [
    /(Core Courses?|Compulsory Courses?|Required Courses?)\s*:\s*([^.;]{20,500})/gi,
    /(Elective Courses?)\s*:\s*([^.;]{20,700})/gi,
    /(核心课程|必修课程|核心課程|必修課程)\s*[:：]\s*([^。；]{8,500})/g,
    /(选修课程|選修課程)\s*[:：]\s*([^。；]{8,700})/g
  ];
  for (const pattern of patterns) {
    for (const match of text.matchAll(pattern)) {
      const type = classifyType(match[1]);
      splitCourseList(match[2]).forEach((title) => results.push({ title, ...type }));
    }
  }

  const courseStructureIndex = text.search(/Programme Structure|Course Structure|Curriculum|课程结构|課程結構/i);
  if (courseStructureIndex >= 0) {
    const windowText = text.slice(courseStructureIndex, courseStructureIndex + 3500);
    extractLists(windowText)
      .map(cleanCourseTitle)
      .filter(looksLikeCourseTitle)
      .forEach((title) => results.push({ title, ...classifyType(windowText.slice(0, 200)) }));
  }

  return results;
}

function dedupeCourses(courses) {
  const seen = new Set();
  return courses.filter((course) => {
    const key = cleanCourseTitle(course.title).toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

const all = [];
for (const programme of programmes) {
  if (!programme.sourceUrl || programme.id.startsWith('aiep-')) continue;
  try {
    let html = '';
    let courses = [];
    let usedUrl = programme.sourceUrl;
    for (const url of candidateUrls(programme)) {
      html = fetchHtml(url);
      const componentCourses = extractFromCourseComponents(html);
      const tableCourses = extractFromTables(html);
      const overviewCourses = extractFromOverview(html);
      courses = dedupeCourses(componentCourses.length ? componentCourses : tableCourses.length ? tableCourses : overviewCourses);
      usedUrl = url;
      if (courses.length) break;
    }
    all.push({
      programmeId: programme.id,
      title: programme.title,
      sourceUrl: usedUrl,
      status: 'ok',
      count: courses.length,
      courses
    });
    console.log(`${courses.length.toString().padStart(2, ' ')} ${programme.title}`);
  } catch (error) {
    all.push({
      programmeId: programme.id,
      title: programme.title,
      sourceUrl: programme.sourceUrl,
      status: 'error',
      error: error.message,
      count: 0,
      courses: []
    });
    console.log(`!! ${programme.title} ${error.message}`);
  }
}

fs.writeFileSync(OUT_PATH, `${JSON.stringify(all, null, 2)}\n`);
console.log(`Wrote ${OUT_PATH}`);
