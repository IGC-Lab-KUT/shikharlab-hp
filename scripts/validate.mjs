import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, extname, join, relative, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const failures = [];
const supportedNewsCategories = new Set([
  'conference-presentation',
  'journal-publication',
  'student-achievement',
  'lab-event',
  'seminar',
  'research-visit',
  'research-presentation',
  'other',
]);

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function isValidDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

function hasBilingualText(value) {
  return value && isNonEmptyString(value.en) && isNonEmptyString(value.ja);
}

function publicationKey(publication) {
  const title = String(publication.title || '')
    .normalize('NFKD')
    .toLocaleLowerCase('en')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
  return `${publication.year}:${title}`;
}

function isSafeNewsImagePath(value) {
  return typeof value === 'string'
    && /^data\/imgs\/news-[A-Za-z0-9][A-Za-z0-9._-]*$/.test(value)
    && !value.includes('..');
}

function isSafeLink(value) {
  if (typeof value !== 'string' || !value) return false;
  if (/^https:\/\//i.test(value)) {
    try {
      const url = new URL(value);
      return url.protocol === 'https:' && Boolean(url.hostname);
    } catch {
      return false;
    }
  }
  return /^(?!\/|.*(?:^|\/)\.\.(?:\/|$))[A-Za-z0-9][A-Za-z0-9._/-]*(?:\?[A-Za-z0-9._~!$&'()*+,;=:@%/?-]*)?$/.test(value);
}

function validateNewsImage(image, prefix, requiredCaption = false) {
  if (!image || typeof image !== 'object' || Array.isArray(image)) {
    failures.push(`${prefix}: image must be an object`);
    return;
  }
  if (!isSafeNewsImagePath(image.src)) failures.push(`${prefix}: src must be a safe data/imgs/news-* path`);
  else if (!existsSync(join(root, image.src))) failures.push(`${prefix}: missing image ${image.src}`);
  if (!hasBilingualText(image.alt)) failures.push(`${prefix}: bilingual alt text is required`);
  if (requiredCaption && !hasBilingualText(image.caption)) failures.push(`${prefix}: bilingual caption is required`);
  else if (image.caption && !hasBilingualText(image.caption)) failures.push(`${prefix}: caption must contain English and Japanese text`);
}

function validateNewsLinks(items, prefix) {
  if (!Array.isArray(items)) {
    failures.push(`${prefix}: expected an array`);
    return;
  }
  items.forEach((link, index) => {
    const linkPrefix = `${prefix} entry ${index + 1}`;
    if (!link || typeof link !== 'object' || Array.isArray(link)) {
      failures.push(`${linkPrefix}: expected an object`);
      return;
    }
    if (!hasBilingualText(link.label || link.title)) failures.push(`${linkPrefix}: bilingual label or title is required`);
    if (!isSafeLink(link.url)) failures.push(`${linkPrefix}: url must be a valid HTTPS URL or safe repository-relative path`);
  });
}

function filesUnder(directory) {
  return readdirSync(directory).flatMap(name => {
    const path = join(directory, name);
    if (name === '.git') return [];
    return statSync(path).isDirectory() ? filesUnder(path) : [path];
  });
}

const files = filesUnder(root);
const htmlFiles = files.filter(path => extname(path) === '.html');
const jsonFiles = files.filter(path => extname(path) === '.json');
const jsFiles = files.filter(path => ['.js', '.mjs'].includes(extname(path)));

for (const path of jsonFiles) {
  try {
    const source = readFileSync(path, 'utf8');
    const data = JSON.parse(source);
    for (const match of source.matchAll(/["'](data\/imgs\/[^"']+)["']/g)) {
      if (!existsSync(join(root, match[1]))) failures.push(`${relative(root, path)}: missing image ${match[1]}`);
    }
    const inspectUrls = value => {
      if (Array.isArray(value)) value.forEach(inspectUrls);
      else if (value && typeof value === 'object') {
        for (const [key, child] of Object.entries(value)) {
          if (/^(?:url|urlEn|urlJa|photoSource)$/.test(key) && child && !/^https:\/\//i.test(child)) {
            failures.push(`${relative(root, path)}: external ${key} must use https`);
          }
          inspectUrls(child);
        }
      }
    };
    inspectUrls(data);

    if (relative(root, path) === 'data/news.json') {
      if (data.schemaVersion !== 2 || !Array.isArray(data.items)) failures.push('data/news.json: expected schemaVersion 2 and an items array');
      const ids = new Set();
      let previousDate = '';
      for (const [index, item] of (data.items || []).entries()) {
        const prefix = `data/news.json: item ${index + 1}`;
        if (!/^\d{4}-(?:0[1-9]|1[0-2])-[a-z0-9]+(?:-[a-z0-9]+)*$/.test(item.id || '')) failures.push(`${prefix}: id must use YYYY-MM-lowercase-slug format`);
        if (ids.has(item.id)) failures.push(`${prefix}: duplicate id ${item.id}`);
        ids.add(item.id);
        if (!isValidDate(item.date)) failures.push(`${prefix}: date must be a real calendar date using YYYY-MM-DD`);
        if (item.dateEnd && !isValidDate(item.dateEnd)) failures.push(`${prefix}: dateEnd must be a real calendar date using YYYY-MM-DD`);
        if (isValidDate(item.date) && isValidDate(item.dateEnd) && item.dateEnd < item.date) failures.push(`${prefix}: dateEnd cannot be before date`);
        if (previousDate && isValidDate(item.date) && item.date > previousDate) failures.push(`${prefix}: news items must be in descending date order`);
        if (isValidDate(item.date)) previousDate = item.date;
        if (item.dateLabel && !hasBilingualText(item.dateLabel)) failures.push(`${prefix}: dateLabel must contain English and Japanese text`);
        if (!hasBilingualText(item.category) || !isNonEmptyString(item.category?.id)) failures.push(`${prefix}: bilingual category is required`);
        else if (!supportedNewsCategories.has(item.category.id)) failures.push(`${prefix}: unsupported category id "${item.category.id}"`);
        if (!hasBilingualText(item.title)) failures.push(`${prefix}: bilingual title is required`);
        if (!hasBilingualText(item.summary)) failures.push(`${prefix}: bilingual summary is required`);
        if (!['draft', 'published'].includes(item.status)) failures.push(`${prefix}: status must be draft or published`);
        if (item.lastUpdated && !isValidDate(item.lastUpdated)) failures.push(`${prefix}: lastUpdated must be a real calendar date using YYYY-MM-DD`);
        if (item.content) {
          if (!Array.isArray(item.content.en) || !Array.isArray(item.content.ja) || !item.content.en.length || !item.content.ja.length) {
            failures.push(`${prefix}: content must contain non-empty English and Japanese paragraph arrays`);
          } else {
            for (const language of ['en', 'ja']) {
              if (item.content[language].some(paragraph => !isNonEmptyString(paragraph))) failures.push(`${prefix}: content.${language} must contain only non-empty paragraphs`);
            }
          }
        }
        if (item.thumbnail) validateNewsImage(item.thumbnail, `${prefix} thumbnail`);
        if (item.featuredImage) validateNewsImage(item.featuredImage, `${prefix} featuredImage`, true);
        if (item.images) {
          if (!Array.isArray(item.images) || !item.images.length) failures.push(`${prefix}: images must be a non-empty array when provided`);
          else item.images.forEach((image, imageIndex) => validateNewsImage(image, `${prefix} image ${imageIndex + 1}`, true));
        }
        for (const field of ['links', 'relatedPublications', 'relatedProjects']) {
          if (item[field]) validateNewsLinks(item[field], `${prefix} ${field}`);
        }
        if (item.author !== undefined && !isNonEmptyString(item.author)) failures.push(`${prefix}: author must be a non-empty string when provided`);
      }
      const hasDetailedNews = (data.items || []).some(item => item.content || item.featuredImage || item.images?.length || item.links?.length || item.relatedPublications?.length || item.relatedProjects?.length);
      if (hasDetailedNews) {
        for (const articlePage of ['news-detail.html', 'ja/news-detail.html']) {
          if (!existsSync(join(root, articlePage))) failures.push(`data/news.json: detailed news requires ${articlePage}`);
        }
      }
    }

    if (relative(root, path) === 'data/pi.json' && (data.en?.funding || data.ja?.funding)) {
      failures.push('data/pi.json: funding records must be maintained only in data/funding.json');
    }

    if (relative(root, path) === 'data/funding.json') {
      if (data.schemaVersion !== 1 || !isValidDate(data.updatedAt) || !Array.isArray(data.grants)) {
        failures.push('data/funding.json: expected schemaVersion 1, a YYYY-MM-DD updatedAt date, and a grants array');
      }
      const requiredGrantIds = new Set([
        'kakenhi-jamming-mitigation-2026',
        'jst-lotus-sayantan-bose-2026',
        'jst-lotus-shradha-kouloorkar-2026',
        'kakenhi-human-centric-6g-2022',
        'kakenhi-iot-over-5g-2019',
      ]);
      const ids = new Set();
      let completedSectionStarted = false;
      let previousYear = Infinity;
      for (const [index, grant] of (data.grants || []).entries()) {
        const prefix = `data/funding.json: grant ${index + 1}`;
        if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(grant.id || '')) failures.push(`${prefix}: id must be a lowercase slug`);
        if (ids.has(grant.id)) failures.push(`${prefix}: duplicate id ${grant.id}`);
        ids.add(grant.id);
        if (!['ongoing', 'completed'].includes(grant.status)) failures.push(`${prefix}: status must be ongoing or completed`);
        if (!['kakenhi', 'lotus'].includes(grant.type)) failures.push(`${prefix}: type must be kakenhi or lotus`);
        if (!Number.isInteger(grant.sortYear)) failures.push(`${prefix}: sortYear must be an integer`);
        if (grant.sortYear > previousYear) failures.push(`${prefix}: grants must be in newest-first order`);
        previousYear = grant.sortYear;
        if (grant.status === 'completed') completedSectionStarted = true;
        if (completedSectionStarted && grant.status === 'ongoing') failures.push(`${prefix}: ongoing grants must precede completed grants`);
        if (!hasBilingualText(grant.title)) failures.push(`${prefix}: bilingual title is required`);

        const requiredFields = grant.type === 'lotus'
          ? ['researcher', 'homeInstitution', 'hostInstitution', 'awardYear', 'expectedJoining']
          : ['program', 'role', 'institution', 'period'];
        for (const field of requiredFields) {
          if (!hasBilingualText(grant[field])) failures.push(`${prefix}: bilingual ${field} is required`);
        }

        const inspectPublicFields = value => {
          if (!value || typeof value !== 'object') return;
          for (const [key, child] of Object.entries(value)) {
            if (/(?:amount|directCosts?|indirectCosts?|fundingCeiling|approvedFunding)/i.test(key)) {
              failures.push(`${prefix}: public funding data must not include amounts or cost fields`);
            }
            inspectPublicFields(child);
          }
        };
        inspectPublicFields(grant);
      }
      for (const id of requiredGrantIds) {
        if (!ids.has(id)) failures.push(`data/funding.json: missing required grant ${id}`);
      }
    }

    if (relative(root, path) === 'data/openalex-citations.json') {
      const publications = JSON.parse(readFileSync(join(root, 'data/publications.json'), 'utf8'));
      const expectedKeys = new Set(publications.map(publicationKey));
      if (data.schemaVersion !== 1 || data.source !== 'https://openalex.org' || !Array.isArray(data.entries)) {
        failures.push('data/openalex-citations.json: expected schemaVersion 1, the official OpenAlex source, and an entries array');
      }
      if (!Number.isFinite(Date.parse(data.updatedAt))) failures.push('data/openalex-citations.json: updatedAt must be an ISO timestamp');
      if ((data.entries || []).length !== publications.length) failures.push('data/openalex-citations.json: every publication must have exactly one citation-status entry');
      const citationKeys = new Set();
      for (const [index, entry] of (data.entries || []).entries()) {
        const prefix = `data/openalex-citations.json: entry ${index + 1}`;
        if (!expectedKeys.has(entry.publicationKey)) failures.push(`${prefix}: publicationKey does not match data/publications.json`);
        if (citationKeys.has(entry.publicationKey)) failures.push(`${prefix}: duplicate publicationKey`);
        citationKeys.add(entry.publicationKey);
        if (!['matched', 'unmatched', 'ambiguous', 'invalid'].includes(entry.matchStatus)) failures.push(`${prefix}: invalid matchStatus`);
        if (!Number.isFinite(Date.parse(entry.checkedAt))) failures.push(`${prefix}: checkedAt must be an ISO timestamp`);
        if (entry.matchStatus === 'matched') {
          if (!/^W\d+$/.test(entry.openAlexId || '')) failures.push(`${prefix}: matched entry requires a valid OpenAlex work ID`);
          if (entry.openAlexUrl !== `https://openalex.org/${entry.openAlexId}`) failures.push(`${prefix}: matched entry requires the canonical OpenAlex URL`);
          if (!Number.isInteger(entry.citedByCount) || entry.citedByCount < 0) failures.push(`${prefix}: citedByCount must be a non-negative integer`);
        } else if (entry.openAlexId !== null || entry.openAlexUrl !== null || entry.citedByCount !== null) {
          failures.push(`${prefix}: unmatched entry must not contain trusted citation data`);
        }
        if (Object.keys(entry).some(key => /(?:api.?key|secret|token)/i.test(key))) failures.push(`${prefix}: credentials must never be stored in generated data`);
      }
    }

    if (relative(root, path) === 'data/openalex-overrides.json') {
      const publications = JSON.parse(readFileSync(join(root, 'data/publications.json'), 'utf8'));
      const expectedKeys = new Set(publications.map(publicationKey));
      if (!data || typeof data !== 'object' || Array.isArray(data)) failures.push('data/openalex-overrides.json: expected an object');
      else for (const [key, id] of Object.entries(data)) {
        if (!expectedKeys.has(key)) failures.push(`data/openalex-overrides.json: unknown publication key ${key}`);
        if (!/^(?:https:\/\/openalex\.org\/)?W\d+$/i.test(id)) failures.push(`data/openalex-overrides.json: invalid OpenAlex work ID for ${key}`);
      }
    }
  } catch (error) {
    failures.push(`${relative(root, path)}: invalid JSON (${error.message})`);
  }
}

for (const path of htmlFiles) {
  const source = readFileSync(path, 'utf8');
  const ids = [...source.matchAll(/\bid=["']([^"']+)["']/g)].map(match => match[1]);
  const duplicates = [...new Set(ids.filter((id, index) => ids.indexOf(id) !== index))];
  if (duplicates.length) failures.push(`${relative(root, path)}: duplicate IDs: ${duplicates.join(', ')}`);
  if (!/<html\s+lang=["'][a-z-]+["']/i.test(source)) failures.push(`${relative(root, path)}: missing html lang`);
  if (!/<meta\s+name=["']viewport["']/i.test(source)) failures.push(`${relative(root, path)}: missing viewport meta`);
  if (!/<meta\s+name=["']description["']/i.test(source)) failures.push(`${relative(root, path)}: missing description meta`);
  if (!/<h1\b/i.test(source)) failures.push(`${relative(root, path)}: missing h1`);

  for (const match of source.matchAll(/(?:src|href)=["']([^"'#?]+)["']/gi)) {
    const reference = match[1];
    if (/^(?:https?:|mailto:|data:)/i.test(reference)) continue;
    const target = resolve(dirname(path), reference);
    if (!existsSync(target)) failures.push(`${relative(root, path)}: missing local reference ${reference}`);
  }
}

for (const path of jsFiles) {
  const source = readFileSync(path, 'utf8');
  if (/\.(?:innerHTML|outerHTML)\s*=|insertAdjacentHTML\s*\(/.test(source)) {
    failures.push(`${relative(root, path)}: unsafe HTML insertion API found`);
  }
  const syntax = spawnSync(process.execPath, ['--check', path], { encoding: 'utf8' });
  if (syntax.status !== 0) failures.push(`${relative(root, path)}: ${syntax.stderr.trim()}`);
}

for (const path of ['tmp', 'data/.members.json.un~']) {
  if (existsSync(join(root, path))) failures.push(`${path}: temporary file should not be committed`);
}

if (failures.length) {
  console.error(`Validation failed with ${failures.length} issue(s):`);
  failures.forEach(failure => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(`Validation passed: ${htmlFiles.length} HTML, ${jsonFiles.length} JSON, and ${jsFiles.length} JavaScript files checked.`);
