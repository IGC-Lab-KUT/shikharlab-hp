import { mkdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const baseUrl = (process.env.PREVIEW_URL || 'http://127.0.0.1:8000').replace(/\/$/, '');
const outputDirectory = resolve(process.env.SCREENSHOT_DIR || 'preview-screenshots');
const moduleName = process.env.PLAYWRIGHT_MODULE || 'playwright';
const playwrightModule = await import(moduleName.startsWith('/') ? pathToFileURL(moduleName) : moduleName);
const { chromium } = playwrightModule.default || playwrightModule;

const newsData = JSON.parse(await readFile(resolve('data/news.json'), 'utf8'));
const detailedNewsIds = newsData.items
  .filter(item => item.status === 'published' && (
    item.content?.en?.length
    || item.content?.ja?.length
    || item.featuredImage
    || item.images?.length
    || item.links?.length
    || item.relatedPublications?.length
    || item.relatedProjects?.length
  ))
  .map(item => item.id);
const articlePages = detailedNewsIds.flatMap(id => [
  `news-detail.html?id=${encodeURIComponent(id)}`,
  `ja/news-detail.html?id=${encodeURIComponent(id)}`,
]);
const pages = [
  'index.html', 'members.html', 'pi.html', 'publications.html', 'projects.html', 'awards.html', 'opportunities.html', 'lab-life.html', 'news.html',
  'ja/index.html', 'ja/members.html', 'ja/pi.html', 'ja/publications.html', 'ja/projects.html', 'ja/opportunities.html', 'ja/lab-life.html', 'ja/news.html',
  ...articlePages,
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
    if (await page.locator('body > header').count() !== 1) failures.push(`${viewport.name} ${pagePath}: missing site header`);
    if (await page.locator('body > footer').count() !== 1) failures.push(`${viewport.name} ${pagePath}: missing site footer`);

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
      'news.html': ['.news-card', 3],
      'ja/news.html': ['.news-card', 3],
    }[pagePath];
    if (expectedContent && await page.locator(expectedContent[0]).count() < expectedContent[1]) {
      failures.push(`${viewport.name} ${pagePath}: missing rendered content`);
    }
    if (pagePath.includes('news-detail.html?id=')) {
      if (!(await page.locator('#news-article-title').textContent())?.trim()) failures.push(`${viewport.name} ${pagePath}: missing article title`);
      if (!(await page.locator('#news-article-intro').textContent())?.trim()) failures.push(`${viewport.name} ${pagePath}: missing article introduction`);
      if (await page.locator('.status-message--error').count()) failures.push(`${viewport.name} ${pagePath}: article was not rendered`);
    }

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
    if (overflow) failures.push(`${viewport.name} ${pagePath}: horizontal overflow`);

    const enlargeButton = page.locator('.news-image-button').first();
    if (await enlargeButton.count()) {
      await enlargeButton.click();
      const lightbox = page.locator('.news-lightbox[open]');
      if (!(await lightbox.isVisible())) failures.push(`${viewport.name} ${pagePath}: image lightbox did not open`);
      await page.keyboard.press('Escape');
      if (await lightbox.count()) failures.push(`${viewport.name} ${pagePath}: image lightbox did not close with Escape`);
    }

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

    if (['index.html', 'pi.html', 'projects.html', 'opportunities.html', 'lab-life.html', 'news.html', 'ja/index.html', 'ja/pi.html', 'ja/projects.html', 'ja/opportunities.html', 'ja/lab-life.html', 'ja/news.html'].includes(pagePath)) {
      const name = pagePath.replaceAll('/', '-').replaceAll('?', '-').replaceAll('=', '-').replace('.html', '') || 'index';
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

console.log(`Browser tests passed: ${pages.length} pages × ${viewports.length} viewports, including ${detailedNewsIds.length} published detailed news item(s). Screenshots: ${outputDirectory}`);
