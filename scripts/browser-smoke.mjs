import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const baseUrl = (process.env.PREVIEW_URL || 'http://127.0.0.1:8000').replace(/\/$/, '');
const outputDirectory = resolve(process.env.SCREENSHOT_DIR || 'preview-screenshots');
const moduleName = process.env.PLAYWRIGHT_MODULE || 'playwright';
const playwrightModule = await import(moduleName.startsWith('/') ? pathToFileURL(moduleName) : moduleName);
const { chromium } = playwrightModule.default || playwrightModule;

const pages = [
  'index.html', 'members.html', 'pi.html', 'publications.html', 'projects.html', 'awards.html', 'opportunities.html', 'lab-life.html',
  'ja/index.html', 'ja/members.html', 'ja/pi.html', 'ja/publications.html', 'ja/projects.html', 'ja/opportunities.html', 'ja/lab-life.html',
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

    const expectedContent = {
      'members.html': ['.member-card', 1],
      'ja/members.html': ['.member-card', 1],
      'awards.html': ['.publication-item', 1],
      'projects.html': ['.research-area-card', 6],
      'ja/projects.html': ['.research-area-card', 6],
      'pi.html': ['#pi-contributions .compact-publication-item', 1],
      'ja/pi.html': ['#pi-contributions .compact-publication-item', 1],
      'opportunities.html': ['.pathway-card', 3],
      'ja/opportunities.html': ['.pathway-card', 3],
      'lab-life.html': ['.lab-gallery-item', 5],
      'ja/lab-life.html': ['.lab-gallery-item', 5],
    }[pagePath];
    if (expectedContent && await page.locator(expectedContent[0]).count() < expectedContent[1]) {
      failures.push(`${viewport.name} ${pagePath}: missing rendered content`);
    }

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

    if (['index.html', 'pi.html', 'projects.html', 'opportunities.html', 'lab-life.html', 'ja/index.html', 'ja/pi.html', 'ja/projects.html', 'ja/opportunities.html', 'ja/lab-life.html'].includes(pagePath)) {
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
