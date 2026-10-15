import { spawnSync } from 'node:child_process';

const args = process.argv.slice(2);
const valueAfter = flag => {
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : '';
};
const base = valueAfter('--base');
const head = valueAfter('--head') || 'HEAD';
const enforce = args.includes('--enforce');

if (!base) {
  console.error('News scope check requires --base <git-revision>.');
  process.exit(2);
}

const result = spawnSync('git', ['diff', '--name-only', '--diff-filter=ACMR', `${base}...${head}`], { encoding: 'utf8' });
if (result.status !== 0) {
  console.error(result.stderr.trim() || 'Unable to determine changed files.');
  process.exit(result.status || 2);
}

const files = result.stdout.split(/\r?\n/).filter(Boolean);
const allowed = path => path === 'data/news.json' || /^data\/imgs\/news-[^/]+$/.test(path);
const unexpected = files.filter(path => !allowed(path));

if (!files.length) {
  console.log('News scope: no changed files detected.');
} else if (!unexpected.length) {
  console.log(`News scope: routine news-only update (${files.length} changed file(s)).`);
} else {
  console.log('News scope: structural or mixed update. Files outside the routine news scope:');
  unexpected.forEach(path => console.log(`- ${path}`));
}

if (enforce && unexpected.length) {
  console.error('Branches beginning with news/ may change only data/news.json and data/imgs/news-* files. Ask the repository owner to review structural changes.');
  process.exit(1);
}

