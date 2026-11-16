import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  buildCandidateData,
  refreshCandidateFile,
  requestJson,
  validateCandidateData,
} from './discover-orcid-publications.mjs';

const publications = [
  {
    year: 2025,
    type: 'journal',
    title: 'Already Published by DOI',
    authors: 'Shikhar Verma',
    venue: 'Test Journal',
    url: 'https://doi.org/10.1234/already',
  },
  {
    year: 2024,
    type: 'conference',
    title: 'Already Published by Exact Title',
    authors: 'Shikhar Verma',
    venue: 'Test Conference',
    url: 'https://example.org/paper',
  },
];

function summary({ putCode, title, year, doi = null, type = 'journal-article' }) {
  return {
    'put-code': putCode,
    'display-index': '1',
    'last-modified-date': { value: Date.parse('2026-11-16T00:00:00.000Z') },
    title: { title: { value: title } },
    type,
    'publication-date': { year: { value: String(year) } },
    'journal-title': { value: 'IEEE Test Journal' },
    'external-ids': { 'external-id': doi ? [{ 'external-id-type': 'doi', 'external-id-value': doi }] : [] },
  };
}

function detail(item, authors = ['First Author', 'Shikhar Verma']) {
  return {
    ...item,
    contributors: {
      contributor: authors.map(value => ({
        'credit-name': { value },
        'contributor-attributes': { 'contributor-role': 'author' },
      })),
    },
    url: { value: `https://doi.org/${item['external-ids']['external-id'][0]?.['external-id-value'] || '10.1234/fallback'}` },
  };
}

const knownDoi = summary({ putCode: 1, title: 'Different ORCID Title', year: 2025, doi: '10.1234/already' });
const knownTitle = summary({ putCode: 2, title: 'Already Published by Exact Title', year: 2024, doi: '10.1234/other' });
const newWork = summary({ putCode: 3, title: 'A Newly Discovered Work', year: 2026, doi: '10.1234/new' });
const incompleteWork = summary({ putCode: 4, title: 'A Work Requiring Review', year: 2026, type: 'other' });
const worksPayload = {
  'last-modified-date': { value: Date.parse('2026-11-16T01:00:00.000Z') },
  group: [knownDoi, knownTitle, newWork, incompleteWork].map(item => ({ 'work-summary': [item] })),
};

function successFetch(url) {
  const path = new URL(url).pathname;
  if (path.endsWith('/works')) return Promise.resolve(new Response(JSON.stringify(worksPayload), { status: 200 }));
  if (path.endsWith('/work/3')) return Promise.resolve(new Response(JSON.stringify(detail(newWork)), { status: 200 }));
  if (path.endsWith('/work/4')) return Promise.resolve(new Response(JSON.stringify({ ...incompleteWork, contributors: { contributor: [] } }), { status: 200 }));
  return Promise.resolve(new Response('not found', { status: 404 }));
}

const data = await buildCandidateData(publications, {}, {
  apiBase: 'https://orcid.test.invalid/v3.0',
  orcidId: '0000-0002-9905-3772',
  fetchImpl: successFetch,
  discoveredAt: '2026-11-16T02:00:00.000Z',
});
validateCandidateData(data);
assert.equal(data.candidates.length, 2, 'existing DOI and exact-title records must be excluded');
assert.equal(data.candidates[0].id, 'doi:10.1234/new');
assert.deepEqual(data.candidates[0].suggestedPublication, {
  year: 2026,
  type: 'journal',
  title: 'A Newly Discovered Work',
  authors: 'First Author, Shikhar Verma',
  venue: 'IEEE Test Journal',
  url: 'https://doi.org/10.1234/new',
});
assert.equal(data.candidates[1].suggestedPublication, null, 'incomplete metadata must require manual review');

const preserved = await buildCandidateData(publications, {
  candidates: [{ id: 'doi:10.1234/new', discoveredAt: '2026-11-15T00:00:00.000Z' }],
}, {
  apiBase: 'https://orcid.test.invalid/v3.0',
  orcidId: '0000-0002-9905-3772',
  fetchImpl: successFetch,
  discoveredAt: '2026-11-16T02:00:00.000Z',
});
assert.equal(preserved.candidates[0].discoveredAt, '2026-11-15T00:00:00.000Z', 'discovery timestamps must remain stable');

let requests = 0;
const retried = await requestJson(new URL('https://orcid.test.invalid/works'), {
  fetchImpl: () => {
    requests += 1;
    return Promise.resolve(requests === 1
      ? new Response('rate limited', { status: 429, headers: { 'retry-after': '0' } })
      : new Response('{"ok":true}', { status: 200 }));
  },
});
assert.deepEqual(retried, { ok: true });
assert.equal(requests, 2, 'rate-limited requests must be retried');

const directory = await mkdtemp(join(tmpdir(), 'orcid-discovery-test-'));
try {
  const inputPath = join(directory, 'publications.json');
  const outputPath = join(directory, 'candidates.json');
  const previous = '{"previous":"valid"}\n';
  await Promise.all([
    writeFile(inputPath, JSON.stringify(publications), 'utf8'),
    writeFile(outputPath, previous, 'utf8'),
  ]);
  await assert.rejects(refreshCandidateFile({
    inputPath,
    outputPath,
    apiBase: 'https://orcid.test.invalid/v3.0',
    orcidId: '0000-0002-9905-3772',
    fetchImpl: () => Promise.resolve(new Response('unavailable', { status: 503, headers: { 'retry-after': '0' } })),
  }), /HTTP 503/);
  assert.equal(await readFile(outputPath, 'utf8'), previous, 'API failures must preserve the previous candidate file');
} finally {
  await rm(directory, { recursive: true, force: true });
}

console.log('ORCID discovery tests passed: DOI/title deduplication, candidate generation, manual-review fallback, stable timestamps, retry, and failure preservation.');
