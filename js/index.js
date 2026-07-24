async function renderIndex() {
  // HTMLのlang属性から現在の言語を取得（デフォルトは 'en'）
  const lang = document.documentElement.lang || 'en';
  
  // パスの設定
  // config.jsonはディレクトリ分離（日本語なら ../data/ja/、英語なら data/）
  const configPath = lang === 'ja' ? '../data/ja/config.json' : 'data/config.json';
  // news.jsonは共通ファイル（日本語HTMLからは1つ上の階層になるため ../data/news.json）
  const newsPath = lang === 'ja' ? '../data/news.json' : 'data/news.json';

  const [config, newsData] = await Promise.all([
    fetch(configPath).then(r => r.json()),
    fetch(newsPath).then(r => r.json()),
  ]);

  // news.jsonのデータから、現在の言語の配列だけを抽出する
  const news = newsData[lang];

  const heroLogo = document.getElementById('hero-logo');
  if (heroLogo) {
    // 日本語(ja/)から読み込む場合は画像のパスを調整
    heroLogo.src = lang === 'ja' ? `../${config.logo}` : config.logo;
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
