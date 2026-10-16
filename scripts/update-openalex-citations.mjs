import { readFile, rename, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const defaultApiBase = 'https://api.openalex.org';
const retryableStatuses = new Set([429, 500, 502, 503, 504]);

export function normalizeText(value = '') {
  return String(value)
    .normalize('NFKD')
    .toLocaleLowerCase('en')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

export function publicationKey(publication) {
  return `${publication.year}:${normalizeText(publication.title)}`;
}

export function extractDoi(publication) {
  const match = String(publication.url || '').match(/(?:https?:\/\/(?:dx\.)?doi\.org\/)(10\.\d{4,9}\/[^?#\s]+)/i);
  return match ? decodeURIComponent(match[1]).toLocaleLowerCase('en') : null;
}

function expectedAuthors(authors = '') {
  return authors
    .replace(/,?\s+and\s+/gi, ', ')
    .split(',')
    .map(name => normalizeText(name))
    .filter(Boolean);
}

function authorNames(work) {
  return (work?.authorships || [])
    .map(authorship => normalizeText(authorship?.author?.display_name))
    .filter(Boolean);
}

export function verifyAuthors(publication, work) {
  const expected = expectedAuthors(publication.authors);
  const actual = authorNames(work);
  if (!expected.length || !actual.length) return false;

  const matches = expected.filter(name => {
    const surname = name.split(' ').at(-1);
    return actual.some(candidate => candidate === name || candidate.split(' ').at(-1) === surname);
  }).length;
  const required = Math.min(expected.length, Math.max(2, Math.ceil(expected.length / 2)));
  return matches >= required;
}

export function verifyWork(publication, work, { requireYear = true, expectedDoi = null } = {}) {
  const title = normalizeText(work?.display_name || work?.title);
  const doi = String(work?.doi || '').replace(/^https?:\/\/(?:dx\.)?doi\.org\//i, '').toLocaleLowerCase('en');
  return {
    title: title === normalizeText(publication.title),
    authors: verifyAuthors(publication, work),
    year: Number(work?.publication_year) === Number(publication.year),
    doi: expectedDoi ? doi === expectedDoi : null,
    accepted: title === normalizeText(publication.title)
      && verifyAuthors(publication, work)
      && (!requireYear || Number(work?.publication_year) === Number(publication.year))
      && (!expectedDoi || doi === expectedDoi),
  };
}

function cleanOpenAlexId(value) {
  const match = String(value || '').match(/(?:https:\/\/openalex\.org\/)?(W\d+)$/i);
  return match ? match[1].toUpperCase() : null;
}

function openAlexUrl(work) {
  const id = cleanOpenAlexId(work?.id);
  return id ? `https://openalex.org/${id}` : null;
}

function delay(milliseconds) {
  return new Promise(resolveDelay => setTimeout(resolveDelay, milliseconds));
}

function retryDelay(response, attempt) {
  const retryAfter = Number(response.headers.get('retry-after'));
  if (Number.isFinite(retryAfter) && retryAfter >= 0) return Math.min(retryAfter * 1000, 30_000);
  return Math.min(750 * (2 ** attempt), 10_000);
}

export async function requestJson(url, { fetchImpl = fetch, attempts = 4 } = {}) {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    let response;
    try {
      response = await fetchImpl(url, {
        headers: { Accept: 'application/json', 'User-Agent': 'shikharlab-hp-citation-refresh/1.0' },
        signal: AbortSignal.timeout(20_000),
      });
    } catch (error) {
      if (attempt === attempts - 1) throw new Error(`OpenAlex request failed after ${attempts} attempts: ${error.message}`);
      await delay(Math.min(750 * (2 ** attempt), 10_000));
      continue;
    }

    if (response.status === 404) return null;
    if (response.ok) return response.json();
    if (!retryableStatuses.has(response.status) || attempt === attempts - 1) {
      throw new Error(`OpenAlex request failed with HTTP ${response.status}`);
    }
    await delay(retryDelay(response, attempt));
  }
  throw new Error('OpenAlex request failed');
}

function apiUrl(path, { apiBase, apiKey, parameters = {} }) {
  const url = new URL(path, `${apiBase.replace(/\/$/, '')}/`);
  for (const [key, value] of Object.entries(parameters)) url.searchParams.set(key, value);
  if (apiKey) url.searchParams.set('api_key', apiKey);
  return url;
}

async function fetchByDoi(doi, options) {
  const safeDoi = doi.split('/').map(encodeURIComponent).join('/');
  return requestJson(apiUrl(`works/https://doi.org/${safeDoi}`, options), options);
}

async function fetchById(id, options) {
  return requestJson(apiUrl(`works/${id}`, options), options);
}

async function searchByTitle(publication, options) {
  const response = await requestJson(apiUrl('works', {
    ...options,
    parameters: {
      search: publication.title,
      filter: `publication_year:${publication.year}`,
      'per-page': '10',
      select: 'id,doi,display_name,publication_year,cited_by_count,authorships',
    },
  }), options);
  return response?.results || [];
}

function matchedEntry(publication, work, matchMethod, verification, checkedAt) {
  return {
    publicationKey: publicationKey(publication),
    title: publication.title,
    year: publication.year,
    matchStatus: 'matched',
    matchMethod,
    openAlexId: cleanOpenAlexId(work.id),
    openAlexUrl: openAlexUrl(work),
    doi: work.doi || null,
    citedByCount: work.cited_by_count,
    verification,
    checkedAt,
  };
}

function unmatchedEntry(publication, matchMethod, reason, checkedAt, status = 'unmatched') {
  return {
    publicationKey: publicationKey(publication),
    title: publication.title,
    year: publication.year,
    matchStatus: status,
    matchMethod,
    openAlexId: null,
    openAlexUrl: null,
    doi: extractDoi(publication),
    citedByCount: null,
    reason,
    checkedAt,
  };
}

export async function matchPublication(publication, { overrideId, checkedAt, ...options }) {
  if (overrideId) {
    const id = cleanOpenAlexId(overrideId);
    if (!id) return unmatchedEntry(publication, 'manual-override', 'Invalid OpenAlex work ID in override file.', checkedAt, 'invalid');
    const work = await fetchById(id, options);
    if (!work) return unmatchedEntry(publication, 'manual-override', 'The manually verified OpenAlex work no longer exists.', checkedAt, 'invalid');
    const verification = verifyWork(publication, work, { requireYear: false });
    if (!verification.title || !verification.authors) {
      return unmatchedEntry(publication, 'manual-override', 'The override failed title and author verification.', checkedAt, 'invalid');
    }
    return matchedEntry(publication, work, 'manual-override', verification, checkedAt);
  }

  const doi = extractDoi(publication);
  if (doi) {
    const work = await fetchByDoi(doi, options);
    if (!work) return unmatchedEntry(publication, 'doi', 'No OpenAlex work was found for the DOI.', checkedAt);
    const verification = verifyWork(publication, work, { requireYear: false, expectedDoi: doi });
    if (!verification.accepted) return unmatchedEntry(publication, 'doi', 'The DOI result failed title, author, or DOI verification.', checkedAt, 'invalid');
    return matchedEntry(publication, work, 'doi', verification, checkedAt);
  }

  const candidates = await searchByTitle(publication, options);
  const verified = candidates
    .map(work => ({ work, verification: verifyWork(publication, work) }))
    .filter(candidate => candidate.verification.accepted);
  if (verified.length === 1) {
    return matchedEntry(publication, verified[0].work, 'title-author-year', verified[0].verification, checkedAt);
  }
  if (verified.length > 1) {
    return unmatchedEntry(publication, 'title-author-year', 'Multiple candidates passed conservative verification; manual review is required.', checkedAt, 'ambiguous');
  }
  return unmatchedEntry(publication, 'title-author-year', 'No candidate passed exact title, author, and publication-year verification.', checkedAt);
}

export async function buildCitationData(publications, overrides, options = {}) {
  const checkedAt = options.checkedAt || new Date().toISOString();
  const seenKeys = new Set();
  const entries = [];
  for (const publication of publications) {
    const key = publicationKey(publication);
    if (seenKeys.has(key)) throw new Error(`Duplicate publication key: ${key}`);
    seenKeys.add(key);
    entries.push(await matchPublication(publication, {
      ...options,
      overrideId: overrides[key],
      checkedAt,
    }));
  }
  return {
    schemaVersion: 1,
    source: 'https://openalex.org',
    updatedAt: checkedAt,
    entries,
  };
}

export function validateCitationData(data, publicationCount) {
  if (data?.schemaVersion !== 1 || data?.source !== 'https://openalex.org' || !Array.isArray(data?.entries)) {
    throw new Error('Generated OpenAlex data has an invalid top-level schema.');
  }
  if (!Number.isFinite(Date.parse(data.updatedAt))) throw new Error('Generated OpenAlex data has an invalid update timestamp.');
  if (data.entries.length !== publicationCount) throw new Error('Generated OpenAlex data does not cover every publication.');
  const keys = new Set();
  for (const entry of data.entries) {
    if (!entry.publicationKey || keys.has(entry.publicationKey)) throw new Error(`Invalid or duplicate publication key: ${entry.publicationKey}`);
    keys.add(entry.publicationKey);
    if (!['matched', 'unmatched', 'ambiguous', 'invalid'].includes(entry.matchStatus)) throw new Error(`Invalid match status for ${entry.publicationKey}`);
    if (entry.matchStatus === 'matched') {
      if (!/^W\d+$/.test(entry.openAlexId || '')) throw new Error(`Invalid OpenAlex ID for ${entry.publicationKey}`);
      if (entry.openAlexUrl !== `https://openalex.org/${entry.openAlexId}`) throw new Error(`Invalid OpenAlex URL for ${entry.publicationKey}`);
      if (!Number.isInteger(entry.citedByCount) || entry.citedByCount < 0) throw new Error(`Invalid citation count for ${entry.publicationKey}`);
    } else if (entry.citedByCount !== null || entry.openAlexId !== null || entry.openAlexUrl !== null) {
      throw new Error(`Unmatched entry contains trusted OpenAlex data: ${entry.publicationKey}`);
    }
  }
}

export async function refreshCitationFile({
  inputPath,
  overridePath,
  outputPath,
  dryRun = false,
  ...options
}) {
  const publications = JSON.parse(await readFile(inputPath, 'utf8'));
  const overrides = JSON.parse(await readFile(overridePath, 'utf8'));
  const data = await buildCitationData(publications, overrides, options);
  validateCitationData(data, publications.length);
  if (!dryRun) {
    const temporaryPath = `${outputPath}.tmp`;
    await writeFile(temporaryPath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
    await rename(temporaryPath, outputPath);
  }
  return data;
}

async function main() {
  const args = new Set(process.argv.slice(2));
  const allowAnonymous = args.has('--allow-anonymous');
  const apiKey = process.env.OPENALEX_API_KEY || '';
  if (!apiKey && !allowAnonymous) throw new Error('OPENALEX_API_KEY is required.');

  const inputPath = resolve(root, 'data/publications.json');
  const overridePath = resolve(root, 'data/openalex-overrides.json');
  const outputPath = resolve(root, 'data/openalex-citations.json');
  const data = await refreshCitationFile({
    inputPath,
    overridePath,
    outputPath,
    dryRun: args.has('--dry-run'),
    apiBase: process.env.OPENALEX_API_BASE || defaultApiBase,
    apiKey,
  });

  if (args.has('--dry-run')) {
    console.log(`Validated ${data.entries.length} OpenAlex citation records without writing output.`);
    return;
  }

  const matched = data.entries.filter(entry => entry.matchStatus === 'matched').length;
  console.log(`Updated OpenAlex citations: ${matched} matched, ${data.entries.length - matched} unmatched or awaiting review.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch(error => {
    console.error(error.message);
    process.exit(1);
  });
}
