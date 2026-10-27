import { mkdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const baseUrl = (process.env.PREVIEW_URL || 'http://127.0.0.1:8000').replace(/\/$/, '');
const outputDirectory = resolve(process.env.SCREENSHOT_DIR || 'preview-screenshots');
const moduleName = process.env.PLAYWRIGHT_MODULE || 'playwright';
const playwrightModule = await import(moduleName.startsWith('/') ? pathToFileURL(moduleName) : moduleName);
const { chromium } = playwrightModule.default || playwrightModule;

const newsData = JSON.parse(await readFile(resolve('data/news.json'), 'utf8'));
const publicationData = JSON.parse(await readFile(resolve('data/publications.json'), 'utf8'));
const openAlexData = JSON.parse(await readFile(resolve('data/openalex-citations.json'), 'utf8'));
const fundingData = JSON.parse(await readFile(resolve('data/funding.json'), 'utf8'));
const normalizeTitle = title => String(title || '')
  .normalize('NFKD')
  .toLocaleLowerCase('en')
  .replace(/[^\p{L}\p{N}]+/gu, ' ')
  .trim();
const publicationKey = publication => `${publication.year}:${normalizeTitle(publication.title)}`;
const citationCounts = new Map(openAlexData.entries
  .filter(entry => entry.matchStatus === 'matched' && Number.isInteger(entry.citedByCount))
  .map(entry => [entry.publicationKey, entry.citedByCount]));
const citationSortedTitles = direction => publicationData
  .map((publication, originalIndex) => ({ publication, originalIndex, count: citationCounts.get(publicationKey(publication)) }))
  .sort((a, b) => {
    const aMissing = !Number.isInteger(a.count);
    const bMissing = !Number.isInteger(b.count);
    if (aMissing !== bMissing) return aMissing ? 1 : -1;
    if (!aMissing && a.count !== b.count) return direction === 'desc' ? b.count - a.count : a.count - b.count;
    return a.originalIndex - b.originalIndex;
  })
  .map(({ publication }) => publication.title);
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
  'index.html', 'members.html', 'pi.html', 'publications.html', 'projects.html', 'funding.html', 'awards.html', 'opportunities.html', 'lab-life.html', 'news.html',
  'ja/index.html', 'ja/members.html', 'ja/pi.html', 'ja/publications.html', 'ja/projects.html', 'ja/funding.html', 'ja/opportunities.html', 'ja/lab-life.html', 'ja/news.html',
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
  await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: baseUrl });
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
      'funding.html': ['#funding-list .funding-item', fundingData.grants.length],
      'ja/funding.html': ['#funding-list .funding-item', fundingData.grants.length],
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
    if (['funding.html', 'ja/funding.html'].includes(pagePath)) {
      if (await page.locator('#funding-list .funding-item').count() !== fundingData.grants.length) {
        failures.push(`${viewport.name} ${pagePath}: expected ${fundingData.grants.length} funding records`);
      }
      if (await page.locator('#funding-list .funding-group').count() !== 2) {
        failures.push(`${viewport.name} ${pagePath}: funding records were not grouped into ongoing and completed sections`);
      }
      const fundingText = await page.locator('#funding-list').innerText();
      const expectedHeadings = pagePath.startsWith('ja/')
        ? ['実施中の研究助成', '終了した研究助成']
        : ['Ongoing grants', 'Completed grants'];
      if (!expectedHeadings.every(heading => fundingText.includes(heading))) {
        failures.push(`${viewport.name} ${pagePath}: localized funding group headings were missing`);
      }
      if (!fundingText.includes('Sayantan Bose') || !fundingText.includes('Shradha Kouloorkar')) {
        failures.push(`${viewport.name} ${pagePath}: the two JST LOTUS awards were not rendered as separate records`);
      }
      if (/(?:¥|円|\byen\b|grant amount|funding amount|direct costs?|indirect costs?)/i.test(fundingText)) {
        failures.push(`${viewport.name} ${pagePath}: public funding display exposed a funding amount`);
      }
    }
    if (['pi.html', 'ja/pi.html'].includes(pagePath) && await page.locator('a[href="funding.html"]').count() !== 1) {
      failures.push(`${viewport.name} ${pagePath}: missing funding portfolio link`);
    }
    if (['projects.html', 'ja/projects.html'].includes(pagePath) && await page.locator('.funding-callout a[href="funding.html"]').count() !== 1) {
      failures.push(`${viewport.name} ${pagePath}: missing research-page funding callout`);
    }
    if (pagePath.includes('news-detail.html?id=')) {
      if (!(await page.locator('#news-article-title').textContent())?.trim()) failures.push(`${viewport.name} ${pagePath}: missing article title`);
      if (!(await page.locator('#news-article-intro').textContent())?.trim()) failures.push(`${viewport.name} ${pagePath}: missing article introduction`);
      if (await page.locator('.status-message--error').count()) failures.push(`${viewport.name} ${pagePath}: article was not rendered`);
    }
    if (pagePath.endsWith('publications.html')) {
      const publicationItems = page.locator('.publication-item');
      if (await publicationItems.count() !== publicationData.length) {
        failures.push(`${viewport.name} ${pagePath}: expected ${publicationData.length} publications`);
      }
      const citationLabels = page.locator('.openalex-citation');
      if (await citationLabels.count() !== publicationData.length) {
        failures.push(`${viewport.name} ${pagePath}: expected one OpenAlex citation status per publication`);
      }
      const matchedCount = openAlexData.entries.filter(entry => entry.matchStatus === 'matched').length;
      if (await page.locator('a.openalex-citation[href^="https://openalex.org/W"]').count() !== matchedCount) {
        failures.push(`${viewport.name} ${pagePath}: verified OpenAlex links did not match generated data`);
      }
      const unmatchedCount = openAlexData.entries.length - matchedCount;
      if (await page.locator('.openalex-citation--unmatched').count() !== unmatchedCount) {
        failures.push(`${viewport.name} ${pagePath}: unmatched publications were not displayed separately from zero citations`);
      }
      if (openAlexData.entries.some(entry => entry.matchStatus === 'matched' && entry.citedByCount === 0)) {
        const zeroLabel = pagePath.startsWith('ja/') ? 'OpenAlex 被引用数: 0' : 'OpenAlex citations: 0';
        if (!await page.getByText(zeroLabel, { exact: true }).count()) {
          failures.push(`${viewport.name} ${pagePath}: verified zero-citation publication was not displayed as 0`);
        }
      }

      await page.locator('#publication-search').fill('Quantum-Secured Federated Learning');
      if (await publicationItems.count() !== 1) failures.push(`${viewport.name} ${pagePath}: title search did not return one result`);

      await page.locator('#publication-filter-reset').click();
      await page.waitForFunction(expected => document.querySelectorAll('.publication-item').length === expected, publicationData.length);
      await page.locator('#publication-year-filter').selectOption('2015');
      if (await publicationItems.count() !== 1) failures.push(`${viewport.name} ${pagePath}: year filter did not return one result`);

      await page.locator('#publication-filter-reset').click();
      await page.waitForFunction(expected => document.querySelectorAll('.publication-item').length === expected, publicationData.length);
      await page.locator('#publication-type-filter').selectOption('bookChapter');
      if (await publicationItems.count() !== 1) failures.push(`${viewport.name} ${pagePath}: type filter did not return one result`);

      await page.locator('#publication-filter-reset').click();
      await page.waitForFunction(expected => document.querySelectorAll('.publication-item').length === expected, publicationData.length);
      const sortControl = page.locator('#publication-sort');
      const publicationTitles = () => page.locator('.publication-item h4').allTextContents();

      await sortControl.selectOption('year-asc');
      const oldestYear = Math.min(...publicationData.map(item => item.year));
      if ((await publicationTitles())[0] !== publicationData.find(item => item.year === oldestYear)?.title) {
        failures.push(`${viewport.name} ${pagePath}: oldest-year sorting was incorrect`);
      }

      await sortControl.selectOption('citations-desc');
      if (JSON.stringify(await publicationTitles()) !== JSON.stringify(citationSortedTitles('desc'))) {
        failures.push(`${viewport.name} ${pagePath}: descending citation sorting was incorrect`);
      }

      await sortControl.selectOption('citations-asc');
      if (JSON.stringify(await publicationTitles()) !== JSON.stringify(citationSortedTitles('asc'))) {
        failures.push(`${viewport.name} ${pagePath}: ascending citation sorting did not keep zero valid and missing values last`);
      }

      await page.locator('#publication-year-filter').selectOption('2026');
      await page.locator('#publication-type-filter').selectOption('conference');
      const expectedCombined = publicationData.filter(item => item.year === 2026 && item.type === 'conference').length;
      if (await publicationItems.count() !== expectedCombined) {
        failures.push(`${viewport.name} ${pagePath}: combined sorting and filtering returned the wrong count`);
      }

      const sharedUrl = `${baseUrl}/${pagePath}?year=2026&type=conference&sort=citations-asc`;
      await page.goto(sharedUrl, { waitUntil: 'networkidle' });
      if (await page.locator('#publication-year-filter').inputValue() !== '2026'
        || await page.locator('#publication-type-filter').inputValue() !== 'conference'
        || await page.locator('#publication-sort').inputValue() !== 'citations-asc') {
        failures.push(`${viewport.name} ${pagePath}: shared URL state was not restored`);
      }
      const languageHref = await page.locator('.language-link').getAttribute('href');
      if (!languageHref?.includes('year=2026') || !languageHref.includes('type=conference') || !languageHref.includes('sort=citations-asc')) {
        failures.push(`${viewport.name} ${pagePath}: language switch did not preserve publication state`);
      }

      await page.locator('#publication-sort').selectOption('citations-desc');
      await page.locator('#publication-year-filter').selectOption('');
      await page.goBack();
      if (await page.locator('#publication-year-filter').inputValue() !== '2026') {
        failures.push(`${viewport.name} ${pagePath}: browser Back did not restore filter state`);
      }
      await page.goForward();
      if (await page.locator('#publication-year-filter').inputValue() !== '') {
        failures.push(`${viewport.name} ${pagePath}: browser Forward did not restore filter state`);
      }

      await page.goto(`${baseUrl}/${pagePath}?sort=invalid`, { waitUntil: 'networkidle' });
      if (await page.locator('#publication-sort').inputValue() !== 'year-desc' || new URL(page.url()).searchParams.has('sort')) {
        failures.push(`${viewport.name} ${pagePath}: invalid sort did not safely fall back to the default`);
      }

      const expectedSortLabel = pagePath.startsWith('ja/') ? '並び順' : 'Sort by';
      if (!await page.getByText(expectedSortLabel, { exact: true }).count()) {
        failures.push(`${viewport.name} ${pagePath}: localized sorting label was missing`);
      }

      await page.locator('#publication-search').fill('network');
      await page.locator('#publication-sort').selectOption('citations-desc');
      await page.locator('#publication-filter-reset').click();
      await page.waitForFunction(expected => document.querySelectorAll('.publication-item').length === expected, publicationData.length);
      if (await page.locator('#publication-sort').inputValue() !== 'year-desc' || new URL(page.url()).search) {
        failures.push(`${viewport.name} ${pagePath}: reset did not restore default controls and URL`);
      }

      await page.locator('.citation-copy-button').first().click();
      const firstPublication = publicationData[0];
      const expectedCitation = `${firstPublication.authors}. “${firstPublication.title}.” ${firstPublication.venue} (${firstPublication.year}). ${firstPublication.url}`;
      const copiedCitation = await page.evaluate(() => navigator.clipboard.readText());
      if (copiedCitation !== expectedCitation) failures.push(`${viewport.name} ${pagePath}: copied citation did not match publication metadata`);
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

    if (['index.html', 'pi.html', 'publications.html', 'projects.html', 'funding.html', 'opportunities.html', 'lab-life.html', 'news.html', 'ja/index.html', 'ja/pi.html', 'ja/publications.html', 'ja/projects.html', 'ja/funding.html', 'ja/opportunities.html', 'ja/lab-life.html', 'ja/news.html'].includes(pagePath)) {
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
