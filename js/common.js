const SITE_ROOT = document.documentElement.lang === 'ja' ? '../' : '';

function createElement(tag, options = {}) {
  const element = document.createElement(tag);
  if (options.className) element.className = options.className;
  if (options.text !== undefined) element.textContent = options.text;
  for (const [name, value] of Object.entries(options.attributes || {})) {
    if (value !== undefined && value !== null && value !== '') element.setAttribute(name, String(value));
  }
  return element;
}

function contentPath(path) {
  return `${SITE_ROOT}${path}`;
}

function safeImageSource(value) {
  if (typeof value !== 'string' || !value) return null;
  if (/^https:\/\//i.test(value)) return safeExternalUrl(value);
  if (/^[a-z][a-z\d+.-]*:/i.test(value) || value.startsWith('/') || value.split('/').includes('..')) return null;
  return contentPath(value.replace(/^\.\//, ''));
}

function safeExternalUrl(value) {
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
}

function safeInternalPath(value) {
  if (typeof value !== 'string' || !value) return null;
  if (/^[a-z][a-z\d+.-]*:/i.test(value) || value.startsWith('/') || value.split('/').includes('..')) return null;
  return value.replace(/^\.\//, '');
}

async function fetchJson(path) {
  const response = await fetch(contentPath(path), { cache: 'no-cache' });
  if (!response.ok) throw new Error(`Unable to load ${path} (${response.status})`);
  return response.json();
}

function showLoadError(container, lang = document.documentElement.lang) {
  if (!container) return;
  const message = lang === 'ja'
    ? 'コンテンツを読み込めませんでした。後でもう一度お試しください。'
    : 'This content could not be loaded. Please try again later.';
  container.replaceChildren(createElement('p', {
    className: 'status-message status-message--error',
    text: message,
    attributes: { role: 'alert' },
  }));
}

function getCurrentPage() {
  const file = window.location.pathname.split('/').pop();
  return file || 'index.html';
}

function appendExternalLink(parent, label, url, className = '') {
  const safeUrl = safeExternalUrl(url);
  if (!safeUrl) {
    parent.append(createElement('span', { className, text: label }));
    return;
  }
  parent.append(createElement('a', {
    className,
    text: label,
    attributes: { href: safeUrl, target: '_blank', rel: 'noopener noreferrer' },
  }));
}

function renderHeader(config, lang) {
  const currentPage = getCurrentPage();
  const navItems = [
    { href: 'index.html', en: 'Home', ja: 'ホーム', hasJa: true },
    { href: 'members.html', en: 'Members', ja: 'メンバー', hasJa: true },
    { href: 'projects.html', en: 'Research', ja: '研究', hasJa: true },
    { href: 'funding.html', en: 'Funding', ja: '研究助成', hasJa: true },
    { href: 'publications.html', en: 'Publications', ja: '業績', hasJa: true },
    { href: 'awards.html', en: 'Awards', ja: '受賞歴', hasJa: false },
    { href: 'opportunities.html', en: 'Join & Collaborate', ja: '進学・共同研究', hasJa: true },
    { href: 'lab-life.html', en: 'Lab Life', ja: '研究室紹介', hasJa: true },
  ];

  const header = createElement('header', { className: 'site-header' });
  const utility = createElement('div', { className: 'header-utility' });
  const bilingualPages = new Set(['index.html', 'members.html', 'projects.html', 'funding.html', 'publications.html', 'pi.html', 'opportunities.html', 'lab-life.html', 'news.html', 'news-detail.html']);
  const query = bilingualPages.has(currentPage) ? window.location.search : '';
  const languageUrl = lang === 'ja'
    ? `../${currentPage}${query}`
    : bilingualPages.has(currentPage) ? `ja/${currentPage}${query}` : 'ja/index.html';
  utility.append(createElement('a', {
    className: 'language-link',
    text: lang === 'ja' ? 'English' : '日本語',
    attributes: { href: languageUrl, hreflang: lang === 'ja' ? 'en' : 'ja' },
  }));

  const nav = createElement('nav', {
    className: 'site-nav',
    attributes: { 'aria-label': lang === 'ja' ? 'メインナビゲーション' : 'Main navigation' },
  });
  const home = createElement('a', { className: 'brand', attributes: { href: 'index.html' } });
  home.append(
    createElement('img', {
      className: 'nav-logo',
      attributes: { src: safeImageSource(config.logo), alt: '', width: 55, height: 61 },
    }),
    createElement('span', { className: 'brand-name', text: config.labName }),
  );

  const toggle = createElement('button', {
    className: 'nav-toggle',
    attributes: {
      type: 'button',
      'aria-expanded': 'false',
      'aria-controls': 'primary-navigation',
      'aria-label': lang === 'ja' ? 'メニューを開く' : 'Open menu',
    },
  });
  toggle.append(createElement('span', { className: 'nav-toggle-icon', attributes: { 'aria-hidden': 'true' } }));

  const list = createElement('ul', { className: 'nav-links', attributes: { id: 'primary-navigation' } });
  for (const item of navItems) {
    const href = lang === 'ja' && !item.hasJa ? `../${item.href}` : item.href;
    const link = createElement('a', { text: item[lang === 'ja' ? 'ja' : 'en'], attributes: { href } });
    if (currentPage === item.href) {
      link.classList.add('active');
      link.setAttribute('aria-current', 'page');
    }
    const itemElement = createElement('li');
    itemElement.append(link);
    list.append(itemElement);
  }

  toggle.addEventListener('click', () => {
    const isOpen = toggle.getAttribute('aria-expanded') === 'true';
    toggle.setAttribute('aria-expanded', String(!isOpen));
    toggle.setAttribute('aria-label', lang === 'ja'
      ? (isOpen ? 'メニューを開く' : 'メニューを閉じる')
      : (isOpen ? 'Open menu' : 'Close menu'));
    list.classList.toggle('is-open', !isOpen);
  });

  nav.append(home, toggle, list);
  header.append(utility, nav);
  return header;
}

function renderFooter(config) {
  const footer = createElement('footer', { className: 'site-footer' });
  footer.append(createElement('p', {
    text: `© ${new Date().getFullYear()} ${config.copyright}. All rights reserved.`,
  }));
  return footer;
}

async function initCommon() {
  const lang = document.documentElement.lang || 'en';
  const headerPlaceholder = document.getElementById('header-placeholder');
  const footerPlaceholder = document.getElementById('footer-placeholder');
  try {
    const config = await fetchJson(lang === 'ja' ? 'data/ja/config.json' : 'data/config.json');
    if (headerPlaceholder) headerPlaceholder.replaceWith(renderHeader(config, lang));
    if (footerPlaceholder) footerPlaceholder.replaceWith(renderFooter(config));
  } catch (error) {
    console.error(error);
    showLoadError(headerPlaceholder, lang);
  }
}

initCommon();
