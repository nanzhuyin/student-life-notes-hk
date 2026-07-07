import crypto from 'node:crypto';
import fs from 'node:fs/promises';

const ENTRY_URL = 'https://www.ln.edu.hk/sgs/programmes-on-offer';
const OUT_PATH = 'src/data/programmes.json';
const RAW_OUT_PATH = 'src/data/programmes.raw.json';
const REQUEST_DELAY_MS = Number(process.env.CRAWL_DELAY_MS || 650);
const MAX_RELEVANT_PAGES = Number(process.env.CRAWL_MAX_RELEVANT_PAGES || 9);
const USER_AGENT = 'Mozilla/5.0 (compatible; student-life-notes-hk programme crawler; public pages only)';

const DEGREE_LEVELS = [
  ['Doctor', /\bdoctor\b|\bphd\b/i],
  ['Postgraduate Diploma', /\bpostgraduate diploma\b/i],
  ['Certificate', /\bcertificate\b/i],
  ['Master', /\bmaster\b|\bmsc\b|\bma\b|\bmsocsc\b|\bmres\b/i],
  ['Bachelor', /\bbachelor\b/i]
];

const RELEVANT_LINK_PATTERN = /(programme|overview|aims?|learning|outcomes?|curriculum|course|description|study|scheme|structure|admission|requirement|career|prospect|graduate|about)/i;
const NON_PUBLIC_PATTERN = /(apply\.ln\.edu\.hk|\/moodle|\/mylingnan|login|logout|staff\/|🔒|password|javascript:|mailto:|tel:)/i;
const LOW_VALUE_PAGE_PATTERN = /\/about-us\/(advisory|board|committee|staff|academic-staff|administrative-staff|staff-student|message|organizers)/i;
const COURSE_SECTION_PATTERN = /(course descriptions?|curriculum|programme structure|study scheme|courses?|required courses?|core courses?|elective courses?|foundation courses?|project|dissertation|thesis)/i;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function decodeHtml(value = '') {
  return value
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#039;|&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&rsquo;|&lsquo;/gi, "'")
    .replace(/&ldquo;|&rdquo;/gi, '"')
    .replace(/&ndash;|&mdash;/gi, '-')
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(Number.parseInt(hex, 16)))
    .replace(/&#([0-9]+);/g, (_, dec) => String.fromCodePoint(Number.parseInt(dec, 10)));
}

function stripTags(value = '') {
  return htmlToText(value).replace(/\s+/g, ' ').trim();
}

function htmlToText(html = '') {
  return decodeHtml(html)
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|tr|td|th|h[1-6]|section|article|table|ul|ol)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

function extractMainHtml(html = '') {
  return html.match(/<main[\s\S]*?<\/main>/i)?.[0] || html.match(/<body[\s\S]*?<\/body>/i)?.[0] || html;
}

function absoluteUrl(href, base = ENTRY_URL) {
  try {
    return new URL(decodeHtml(href), base).href.split('#')[0];
  } catch {
    return '';
  }
}

function normaliseWhitespace(value = '') {
  return value.replace(/\s+/g, ' ').trim();
}

function slugify(value = '') {
  return value
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 90);
}

function classifyDegreeLevel(programmeName) {
  for (const [level, pattern] of DEGREE_LEVELS) {
    if (pattern.test(programmeName)) return level;
  }
  return 'Other';
}

function classifyCourseType(text = '') {
  const lower = text.toLowerCase();
  if (/elective|選修|选修/.test(lower)) return 'elective';
  if (/foundation|preparatory|基础|基礎/.test(lower)) return 'foundation';
  if (/project|capstone|thesis|dissertation|internship|practicum|研究项目|論文|论文/.test(lower)) return 'project';
  if (/required|core|compulsory|必修|核心/.test(lower)) return 'core';
  return 'unknown';
}

