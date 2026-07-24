async function renderIndex() {
  const lang = document.documentElement.lang || 'en';
  
  const configPath = lang === 'ja' ? '../data/ja/config.json' : 'data/config.json';
  const newsPath = lang === 'ja' ? '../data/news.json' : 'data/news.json';

  const [config, newsData] = await Promise.all([
    fetch(configPath).then(r => r.json()),
    fetch(newsPath).then(r => r.json()),
  ]);

  const news = newsData[lang];

  const navLogo = document.getElementById('nav-logo');
  if (navLogo) {
    navLogo.src = lang === 'ja' ? `../${config.logo}` : config.logo;
  }

  document.getElementById('about-text').textContent = config.about;
  document.getElementById('contact-email').textContent = config.contact.email;
  document.getElementById('contact-address').textContent = config.contact.address;

  const newsList = document.getElementById('news-list');
  if (newsList) {
    newsList.innerHTML = news
      .map(item => `<li><span class="date">${item.date}</span> ${item.text}</li>`)
      .join('');
  }

  const linksList = document.getElementById('links-list');
  if (linksList) {
    linksList.innerHTML = config.links
      .map(link => `<li><a href="${link.url}" target="_blank">${link.label}</a></li>`)
      .join('');
  }
}

renderIndex();
