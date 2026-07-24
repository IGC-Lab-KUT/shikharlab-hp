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
  
  // プロパティ名を file ではなく href に統一してあるよ
  const navItems = [
    { href: 'index.html', label: lang === 'ja' ? 'ホーム' : 'Home', hasJa: true },
    { href: 'members.html', label: lang === 'ja' ? 'メンバー' : 'Members', hasJa: true },
    { href: 'publications.html', label: lang === 'ja' ? '業績' : 'Publications', hasJa: true },
    { href: 'projects.html', label: lang === 'ja' ? 'プロジェクト' : 'Projects', hasJa: true },
    { href: 'awards.html', label: lang === 'ja' ? '受賞歴' : 'Awards', hasJa: false },
  ];

  const navLinks = navItems.map(item => {
    const active = currentPage === item.href ? ' class="active"' : '';
    // 日本語ページにいて、かつそのページの日本語版がない場合は1階層上(../)の英語ページを指定する
    let linkHref = item.href;
    if (lang === 'ja' && !item.hasJa) {
      linkHref = '../' + item.href;
    }
    return `<li><a href="${linkHref}"${active}>${item.label}</a></li>`;
  }).join('');

  const logoPath = lang === 'ja' ? `../${config.logo}` : config.logo;
  
  // 言語切り替えリンクのロジック
  let langToggleUrl = '';
  if (lang === 'ja') {
    langToggleUrl = `../${currentPage}`;
  } else {
    const currentItem = navItems.find(item => item.href === currentPage);
    if (currentItem && currentItem.hasJa) {
      langToggleUrl = `ja/${currentPage}`;
    } else {
      langToggleUrl = 'ja/index.html';
    }
  }
  
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
