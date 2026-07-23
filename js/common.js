async function loadConfig() {
  const res = await fetch('data/config.json');
  return res.json();
}

function getCurrentPage() {
  const path = window.location.pathname;
  const file = path.split('/').pop();
  return file === '' ? 'index.html' : file;
}

function renderHeader(config) {
  const currentPage = getCurrentPage();
  const navItems = [
    { href: 'index.html', label: 'Home' },
    { href: 'members.html', label: 'Members' },
    { href: 'publications.html', label: 'Publications' },
    { href: 'projects.html', label: 'Projects' },
    { href: 'awards.html', label: 'Awards' },
  ];
  const navLinks = navItems.map(item => {
    const active = currentPage === item.href ? ' class="active"' : '';
    return `<li><a href="${item.href}"${active}>${item.label}</a></li>`;
  }).join('');

  return `<header>
      <nav>
        <a href="index.html" class="logo">
        <img id="nav-logo" class="nav-logo" alt="Shikhar Lab Logo">
      </a>
    </nav>
  </header>`;
}

function renderFooter(config) {
  const year = new Date().getFullYear();
  return `<footer><p>&copy; ${year} ${config.copyright}. All rights reserved.</p></footer>`;
}

async function initCommon() {
  const config = await loadConfig();
  document.getElementById('header-placeholder').outerHTML = renderHeader(config);
  document.getElementById('footer-placeholder').outerHTML = renderFooter(config);
}

initCommon();
