import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const args = process.argv.slice(2);
const valueAfter = flag => {
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : '';
};
const base = valueAfter('--base');
const head = valueAfter('--head') || 'HEAD';
const enforceNewsOnly = args.includes('--enforce-news-only') || args.includes('--enforce');

if (!base) {
  console.error('News scope check requires --base <git-revision>.');
  process.exit(2);
}

const result = spawnSync(
  'git',
  ['diff', '--name-status', '-z', '--find-renames', '--find-copies', `${base}...${head}`],
  { encoding: 'utf8' },
);
if (result.status !== 0) {
  console.error(result.stderr.trim() || 'Unable to determine changed files.');
  process.exit(result.status || 2);
}

const fields = result.stdout.split('\0').filter(Boolean);
const changes = [];
for (let index = 0; index < fields.length;) {
  const status = fields[index++];
  const pathCount = /^[RC]/.test(status) ? 2 : 1;
  const paths = fields.slice(index, index + pathCount);
  if (paths.length !== pathCount) {
    console.error(`Unable to parse changed path for git status ${status}.`);
    process.exit(2);
  }
  changes.push({ status, paths });
  index += pathCount;
}

const allowed = path => path === 'data/news.json' || /^data\/imgs\/news-[^/]+$/.test(path);
const violations = changes
  .filter(change => change.paths.some(path => !allowed(path)) || (change.status === 'D' && change.paths[0] === 'data/news.json'))
  .map(change => ({ ...change, reason: change.status === 'D' && change.paths[0] === 'data/news.json' ? 'the news data file cannot be deleted' : 'path is outside the routine news scope' }));

const referencedImages = new Set();
try {
  const collectImagePaths = value => {
    if (typeof value === 'string' && /^data\/imgs\/news-[^/]+$/.test(value)) referencedImages.add(value);
    else if (Array.isArray(value)) value.forEach(collectImagePaths);
    else if (value && typeof value === 'object') Object.values(value).forEach(collectImagePaths);
  };
  collectImagePaths(JSON.parse(readFileSync('data/news.json', 'utf8')));
} catch (error) {
  const newsDataDeleted = changes.some(change => change.status === 'D' && change.paths[0] === 'data/news.json');
  if (!newsDataDeleted) {
    violations.push({ status: '!', paths: ['data/news.json'], reason: `unable to read current news data (${error.message})` });
  }
}

for (const change of changes) {
  if (change.status === 'D') continue;
  const currentPath = change.paths.at(-1);
  if (/^data\/imgs\/news-[^/]+$/.test(currentPath) && !referencedImages.has(currentPath)) {
    violations.push({ ...change, reason: 'changed news photograph is not referenced by data/news.json' });
  }
}

const scope = changes.length && !violations.length ? 'routine-news' : changes.length ? 'structural' : 'none';

if (!changes.length) {
  console.log('News scope: no changed files detected.');
} else if (!violations.length) {
  console.log(`News scope: routine news-only update (${changes.length} changed file(s)).`);
  changes.forEach(change => console.log(`- [${change.status}] ${change.paths.join(' -> ')}`));
} else {
  console.log('News scope: structural or mixed update; CODEOWNERS review is required.');
  violations.forEach(change => console.log(`- [${change.status}] ${change.paths.join(' -> ')} (${change.reason})`));
}

console.log(`NEWS_CHANGE_SCOPE=${scope}`);

if (enforceNewsOnly && scope !== 'routine-news') {
  console.error('A routine news update may change only data/news.json and direct data/imgs/news-* files. Structural changes require professor review.');
  process.exit(1);
}

