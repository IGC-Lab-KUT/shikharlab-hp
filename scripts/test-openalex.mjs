import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  buildCitationData,
  refreshCitationFile,
  requestJson,
  validateCitationData,
} from './update-openalex-citations.mjs';

const publications = [
  {
    year: 2024,
    type: 'journal',
    title: 'A DOI Matched Work',
    authors: 'Shikhar Verma, Yuichi Kawamoto, and Nei Kato',
    venue: 'Test Journal',
    url: 'https://doi.org/10.1234/example.1',
  },
  {
    year: 2023,
    type: 'conference',
    title: 'A Conservatively Matched Work',
    authors: 'Shikhar Verma, Yuichi Kawamoto, and Nei Kato',
    venue: 'Test Conference',
    url: '',
  },
  {
    year: 2022,
    type: 'conference',
    title: 'A Missing Work',
    authors: 'Shikhar Verma, Yuichi Kawamoto, and Nei Kato',
    venue: 'Test Conference',
    url: '',
  },
];

function work({ id, doi = null, title, year, count }) {
  return {
    id: `https://openalex.org/${id}`,
    doi,
    display_name: title,
    publication_year: year,
    cited_by_count: count,
    authorships: ['Shikhar Verma', 'Yuichi Kawamoto', 'Nei Kato']
      .map(display_name => ({ author: { display_name } })),
  };
}

function successFetch(url) {
  const request = new URL(url);
  if (request.pathname.includes('10.1234/example.1')) {
    return Promise.resolve(new Response(JSON.stringify(work({
      id: 'W100',
      doi: 'https://doi.org/10.1234/example.1',
      title: 'A DOI Matched Work',
      year: 2024,
      count: 0,
    })), { status: 200 }));
  }
  if (request.searchParams.get('search') === 'A Conservatively Matched Work') {
    return Promise.resolve(new Response(JSON.stringify({ results: [work({
      id: 'W200',
      title: 'A Conservatively Matched Work',
      year: 2023,
      count: 12,
    })] }), { status: 200 }));
  }
  return Promise.resolve(new Response(JSON.stringify({ results: [] }), { status: 200 }));
}

const generated = await buildCitationData(publications, {}, {
  apiBase: 'https://api.test.invalid',
  apiKey: 'not-logged-test-key',
  fetchImpl: successFetch,
  checkedAt: '2026-10-16T00:00:00.000Z',
});
validateCitationData(generated, publications.length);
assert.equal(generated.entries[0].matchStatus, 'matched');
assert.equal(generated.entries[0].citedByCount, 0, 'zero citations must remain a verified numeric value');
assert.equal(generated.entries[1].matchStatus, 'matched');
assert.equal(generated.entries[1].citedByCount, 12);
assert.equal(generated.entries[2].matchStatus, 'unmatched');
assert.equal(generated.entries[2].citedByCount, null, 'missing matches must not be represented as zero');

let rateLimitRequests = 0;
const recovered = await requestJson(new URL('https://api.test.invalid/works/W300'), {
  fetchImpl: () => {
    rateLimitRequests += 1;
    if (rateLimitRequests === 1) {
      return Promise.resolve(new Response('rate limited', {
        status: 429,
        headers: { 'retry-after': '0' },
      }));
    }
    return Promise.resolve(new Response('{"recovered":true}', { status: 200 }));
  },
});
assert.deepEqual(recovered, { recovered: true });
assert.equal(rateLimitRequests, 2, 'HTTP 429 responses must be retried');

const directory = await mkdtemp(join(tmpdir(), 'openalex-test-'));
try {
  const inputPath = join(directory, 'publications.json');
  const overridePath = join(directory, 'overrides.json');
  const outputPath = join(directory, 'citations.json');
  const previous = '{"previous":"valid"}\n';
  await Promise.all([
    writeFile(inputPath, JSON.stringify(publications), 'utf8'),
    writeFile(overridePath, '{}', 'utf8'),
    writeFile(outputPath, previous, 'utf8'),
  ]);
  const failingFetch = () => Promise.resolve(new Response('unavailable', {
    status: 503,
    headers: { 'retry-after': '0' },
  }));
  await assert.rejects(refreshCitationFile({
    inputPath,
    overridePath,
    outputPath,
    apiBase: 'https://api.test.invalid',
    apiKey: 'not-logged-test-key',
    fetchImpl: failingFetch,
  }), /HTTP 503/);
  assert.equal(await readFile(outputPath, 'utf8'), previous, 'API failure must preserve the previous generated file');
} finally {
  await rm(directory, { recursive: true, force: true });
}

console.log('OpenAlex tests passed: DOI, conservative match, missing match, zero citations, rate-limit retry, and failure preservation.');
