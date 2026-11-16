import { readFile, rename, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const defaultApiBase = 'https://pub.orcid.org/v3.0';
const defaultOrcidId = '0000-0002-9905-3772';
const retryableStatuses = new Set([429, 500, 502, 503, 504]);

export function normalizeText(value = '') {
  return String(value)
    .normalize('NFKD')
    .toLocaleLowerCase('en')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

export function normalizeDoi(value = '') {
  const doi = String(value)
    .trim()
    .replace(/^https?:\/\/(?:dx\.)?doi\.org\//i, '')
    .toLocaleLowerCase('en');
  return /^10\.\d{4,9}\/\S+$/i.test(doi) ? doi : null;
}

function externalIds(work = {}) {
  return work?.['external-ids']?.['external-id'] || [];
}

export function workDoi(work) {
  const entry = externalIds(work).find(item => String(item?.['external-id-type']).toLocaleLowerCase('en') === 'doi');
  return normalizeDoi(entry?.['external-id-normalized']?.value || entry?.['external-id-value']);
}

export function publicationDoi(publication) {
  return normalizeDoi(publication?.url);
}

function delay(milliseconds) {
  return new Promise(resolveDelay => setTimeout(resolveDelay, milliseconds));
}

function retryDelay(response, attempt) {
  const retryAfter = Number(response.headers.get('retry-after'));
  if (Number.isFinite(retryAfter) && retryAfter >= 0) return Math.min(retryAfter * 1000, 30_000);
  return Math.min(750 * (2 ** attempt), 10_000);
}

export async function requestJson(url, { fetchImpl = fetch, accessToken = '', attempts = 4 } = {}) {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    let response;
    try {
      const headers = {
        Accept: 'application/vnd.orcid+json',
        'User-Agent': 'shikharlab-hp-orcid-discovery/1.0',
      };
      if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
      response = await fetchImpl(url, { headers, signal: AbortSignal.timeout(20_000) });
    } catch (error) {
      if (attempt === attempts - 1) throw new Error(`ORCID request failed after ${attempts} attempts: ${error.message}`);
      await delay(Math.min(750 * (2 ** attempt), 10_000));
      continue;
    }
    if (response.ok) return response.json();
    if (!retryableStatuses.has(response.status) || attempt === attempts - 1) {
      throw new Error(`ORCID request failed with HTTP ${response.status}`);
    }
    await delay(retryDelay(response, attempt));
  }
  throw new Error('ORCID request failed');
}

function apiUrl(apiBase, orcidId, path) {
  return new URL(`${encodeURIComponent(orcidId)}/${path}`, `${apiBase.replace(/\/$/, '')}/`);
}

function preferredSummary(group) {
  return [...(group?.['work-summary'] || [])]
    .sort((a, b) => Number(b?.['display-index'] || 0) - Number(a?.['display-index'] || 0))[0] || null;
}

function titleOf(work) {
  return work?.title?.title?.value?.trim() || '';
}

function yearOf(work) {
  const value = Number(work?.['publication-date']?.year?.value);
  return Number.isInteger(value) ? value : null;
}

function timestamp(value) {
  const number = Number(value?.value);
  return Number.isFinite(number) ? new Date(number).toISOString() : null;
}

function candidateId(summary) {
  const doi = workDoi(summary);
  return doi ? `doi:${doi}` : `orcid:${summary?.['put-code']}`;
}

function mappedType(orcidType) {
  if (orcidType === 'journal-article') return 'journal';
  if (['conference-paper', 'conference-abstract', 'conference-poster'].includes(orcidType)) return 'conference';
  if (orcidType === 'book-chapter') return 'bookChapter';
  return null;
}

function contributorNames(work) {
  return (work?.contributors?.contributor || [])
    .filter(item => !item?.['contributor-attributes']?.['contributor-role'] || item['contributor-attributes']['contributor-role'] === 'author')
    .map(item => item?.['credit-name']?.value?.trim())
    .filter(Boolean);
}

function buildCandidate(summary, detail, previous, discoveredAt) {
  const doi = workDoi(detail) || workDoi(summary);
  const authors = contributorNames(detail);
  const venue = detail?.['journal-title']?.value?.trim() || summary?.['journal-title']?.value?.trim() || '';
  const url = doi ? `https://doi.org/${doi}` : (detail?.url?.value || summary?.url?.value || '');
  const type = mappedType(detail?.type || summary?.type);
  const title = titleOf(detail) || titleOf(summary);
  const year = yearOf(detail) || yearOf(summary);
  return {
    id: candidateId(summary),
    status: 'candidate',
    orcidPutCode: summary['put-code'],
    orcidType: detail?.type || summary?.type || null,
    orcidLastModifiedAt: timestamp(summary?.['last-modified-date']),
    discoveredAt: previous?.discoveredAt || discoveredAt,
    doi,
    title,
    year,
    authors,
    venue,
    url,
    suggestedPublication: title && year && type && authors.length && venue && url
      ? { year, type, title, authors: authors.join(', '), venue, url }
      : null,
  };
}

function knownPublicationSets(publications) {
  return {
    dois: new Set(publications.map(publicationDoi).filter(Boolean)),
    titles: new Set(publications.map(item => normalizeText(item.title)).filter(Boolean)),
  };
}

export async function buildCandidateData(publications, previousData = {}, options = {}) {
  const orcidId = options.orcidId || defaultOrcidId;
  const apiBase = options.apiBase || defaultApiBase;
  const discoveredAt = options.discoveredAt || new Date().toISOString();
  const requestOptions = { fetchImpl: options.fetchImpl, accessToken: options.accessToken };
  const works = await requestJson(apiUrl(apiBase, orcidId, 'works'), requestOptions);
  const known = knownPublicationSets(publications);
  const previous = new Map((previousData?.candidates || []).map(item => [item.id, item]));
  const candidates = [];

  for (const group of works?.group || []) {
    const summary = preferredSummary(group);
    if (!summary || !titleOf(summary)) continue;
    const doi = workDoi(summary);
    if ((doi && known.dois.has(doi)) || known.titles.has(normalizeText(titleOf(summary)))) continue;
    const putCode = Number(summary['put-code']);
    if (!Number.isInteger(putCode)) continue;
    const detail = await requestJson(apiUrl(apiBase, orcidId, `work/${putCode}`), requestOptions);
    candidates.push(buildCandidate(summary, detail, previous.get(candidateId(summary)), discoveredAt));
  }

  candidates.sort((a, b) => (b.year || 0) - (a.year || 0) || a.title.localeCompare(b.title, 'en'));
  return {
    schemaVersion: 1,
    orcidId,
    source: `https://orcid.org/${orcidId}`,
    sourceLastModifiedAt: timestamp(works?.['last-modified-date']),
    candidates,
  };
}

export function validateCandidateData(data) {
  if (data?.schemaVersion !== 1 || !/^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$/.test(data?.orcidId || '')) {
    throw new Error('Generated ORCID candidate data has an invalid top-level schema.');
  }
  if (data.source !== `https://orcid.org/${data.orcidId}` || !Array.isArray(data.candidates)) {
    throw new Error('Generated ORCID candidate data has an invalid source or candidates list.');
  }
  const ids = new Set();
  for (const item of data.candidates) {
    if (!item.id || ids.has(item.id)) throw new Error(`Invalid or duplicate ORCID candidate ID: ${item.id}`);
    ids.add(item.id);
    if (item.status !== 'candidate' || !Number.isInteger(item.orcidPutCode)) throw new Error(`Invalid candidate status or put code: ${item.id}`);
    if (!item.title || !Number.isInteger(item.year) || !Number.isFinite(Date.parse(item.discoveredAt))) throw new Error(`Incomplete ORCID candidate: ${item.id}`);
    if (item.doi && item.id !== `doi:${item.doi}`) throw new Error(`Candidate DOI and ID differ: ${item.id}`);
    if (item.url && !/^https:\/\//.test(item.url)) throw new Error(`Candidate URL must use HTTPS: ${item.id}`);
    if (item.suggestedPublication) {
      const suggestion = item.suggestedPublication;
      if (!['journal', 'conference', 'bookChapter'].includes(suggestion.type)
        || suggestion.title !== item.title || suggestion.year !== item.year
        || !suggestion.authors || !suggestion.venue || !/^https:\/\//.test(suggestion.url)) {
        throw new Error(`Invalid suggested publication: ${item.id}`);
      }
    }
  }
}

export async function refreshCandidateFile({ inputPath, outputPath, dryRun = false, ...options }) {
  const publications = JSON.parse(await readFile(inputPath, 'utf8'));
  let previous = {};
  try { previous = JSON.parse(await readFile(outputPath, 'utf8')); } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  const data = await buildCandidateData(publications, previous, options);
  validateCandidateData(data);
  if (!dryRun) {
    const temporary = `${outputPath}.tmp`;
    await writeFile(temporary, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
    await rename(temporary, outputPath);
  }
  return data;
}

async function main() {
  const inputPath = resolve(root, 'data/publications.json');
  const outputPath = resolve(root, 'data/orcid-publication-candidates.json');
  const data = await refreshCandidateFile({
    inputPath,
    outputPath,
    orcidId: process.env.ORCID_ID || defaultOrcidId,
    apiBase: process.env.ORCID_API_BASE || defaultApiBase,
    accessToken: process.env.ORCID_ACCESS_TOKEN || '',
  });
  console.log(`ORCID discovery completed: ${data.candidates.length} unpublished candidate(s) found.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch(error => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
