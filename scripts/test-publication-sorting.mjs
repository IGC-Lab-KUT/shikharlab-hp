import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const {
  publicationKey,
  sortPublications,
  validPublicationSort,
} = require('../js/publications.js');

const publications = [
  { title: 'Older missing', authors: 'A', venue: 'V', year: 2024, originalIndex: 0 },
  { title: 'Newer zero', authors: 'B', venue: 'V', year: 2026, originalIndex: 1 },
  { title: 'Newer five first', authors: 'C', venue: 'V', year: 2026, originalIndex: 2 },
  { title: 'Newer five second', authors: 'D', venue: 'V', year: 2026, originalIndex: 3 },
  { title: 'Oldest two', authors: 'E', venue: 'V', year: 2023, originalIndex: 4 },
];
const citations = new Map([
  [publicationKey(publications[1]), { citedByCount: 0 }],
  [publicationKey(publications[2]), { citedByCount: 5 }],
  [publicationKey(publications[3]), { citedByCount: 5 }],
  [publicationKey(publications[4]), { citedByCount: 2 }],
]);
const titles = items => items.map(item => item.title);

assert.deepEqual(titles(sortPublications(publications, 'year-desc', citations)), [
  'Newer zero', 'Newer five first', 'Newer five second', 'Older missing', 'Oldest two',
]);
assert.deepEqual(titles(sortPublications(publications, 'year-asc', citations)), [
  'Oldest two', 'Older missing', 'Newer zero', 'Newer five first', 'Newer five second',
]);
assert.deepEqual(titles(sortPublications(publications, 'citations-desc', citations)), [
  'Newer five first', 'Newer five second', 'Oldest two', 'Newer zero', 'Older missing',
]);
assert.deepEqual(titles(sortPublications(publications, 'citations-asc', citations)), [
  'Newer zero', 'Oldest two', 'Newer five first', 'Newer five second', 'Older missing',
]);
assert.equal(validPublicationSort('not-a-sort'), 'year-desc');
assert.equal(validPublicationSort('citations-desc'), 'citations-desc');

console.log('Publication sorting tests passed: four modes, numeric zero, missing counts, ties, and invalid fallback.');
