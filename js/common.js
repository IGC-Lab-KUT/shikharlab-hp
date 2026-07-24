async function loadConfig(lang) {
  const path = lang === 'ja' ? '../data/ja/config.json' : 'data/config.json';
  const res = await fetch(path);
  return res.json();
}

function getCurrentPage() {
  const path = window.location.pathname;
  const file = path.split('/').pop();
  return file === '' ? 'index.html' : file;
}

function renderHeader(config, lang) {
  const currentPage = getCurrentPage();
  
  const navItems = [
    { href: 'index.html', label: lang === 'ja' ? 'ホーム' : 'Home' },
    { href: 'members.html', label: lang === 'ja' ? 'メンバー' : 'Members' },
    { href: 'publications.html', label: lang === 'ja' ? '業績' : 'Publications' },
    { href: 'projects.html', label: lang === 'ja' ? 'プロジェクト' : 'Projects' },
    { href: 'awards.html', label: lang === 'ja' ? '受賞歴' : 'Awards' },
  ];
  const navLinks = navItems.map(item => {
    const active = currentPage === item.href ? ' class="active"' : '';
    return `<li><a href="${item.href}"${active}>${item.label}</a></li>`;
  }).join('');

  const logoPath = lang === 'ja' ? `../${config.logo}` : config.logo;
  
  const langToggleUrl = lang === 'ja' ? `../${currentPage}` : `ja/${currentPage}`;
  const langToggleText = lang === 'ja' ? 'English' : '日本語';

  return `<header>
    <div style="text-align: right; padding: 5px 10px;">
      <a href="${langToggleUrl}">${langToggleText}</a>
    </div>
    <nav>
      <div class="logo">
        <img src="${logoPath}" alt="${config.labName} Logo" class="nav-logo" id="nav-logo"> 
        ${config.labName}
      </div>
      <ul class="nav-links">${navLinks}</ul>
    </nav>
  </header>`;
}

function renderFooter(config) {
  const year = new Date().getFullYear();
  return `<footer><p>&copy; ${year} ${config.copyright}. All rights reserved.</p></footer>`;
}

async function initCommon() {
  const lang = document.documentElement.lang || 'en';
  const config = await loadConfig(lang);
  
  const headerObj = document.getElementById('header-placeholder');
  if (headerObj) {
    headerObj.outerHTML = renderHeader(config, lang);
  }
  
  const footerObj = document.getElementById('footer-placeholder');
  if (footerObj) {
    footerObj.outerHTML = renderFooter(config);
  }
}

initCommon();
