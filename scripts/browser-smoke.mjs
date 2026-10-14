import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const baseUrl = (process.env.PREVIEW_URL || 'http://127.0.0.1:8000').replace(/\/$/, '');
const outputDirectory = resolve(process.env.SCREENSHOT_DIR || 'preview-screenshots');
const moduleName = process.env.PLAYWRIGHT_MODULE || 'playwright';
const { chromium } = await import(moduleName.startsWith('/') ? pathToFileURL(moduleName) : moduleName);

const pages = [
  'index.html', 'members.html', 'publications.html', 'projects.html', 'awards.html',
  'ja/index.html', 'ja/members.html', 'ja/publications.html', 'ja/projects.html',
];
const viewports = [
  { name: 'desktop', width: 1440, height: 1000 },
  { name: 'mobile', width: 375, height: 812 },
];
const failures = [];

await mkdir(outputDirectory, { recursive: true });
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.CHROMIUM_PATH || undefined,
});

for (const viewport of viewports) {
  const context = await browser.newContext({ viewport });
  for (const pagePath of pages) {
    const page = await context.newPage();
    const consoleErrors = [];
    page.on('console', message => {
      if (message.type() === 'error') consoleErrors.push(message.text());
    });
    page.on('pageerror', error => consoleErrors.push(error.message));

    const response = await page.goto(`${baseUrl}/${pagePath}`, { waitUntil: 'networkidle' });
    if (!response?.ok()) failures.push(`${viewport.name} ${pagePath}: HTTP ${response?.status()}`);
    if (consoleErrors.length) failures.push(`${viewport.name} ${pagePath}: ${consoleErrors.join(' | ')}`);
    if (await page.locator('h1').count() !== 1) failures.push(`${viewport.name} ${pagePath}: expected one h1`);
    if (await page.locator('header').count() !== 1) failures.push(`${viewport.name} ${pagePath}: missing header`);
    if (await page.locator('footer').count() !== 1) failures.push(`${viewport.name} ${pagePath}: missing footer`);

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
    if (overflow) failures.push(`${viewport.name} ${pagePath}: horizontal overflow`);

    if (viewport.name === 'mobile') {
      const toggle = page.locator('.nav-toggle');
      if (!(await toggle.isVisible())) failures.push(`mobile ${pagePath}: navigation toggle is not visible`);
      else {
        await toggle.click();
        if (await toggle.getAttribute('aria-expanded') !== 'true') {
          failures.push(`mobile ${pagePath}: navigation toggle did not open`);
        }
      }
    }

    if (['index.html', 'members.html', 'projects.html', 'ja/index.html', 'ja/members.html', 'ja/projects.html'].includes(pagePath)) {
      const name = pagePath.replaceAll('/', '-').replace('.html', '') || 'index';
      await page.screenshot({ path: resolve(outputDirectory, `${name}-${viewport.name}.png`), fullPage: true });
    }
    await page.close();
  }
  await context.close();
}

await browser.close();

if (failures.length) {
  console.error(`Browser tests failed with ${failures.length} issue(s):`);
  failures.forEach(failure => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(`Browser tests passed: ${pages.length} pages × ${viewports.length} viewports. Screenshots: ${outputDirectory}`);
