import fs from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

const DATA_PATH = process.env.PROGRAMMES_JSON_FILE || 'src/data/programmes.json';

const STRONG_OUTCOME_PATTERN = /(career prospects?|career opportunities?|career pathways?|job prospects?|career paths? include|graduate highlights?|graduate stories?|\(\s*20\d{2}(?:\s*[–/-]\s*\d{2,4})?\s+Graduate\)|graduates?\s+(?:can|will|are|could|have|go on|seek|follow|be|work|serve|pursue)|alumni\s+(?:from|network|career|sharing)|employed by|have been employed|prepared for careers?|equips graduates for careers?|professional fields of .*graduates|eligible (?:to apply|for admission)|professional qualifications?|certification|chartered membership|pursue further postgraduate studies|take up jobs|roles? such as|positions? (?:include|blending)|examples? of (?:these )?positions include)/i;
const SOCIAL_SOURCE_PATTERN = /(mp\.weixin\.qq\.com|xiaohongshu\.com|xhslink\.com|instagram\.com|facebook\.com|linkedin\.com)/i;
const EXCLUDE_PATTERN = /(must complete|graduate successfully|graduation list|official transcript|transcript|application|tuition|fellowship|immigration|postgraduate studies committee|programme curriculum committee|registry|cgpa|gpa|students will be awarded|course is designed for graduate students|source:|programme director|associate director|associate dean|postdoctoral fellow|career forum|career workshop|alumni gathering|alumni day|campus day|graduate stories|talks?|seminar|webinar|network and share ideas|applicants?|admission requirements?|admitted to|not hold a relevant degree|equivalent to a bachelor|to be eligible for admission|certificate of academic|pre-requisite|preparatory course|subject to sufficient demand|faculty availability|local students are eligible|extended non-means-tested loan|please click|programme leaflet|career sharing event)/i;
const COURSE_TEXT_PATTERN = /^(this course|the course|students will|upon completion of this course|pre-requisite|coverage includes|specific topics include|the basic objective of this course|this workshop course|lectures would|students opting for|all students are required to complete|to liaise with|it aims to provide|it aims to develop)\b/i;
const YEAR_PATTERN = /\b(?:AY\s*)?(20\d{2}(?:\s*[/-]\s*\d{2,4}|\s*[–-]\s*\d{2,4})?|\d{4}\s*[/-]\s*\d{2})\b/i;
const ROLE_INTRO_PATTERN = /(?:including|include|includes|examples? include|such as|roles? (?:as|include)|positions? (?:as|include)|career paths? include|prepared for)\s*:?\s*(.+)$/i;
const SECTOR_TERMS = [
  'technology', 'tech', 'healthcare', 'finance', 'government', 'education', 'academia', 'museums',
  'galleries', 'auction houses', 'arts media', 'cultural', 'creative media', 'heritage', 'policy',
  'public sector', 'ngo', 'non-profits', 'consulting', 'research', 'social services', 'urban technology',
  'human resources', 'insurance', 'actuarial', 'supply chain', 'logistics', 'marketing', 'banking',
  'smart factories', 'manufacturing', 'sports', 'music', 'media', 'performance arts'
];

function normaliseWhitespace(value = '') {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function unique(values) {
  return Array.from(new Set(values.map((value) => normaliseWhitespace(value)).filter(Boolean)));
}

function splitCandidateItems(value = '') {
  return unique(
    value
      .replace(/\band\/or\b/gi, ',')
      .replace(/\betc\.?/gi, '')
      .split(/[,;]| and | or |\u3001/)
      .map((item) => item.replace(/[.。]$/g, '').trim())
      .filter((item) => item.length >= 3 && item.length <= 80)
  ).slice(0, 12);
}

function extractRoles(text) {
  const match = text.match(ROLE_INTRO_PATTERN);
  if (!match) return [];
  return splitCandidateItems(match[1]);
}

function extractSectors(text) {
  const lower = text.toLowerCase();
  return SECTOR_TERMS.filter((term) => lower.includes(term.toLowerCase())).slice(0, 12);
}

function extractEmployers(text) {
  const afterSemicolon = text.match(/\b(?:20\d{2}(?:\s*[–-]\s*\d{2})?\s+Graduate|Graduate\))\s*[^;；]*[;；]\s*([^.;。]+)/i)?.[1] || '';
  return splitCandidateItems(afterSemicolon).slice(0, 4);
}

function classifyOutcome(text) {
  if (/further stud(?:y|ies)|phd|doctoral/i.test(text)) return 'furtherStudy';
  if (/professional qualification|certification|chartered|accredit/i.test(text)) return 'professionalAccreditation';
  if (/\b(?:\(\s*20\d{2}(?:\s*[–/-]\s*\d{2,4})?\s+Graduate\)|Graduate\s+20\d{2}|employed by|have been employed|Senior project engineer|Business Analyst|Import Business Administrator)\b/i.test(text)) return 'graduateDestination';
  if (/sector|industry|industries|public sector|ngo|government|museums|galleries|technology|healthcare|finance/i.test(text)) return 'employmentSector';
  return 'careerProspect';
}

