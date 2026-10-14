import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, extname, join, relative, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const failures = [];

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
