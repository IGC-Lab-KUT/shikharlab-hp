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
