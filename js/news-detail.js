function newsFigure(image, lang, featured = false) {
  const source = safeImageSource(image?.src);
  if (!source) return null;
  const figure = createElement('figure', { className: featured ? 'news-featured-image' : 'news-article-image' });
  figure.append(createElement('img', {
    attributes: {
      src: source,
      alt: NewsUI.localizedNewsValue(image.alt, lang),
      loading: featured ? 'eager' : 'lazy',
      decoding: 'async',
    },
  }));
  const caption = NewsUI.localizedNewsValue(image.caption, lang);
  if (caption) figure.append(createElement('figcaption', { text: caption }));
  return figure;
}

function newsLinkSection(id, heading, items, lang) {
  if (!Array.isArray(items) || !items.length) return null;
  const section = createElement('section', { className: 'news-related', attributes: { 'aria-labelledby': id } });
  const list = createElement('ul', { className: 'news-link-list' });
  for (const item of items) {
    const listItem = createElement('li');
    NewsUI.appendNewsLink(listItem, item, lang);
    if (listItem.childNodes.length) list.append(listItem);
  }
  if (!list.childNodes.length) return null;
  section.append(createElement('h2', { text: heading, attributes: { id } }), list);
  return section;
}

async function renderNewsDetail() {
  const lang = document.documentElement.lang || 'en';
  const main = document.querySelector('main');
  const id = new URLSearchParams(window.location.search).get('id');
  try {
    const data = await fetchJson('data/news.json');
    const item = NewsUI.publishedNews(data).find(entry => entry.id === id);
    if (!item || !NewsUI.newsHasDetail(item, lang)) throw new Error('News article not found');

    const title = NewsUI.localizedNewsValue(item.title, lang);
    document.title = `${title} - Shikhar Lab`;
    document.getElementById('news-article-title').textContent = title;
    document.getElementById('news-article-date').textContent = NewsUI.formatNewsDate(item, lang);
    document.getElementById('news-article-date').dateTime = item.date;
    document.getElementById('news-article-category').textContent = NewsUI.localizedNewsValue(item.category, lang);
    document.getElementById('news-article-intro').textContent = NewsUI.localizedNewsValue(item.summary, lang);

    const featured = newsFigure(item.featuredImage, lang, true);
    if (featured) document.getElementById('news-featured').replaceChildren(featured);
    else document.getElementById('news-featured').remove();

    document.getElementById('news-article-content').replaceChildren(
      ...(item.content?.[lang] || []).map(paragraph => createElement('p', { text: paragraph })),
    );

    const galleryItems = (item.images || []).map(image => newsFigure(image, lang)).filter(Boolean);
    if (galleryItems.length) document.getElementById('news-article-gallery').replaceChildren(...galleryItems);
    else document.getElementById('news-article-gallery-section').remove();

    const metadata = document.getElementById('news-article-metadata');
    if (item.author) metadata.append(createElement('span', { text: `${lang === 'ja' ? '執筆' : 'Author'}: ${item.author}` }));
    if (item.lastUpdated) metadata.append(createElement('span', { text: `${lang === 'ja' ? '更新日' : 'Last updated'}: ${item.lastUpdated}` }));
    if (!metadata.childNodes.length) metadata.remove();

    const related = document.getElementById('news-related-content');
    const sections = [
      newsLinkSection('news-links-heading', lang === 'ja' ? '関連リンク' : 'Relevant links', item.links, lang),
      newsLinkSection('news-publications-heading', lang === 'ja' ? '関連する研究業績' : 'Related publications', item.relatedPublications, lang),
      newsLinkSection('news-projects-heading', lang === 'ja' ? '関連する研究プロジェクト' : 'Related research projects', item.relatedProjects, lang),
    ].filter(Boolean);
    if (sections.length) related.replaceChildren(...sections);
    else related.remove();
  } catch (error) {
    console.error(error);
    main.replaceChildren(
      createElement('h1', { className: 'page-title', text: lang === 'ja' ? 'ニュース記事が見つかりません' : 'News article not found' }),
      createElement('p', { className: 'status-message status-message--error', text: lang === 'ja' ? '指定されたニュース記事は利用できません。' : 'The requested news article is unavailable.' }),
      createElement('p'),
    );
    main.lastElementChild.append(createElement('a', { text: lang === 'ja' ? 'ニュース一覧へ戻る' : 'Return to the news archive', attributes: { href: 'news.html' } }));
  }
}

renderNewsDetail();