function sourceHash(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

async function fetchHtml(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 35_000);
  try {
    const response = await fetch(url, {
      headers: { 'user-agent': USER_AGENT, accept: 'text/html,application/xhtml+xml' },
      signal: controller.signal
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const contentType = response.headers.get('content-type') || '';
    if (!/html|text/i.test(contentType)) throw new Error(`Unsupported content type: ${contentType}`);
    return await response.text();
  } finally {
    clearTimeout(timeout);
  }
}

function extractCells(rowHtml) {
  return [...rowHtml.matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)].map((match) => match[1]);
}

function extractAnchors(html, base) {
  return [...html.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)]
    .map((match) => ({
      href: absoluteUrl(match[1], base),
      text: stripTags(match[2])
    }))
    .filter((link) => link.href && link.text);
}

function parseProgrammesFromEntry(html) {
  const tables = [...html.matchAll(/<table\b[\s\S]*?<\/table>/gi)].map((match) => match[0]);
  const programmes = [];

  for (const table of tables) {
    if (!/filter-with-table-listing-table/i.test(table)) continue;
    const school = stripTags(table.match(/<thead[\s\S]*?<td[^>]*colspan=["']?\d+["']?[^>]*>([\s\S]*?)<\/td>[\s\S]*?<\/thead>/i)?.[1] || '');
    const rows = [...table.matchAll(/<tr\b[\s\S]*?<\/tr>/gi)].map((match) => match[0]);

    for (const row of rows) {
      const cells = extractCells(row);
      if (cells.length < 2) continue;
      const programmeAnchor = extractAnchors(cells[0], ENTRY_URL).find((anchor) => anchor.href.includes('/sgs/programmes-on-offer/'));
      if (!programmeAnchor) continue;
      const links = extractAnchors(row, ENTRY_URL);
      const visitWebsite = links.find((anchor) => /visit website/i.test(anchor.text) && !NON_PUBLIC_PATTERN.test(anchor.href))?.href || '';
      const programmeName = normaliseWhitespace(programmeAnchor.text.replace(/\+$/, ''));
      const applicationPeriod = stripTags(cells[3] || '');

      programmes.push({
        id: slugify(programmeName),
        programmeName,
        degreeLevel: classifyDegreeLevel(programmeName),
        school: school || 'Lingnan University',
        department: '',
        officialUrl: programmeAnchor.href,
        visitWebsite,
        mediumOfInstruction: stripTags(cells[1] || ''),
        modeOfStudy: stripTags(cells[2] || ''),
        applicationPeriod
      });
    }
  }

  const seen = new Set();
  return programmes.filter((programme) => {
    const key = programme.officialUrl;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function shouldCrawlLinkedPage(link, roots) {
  if (!link.href || NON_PUBLIC_PATTERN.test(`${link.href} ${link.text}`)) return false;
  if (LOW_VALUE_PAGE_PATTERN.test(link.href)) return false;
  if (/\.(pdf|docx?|xlsx?|pptx?|zip|jpg|jpeg|png|webp)$/i.test(link.href)) return false;
  if (!RELEVANT_LINK_PATTERN.test(`${link.text} ${link.href}`)) return false;
  return roots.some((root) => {
    if (!root) return false;
    const rootUrl = new URL(root);
    const linkUrl = new URL(link.href);
    if (rootUrl.origin !== linkUrl.origin) return false;
    const rootPath = rootUrl.pathname.replace(/\/$/, '');
    return linkUrl.pathname === rootPath || linkUrl.pathname.startsWith(`${rootPath}/`);
  });
}

function discoverRelevantUrls(pages, roots) {
  const urls = new Set(roots.filter(Boolean));
  for (const page of pages) {
    for (const link of extractAnchors(page.html, page.url)) {
      if (shouldCrawlLinkedPage(link, roots)) urls.add(link.href);
    }
  }
  return Array.from(urls)
    .sort((a, b) => urlPriority(a) - urlPriority(b) || a.localeCompare(b))
    .slice(0, MAX_RELEVANT_PAGES);
}

function urlPriority(url) {
  const value = url.toLowerCase();
  if (/course-descriptions?|curriculum|programme-structure|study-scheme|courses?/.test(value)) return 0;
  if (/admission-requirements?|entry-requirements?/.test(value)) return 1;
  if (/programme-aims?|learning-outcomes?|programme-overview|programme-highlights?/.test(value)) return 2;
  if (/career|prospect|graduate/.test(value)) return 3;
  if (/admission|application/.test(value)) return 4;
  if (/about/.test(value)) return 8;
  return 5;
}

function getLines(text) {
  return text
    .split(/\n+/)
    .map((line) => normaliseWhitespace(line))
    .filter((line) => line && !/^(home|about us|contact us|privacy policy statement|disclaimer|web accessibility statement|copyright|share to|open search|quick links|information for|prospective students|current students|staff|alumni|media|visitors|sitemap)$/i.test(line));
}

function firstUsefulParagraph(lines, programmeName) {
  return lines.find((line) => {
    if (line.length < 80 || line.length > 900) return false;
    if (/^(home|school of|information for|what are you looking for|search from)/i.test(line)) return false;
    return /\b(programme|students|graduates|designed|equips|provides|aims|offers)\b/i.test(line) || line.includes(programmeName);
  }) || '';
}

function extractSection(lines, includePattern, stopPattern = /^(home|about us|admissions?|news|contact us|tuition|application procedures|privacy|sitemap)$/i, maxLines = 8) {
  const start = lines.findIndex((line) => includePattern.test(line));
  if (start < 0) return [];
  const output = [];
  for (let index = start + 1; index < lines.length && output.length < maxLines; index += 1) {
    const line = lines[index];
    if (index > start + 1 && stopPattern.test(line)) break;
    if (line.length > 20 && line.length < 900) output.push(line);
  }
  return output;
}

function sentenceMatches(text, pattern, limit = 8) {
  const normalized = normaliseWhitespace(text);
  const sentences = normalized
    .split(/(?<=[.!?。])\s+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 30 && sentence.length < 500 && pattern.test(sentence));
  return Array.from(new Set(sentences)).slice(0, limit);
}

function looksLikeCourseName(value = '') {
  const text = normaliseWhitespace(value)
    .replace(/^[–—-]\s*/, '')
    .replace(/^\d+[\).、]\s*/, '')
    .replace(/\s+\d+\s*(credits?|units?|cps?)$/i, '');
  if (!text || text.length < 4 || text.length > 180) return false;
  const hasCourseCode = /^[A-Z]{2,8}\d{3,5}[A-Z]?\b/.test(text);
  if (!hasCourseCode && text.length > 105) return false;
  if (!hasCourseCode && /[.!?。；;]$/.test(text)) return false;
  if (!hasCourseCode && /[=：:]/.test(text) && !/^[A-Z]{2,8}\d{3,5}/.test(text)) return false;
  if (/^(q\d+[:：]|faq|ideal for|students? |you will|learn where|upon graduation|roles in|government |ngos? |policy institutes|ms\.?|mrs\.?|mr\.?|prof\.?|dr\.?|dean of|strengthen |equip |familiarize |expose |foster |as a |the |master of |doctor of |w yl|wyl\d+)/i.test(text)) return false;
  if (/@|https?:|tuen mun|hong kong|limited|university,|university of|office|telephone|email|seminar|workshop|instructor of|programme director|assistant programme|dean|director|professor|person-in-charge|vice[- ]president|chief data scientist|head of department|associate professor|assistant professor|chair professor|associate director|faculty of|school of|division of|admissions policy|degree programme|public administration|consulting|strategy|research roles|data governance|digital transformation|job duties|career paths|graduate\)|mphil in|phd in|phd\b|engineer|analyst,|data analyst/i.test(text)) return false;
  if (/^(required courses?|core courses?|elective courses?|course descriptions?|curriculum|programme structure|study scheme|course code|course title|credits?|total|year|semester|term|component|note|students are required|select|choose|the programme|upon completion|admission requirements?|application procedures?|learning outcomes?.*|education|media and creative industries.*|performing arts sector|statistics)$/i.test(text)) return false;
  if (/^(home|about us|contact us|news|events|privacy policy statement|disclaimer|sitemap|search|explore now|visit website|apply now)$/i.test(text)) return false;
  if (hasCourseCode) return true;
  return COURSE_SECTION_PATTERN.test(text) ? false : /[A-Za-z]/.test(text) && /\b(data|management|analytics|research|policy|finance|accounting|marketing|psychology|studies|design|intelligence|business|economics|sociology|history|culture|translation|language|project|seminar|methods|statistics|programming|database|governance|health|innovation|technology|environmental|risk|insurance|supply|chain|human|resource|organisation|education|city|cities|china|public|social|arts?)\b/i.test(text);
}

function cleanCourseName(value = '') {
  return normaliseWhitespace(stripTags(value))
    .replace(/^[-*•–—]\s*/, '')
    .replace(/^\d+[\).、]\s*/, '')
    .replace(/\s+\d+\s*(credits?|units?|cps?)$/i, '')
    .trim();
}

function extractAccordionCourses(html, url) {
  const courses = [];
  const triggerPattern = /<a\b[^>]*class=["'][^"']*(?:panel__trigger|accordion[^"']*trigger|collapse[^"']*trigger)[^"']*["'][^>]*>([\s\S]*?)<\/a>/gi;
  const matches = [...html.matchAll(triggerPattern)];

  for (let index = 0; index < matches.length; index += 1) {
    const match = matches[index];
    const name = cleanCourseName(match[1]);
    if (!looksLikeCourseName(name)) continue;
    const start = match.index || 0;
    const end = matches[index + 1]?.index || Math.min(html.length, start + 6000);
    const before = html.slice(Math.max(0, start - 2500), start);
    const chunk = html.slice(start, end);
    const heading = stripTags(before.match(/<h[1-6][^>]*>([\s\S]*?)<\/h[1-6]>\s*$/i)?.[1] || before.slice(-600));
    const description = htmlToText(chunk.replace(match[0], '')).replace(/^[-\s]+/, '').slice(0, 1400);
    courses.push({
      courseName: name,
      description: description.length > 15 ? description : '',
      courseType: classifyCourseType(`${heading} ${name}`),
      sourceUrl: url
    });
  }

  return courses;
}

function extractTableCourses(html, url) {
  const courses = [];
  const tables = [...html.matchAll(/<table\b[\s\S]*?<\/table>/gi)].map((match) => match[0]);

  for (const table of tables) {
    const tableText = stripTags(table);
    if (!COURSE_SECTION_PATTERN.test(tableText)) continue;
    let currentType = classifyCourseType(tableText.slice(0, 600));
    for (const row of [...table.matchAll(/<tr\b[\s\S]*?<\/tr>/gi)].map((match) => match[0])) {
      const rowText = stripTags(row);
      if (/core courses?|required courses?|elective courses?|foundation courses?|project|dissertation/i.test(rowText) && rowText.length < 180) currentType = classifyCourseType(rowText);
      const cells = extractCells(row).map(stripTags).filter(Boolean);
      const title = cells.find((cell) => looksLikeCourseName(cell) && !/^\d+(\.\d+)?$/.test(cell)) || '';
      if (!title) continue;
      const description = cells.find((cell) => cell !== title && cell.length > 60) || '';
      courses.push({
        courseName: cleanCourseName(title),
        description,
        courseType: currentType,
        sourceUrl: url
      });
    }
  }

  return courses;
}

function extractLineCourses(text, url) {
  const lines = getLines(text);
  const courses = [];
  let inCourseSection = false;
  let currentType = 'unknown';

  for (const line of lines) {
    if (COURSE_SECTION_PATTERN.test(line) && line.length < 120) {
      inCourseSection = true;
      currentType = classifyCourseType(line);
      continue;
    }
    if (inCourseSection && /^(admission|tuition|application|career|contact|news|about us)$/i.test(line)) inCourseSection = false;
    if (!inCourseSection || !looksLikeCourseName(line)) continue;
    courses.push({
      courseName: cleanCourseName(line),
      description: '',
      courseType: currentType,
      sourceUrl: url
    });
  }

  return courses;
}

function dedupeCourses(courses) {
  const byName = new Map();
  for (const course of courses) {
    const name = cleanCourseName(course.courseName);
    if (!name) continue;
    const key = name.toLowerCase();
    const existing = byName.get(key);
    if (!existing || (!existing.description && course.description) || (existing.courseType === 'unknown' && course.courseType !== 'unknown')) {
      byName.set(key, { ...course, courseName: name, description: normaliseWhitespace(course.description || '') });
    }
  }
  return Array.from(byName.values());
}

function extractCourses(pages) {
  const all = [];
  for (const page of pages) {
    const mainHtml = extractMainHtml(page.html);
    all.push(...extractAccordionCourses(mainHtml, page.url));
    all.push(...extractTableCourses(mainHtml, page.url));
    all.push(...extractLineCourses(page.text, page.url));
  }
  return dedupeCourses(all);
}

function keywordCandidates(programmeName, sourceText) {
  const vocabulary = [
    'artificial intelligence', 'data science', 'analytics', 'business', 'management', 'finance', 'accounting',
    'marketing', 'economics', 'policy', 'public administration', 'psychology', 'sociology', 'education',
    'health', 'technology', 'innovation', 'sustainability', 'environmental', 'translation', 'cultural',
    'history', 'arts', 'design', 'governance', 'supply chain', 'risk', 'insurance', 'smart city',
    'gerontology', 'humanitarian', 'housing', 'china', 'regional development'
  ];
  const haystack = `${programmeName} ${sourceText}`.toLowerCase();
  return vocabulary.filter((keyword) => haystack.includes(keyword)).slice(0, 12);
}

function buildImportantCourses(courses, programmeSourceText) {
  const preferred = courses
    .slice()
    .sort((a, b) => {
      const typeRank = { core: 0, foundation: 1, project: 2, unknown: 3, elective: 4 };
      return (typeRank[a.courseType] ?? 5) - (typeRank[b.courseType] ?? 5);
    })
    .slice(0, 6);

  return preferred.map((course) => {
    const hasDescription = Boolean(course.description);
    return {
      courseName: course.courseName,
      courseType: course.courseType,
      importance: course.courseType === 'core' || course.courseType === 'foundation' ? 'high' : course.courseType === 'elective' ? 'medium' : 'medium',
      whyImportant: hasDescription
        ? 'The official page provides a course description for this course; the recommendation assistant may use that description conservatively when matching student preparation and goals.'
        : 'The official page lists this course as part of the programme structure, but detailed course description is not available.',
      relatedStudentBackgrounds: sentenceMatches(programmeSourceText, /background|bachelor|degree|discipline|applicant/i, 3),
      relatedCareerGoals: sentenceMatches(programmeSourceText, /career|profession|job|employment|industry|graduate/i, 3),
      recommendedPreparations: hasDescription ? ['Review the official course description and prepare prerequisite concepts related to the course title.'] : ['Check the official programme website for the latest course outline before making decisions.'],
      sourceUrl: course.sourceUrl
    };
  });
}

function extractSourceUpdatedAt(text) {
  const match = text.match(/(?:last updated|updated on|last modified)\s*:?\s*([A-Za-z]{3,9}\s+\d{1,2},?\s+\d{4}|\d{1,2}\s+[A-Za-z]{3,9}\s+\d{4}|\d{4}-\d{1,2}-\d{1,2})/i);
  return match ? match[1] : '';
}

function buildProgramme(entry, pages, lastUpdatedAt) {
  const combinedText = pages.map((page) => `Source: ${page.url}\n${page.text}`).join('\n\n---\n\n');
  const lines = getLines(combinedText);
  const summary = firstUsefulParagraph(lines, entry.programmeName);
  const courses = extractCourses(pages);
  const hasCourses = courses.length > 0;
  const hasCourseDescriptions = courses.some((course) => course.description);
  const limits = [];

  if (!hasCourses) {
    limits.push('The official page does not provide detailed course information.');
  } else if (!hasCourseDescriptions) {
    limits.push('The official page lists course names, but detailed course descriptions are not available.');
  } else if (courses.some((course) => !course.description)) {
    limits.push('Some official course entries do not include detailed course descriptions.');
  }

  const learningObjectives = [
    ...extractSection(lines, /programme aims?|learning outcomes?|objectives?/i, /^(curriculum|course descriptions?|admissions?|application|tuition|career|contact|news)$/i, 8),
    ...sentenceMatches(combinedText, /aims? to|learning outcomes?|students will|graduates will|able to|equip/i, 8)
  ].slice(0, 10);
  const careerDirections = sentenceMatches(combinedText, /career|profession|employment|industry|job|graduate prospects?|analyst|manager|consultant|researcher|officer/i, 10);
  const skillsDeveloped = sentenceMatches(combinedText, /skills?|knowledge|competenc|equip|develop|training|ability|capable|proficiency/i, 10);
  const suitableBackgrounds = sentenceMatches(combinedText, /bachelor|degree|background|discipline|major|applicant|holder|graduate/i, 8);
  const admissionNotes = extractSection(lines, /admission requirements?|entry requirements?/i, /^(tuition|application|career|programme|curriculum|course|contact|news)$/i, 10).join(' ');
  const department =
    lines.find((line) => /^School of |^Faculty of |^Department of |^Division of /i.test(line) && line.length < 120 && !line.includes('>')) ||
    (summary.match(/(?:offered|managed) by the ([^.]+)\./i)?.[1] || '');

  const sourceText = combinedText.slice(0, 60_000);

  return {
    id: entry.id,
    programmeName: entry.programmeName,
    degreeLevel: entry.degreeLevel,
    school: entry.school,
    department: department || entry.department || '',
    officialUrl: entry.officialUrl,
    summary,
    keywords: keywordCandidates(entry.programmeName, sourceText),
    suitableBackgrounds,
    learningObjectives: Array.from(new Set(learningObjectives)),
    coreCourses: courses.filter((course) => course.courseType !== 'elective').map((course) => course.courseName),
    courseDescriptions: courses,
    importantCourses: hasCourses ? buildImportantCourses(courses, sourceText) : [],
    skillsDeveloped,
    careerDirections,
    admissionNotes,
    informationInsufficient: limits.length > 0,
    informationLimits: limits,
    sourceText,
    sourceUrls: pages.map((page) => page.url),
    sourceHash: sourceHash(sourceText),
    sourceUpdatedAt: extractSourceUpdatedAt(combinedText),
    lastUpdatedAt
  };
}

async function crawlProgramme(entry, index, total) {
  const pages = [];
  const errors = [];
  const roots = [entry.officialUrl, entry.visitWebsite].filter(Boolean);

  for (const url of roots) {
    try {
      await sleep(REQUEST_DELAY_MS);
      const html = await fetchHtml(url);
      pages.push({ url, html, text: htmlToText(extractMainHtml(html)) });
    } catch (error) {
      errors.push({ url, message: error.message });
    }
  }

  const discoveredUrls = discoverRelevantUrls(pages, roots);
  for (const url of discoveredUrls) {
    if (pages.some((page) => page.url === url)) continue;
    try {
      await sleep(REQUEST_DELAY_MS);
      const html = await fetchHtml(url);
      pages.push({ url, html, text: htmlToText(extractMainHtml(html)) });
    } catch (error) {
      errors.push({ url, message: error.message });
    }
  }

  if (!pages.length) throw new Error(errors.map((error) => `${error.url}: ${error.message}`).join('; ') || 'No pages fetched');

  const lastUpdatedAt = new Date().toISOString();
  const programme = buildProgramme(entry, pages, lastUpdatedAt);
  const raw = {
    programmeName: entry.programmeName,
    officialUrl: entry.officialUrl,
    visitWebsite: entry.visitWebsite,
    sourceUrls: pages.map((page) => page.url),
    rawText: pages.map((page) => `Source: ${page.url}\n${page.text}`).join('\n\n---\n\n').slice(0, 80_000),
    sourceHash: programme.sourceHash,
    crawlError: errors.length ? errors : null
  };

  console.log(`${String(index + 1).padStart(2, '0')}/${total} ${programme.courseDescriptions.length.toString().padStart(2, ' ')} courses ${programme.programmeName}`);
  return { programme, raw };
}

async function main() {
  console.log(`Fetching programme listing: ${ENTRY_URL}`);
  const entryHtml = await fetchHtml(ENTRY_URL);
  const entries = parseProgrammesFromEntry(entryHtml);
  if (!entries.length) throw new Error('No programme links found on entry page');
  console.log(`Found ${entries.length} programmes`);

  const programmes = [];
  const raw = [];

  for (let index = 0; index < entries.length; index += 1) {
    const entry = entries[index];
    try {
      const result = await crawlProgramme(entry, index, entries.length);
      programmes.push(result.programme);
      raw.push(result.raw);
    } catch (error) {
      const lastUpdatedAt = new Date().toISOString();
      const sourceText = `${entry.programmeName}\n${entry.officialUrl}`;
      programmes.push({
        id: entry.id,
        programmeName: entry.programmeName,
        degreeLevel: entry.degreeLevel,
        school: entry.school,
        department: entry.department || '',
        officialUrl: entry.officialUrl,
        summary: '',
        keywords: keywordCandidates(entry.programmeName, sourceText),
        suitableBackgrounds: [],
        learningObjectives: [],
        coreCourses: [],
        courseDescriptions: [],
        importantCourses: [],
        skillsDeveloped: [],
        careerDirections: [],
        admissionNotes: '',
        informationInsufficient: true,
        informationLimits: ['The official page does not provide detailed course information.', `Crawler could not parse this programme page: ${error.message}`],
        sourceText,
        sourceUrls: [entry.officialUrl],
        sourceHash: sourceHash(sourceText),
        sourceUpdatedAt: '',
        lastUpdatedAt
      });
      raw.push({
        programmeName: entry.programmeName,
        officialUrl: entry.officialUrl,
        visitWebsite: entry.visitWebsite,
        rawText: '',
        sourceHash: sourceHash(sourceText),
        crawlError: error.message
      });
      console.log(`!! ${String(index + 1).padStart(2, '0')}/${entries.length} ${entry.programmeName}: ${error.message}`);
    }
  }

  await fs.mkdir('src/data', { recursive: true });
  await fs.writeFile(OUT_PATH, `${JSON.stringify(programmes, null, 2)}\n`);
  await fs.writeFile(RAW_OUT_PATH, `${JSON.stringify(raw, null, 2)}\n`);

  const withCourses = programmes.filter((programme) => programme.courseDescriptions.length > 0).length;
  console.log(`Wrote ${OUT_PATH}`);
  console.log(`Wrote ${RAW_OUT_PATH}`);
  console.log(`Programmes: ${programmes.length}; with course information: ${withCourses}; without course information: ${programmes.length - withCourses}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
