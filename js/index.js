async function renderIndex() {
  const lang = document.documentElement.lang || 'en';
  const main = document.querySelector('main');
  try {
    const [config, newsData] = await Promise.all([
      fetchJson(lang === 'ja' ? 'data/ja/config.json' : 'data/config.json'),
      fetchJson('data/news.json'),
    ]);

    document.getElementById('about-text').textContent = config.about;
    document.getElementById('contact-email').textContent = config.contact.email;
    document.getElementById('contact-address').textContent = config.contact.address;

    const newsItems = (newsData[lang] || []).map(item => {
      const listItem = createElement('li');
      listItem.append(
        createElement('time', { className: 'date', text: item.date }),
        document.createTextNode(item.text),
      );
      return listItem;
    });
    document.getElementById('news-list').replaceChildren(...newsItems);

    const linkItems = config.links.map(link => {
      const item = createElement('li');
      appendExternalLink(item, link.label, link.url);
      return item;
    });
    document.getElementById('links-list').replaceChildren(...linkItems);
  } catch (error) {
    console.error(error);
    showLoadError(main, lang);
  }
}

renderIndex();