function shouldKeepOutcome(text, currentUrl = '') {
  const clean = normaliseWhitespace(text);
  if (clean.length < 35 || clean.length > 700) return false;
  if (EXCLUDE_PATTERN.test(clean)) return false;
  if (/\|/.test(clean) && /career prospects?/i.test(clean) && clean.length < 100) return false;
  if (COURSE_TEXT_PATTERN.test(clean) && !/graduates?\s+(?:can|will|are|could|have|go on|seek|follow|be|work|serve|pursue)|prepared for careers?|equips graduates for careers?/i.test(clean)) return false;
  if (!STRONG_OUTCOME_PATTERN.test(clean)) return false;
  if (/^[A-Z]{2,}\d{3}\b/.test(clean)) return false;
  if (/career prospects?|job prospects?|graduate|alumni|employed|professional qualification|chartered|eligible|career paths?/i.test(clean)) return true;
  return /career|graduate|alumni|employment|student-career/i.test(currentUrl);
}

function sourceTypeForUrl(url = '') {
  if (!SOCIAL_SOURCE_PATTERN.test(url)) return 'official';
  if (/ln\.edu\.hk/i.test(url)) return 'officialSocial';
  return 'publicSocial';
}

function sourceReliabilityForType(sourceType) {
  if (sourceType === 'official') return 'official';
  if (sourceType === 'officialSocial') return 'verified-public';
  return 'public-reference';
}

function sourceNameForType(sourceType) {
  if (sourceType === 'official') return 'Lingnan University official programme pages';
  if (sourceType === 'officialSocial') return 'Programme or department public social channel';
  return 'Public social post';
}

function splitLongBlock(block) {
  const clean = normaliseWhitespace(block);
  if (clean.length <= 360) return [clean];
  return clean
    .split(/(?<=[.!?。])\s+/)
    .map(normaliseWhitespace)
    .filter(Boolean);
}

export function extractGraduateOutcomes(programme) {
  const rows = [];
  let currentUrl = programme.officialUrl || '';

  for (const rawLine of String(programme.sourceText || '').split(/\n+/)) {
    const sourceMatch = rawLine.match(/^Source:\s*(https?:\/\/\S+)/i);
    if (sourceMatch) {
      currentUrl = sourceMatch[1];
      continue;
    }
    for (const fragment of splitLongBlock(rawLine)) {
      if (!shouldKeepOutcome(fragment, currentUrl)) continue;
      const year = fragment.match(YEAR_PATTERN)?.[0]?.replace(/\s+/g, ' ') || '';
      const sourceType = sourceTypeForUrl(currentUrl);
      rows.push({
        year,
        outcomeType: classifyOutcome(fragment),
        description: fragment,
        roles: extractRoles(fragment),
        sectors: extractSectors(fragment),
        employers: extractEmployers(fragment),
        sourceType,
        sourceName: sourceNameForType(sourceType),
        sourceReliability: sourceReliabilityForType(sourceType),
        sourceUrl: currentUrl || programme.officialUrl || '',
        sourceText: fragment
      });
    }
  }

  const deduped = [];
  const seen = new Set();
  for (const row of rows) {
    const key = row.description.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(row);
    if (deduped.length >= 10) break;
  }

  const limits = [];
  if (!deduped.length) {
    limits.push('The official pages do not provide programme-specific graduate destination or career outcome details.');
    limits.push('The official programme pages do not provide year-by-year graduate destination data.');
  } else if (deduped.some((item) => item.year && item.outcomeType === 'graduateDestination')) {
    limits.push('The official pages provide selected graduate examples, but not a complete year-by-year destination dataset for every cohort.');
  } else {
    limits.push('The official programme pages provide career prospects, but do not provide year-by-year graduate destination data.');
  }

  return {
    graduateOutcomeSummary: deduped.slice(0, 3).map((item) => item.description).join(' '),
    graduateOutcomes: deduped,
    graduateOutcomeInformationInsufficient: limits.length > 0,
    graduateOutcomeInformationLimits: limits
  };
}

async function main() {
  const programmes = JSON.parse(await fs.readFile(DATA_PATH, 'utf8'));
  const enriched = programmes.map((programme) => ({
    ...programme,
    ...extractGraduateOutcomes(programme)
  }));
  await fs.writeFile(DATA_PATH, `${JSON.stringify(enriched, null, 2)}\n`);
  const withOutcomes = enriched.filter((programme) => (programme.graduateOutcomes || []).length > 0).length;
  const withYearExamples = enriched.filter((programme) =>
    (programme.graduateOutcomes || []).some((outcome) => outcome.year && outcome.outcomeType === 'graduateDestination')
  ).length;
  console.log(`Enriched ${enriched.length} programmes.`);
  console.log(`With official career or graduate outcome text: ${withOutcomes}`);
  console.log(`With selected year-labelled graduate examples: ${withYearExamples}`);
  console.log(`Without outcome text: ${enriched.length - withOutcomes}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
