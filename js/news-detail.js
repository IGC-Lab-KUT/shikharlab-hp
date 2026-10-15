function createNewsLightbox(images, lang) {
  const validImages = images.map(image => ({
    source: safeImageSource(image?.src),
    alt: NewsUI.localizedNewsValue(image?.alt, lang),
    caption: NewsUI.localizedNewsValue(image?.caption, lang),
  })).filter(image => image.source);
  if (!validImages.length) return null;

  const dialog = createElement('dialog', {
    className: 'news-lightbox',
    attributes: { 'aria-label': lang === 'ja' ? '写真の拡大表示' : 'Enlarged photograph' },
  });
  const close = createElement('button', {
    className: 'news-lightbox-close',
    text: '×',
    attributes: { type: 'button', 'aria-label': lang === 'ja' ? '閉じる' : 'Close' },
  });
  const previous = createElement('button', {
    className: 'news-lightbox-nav news-lightbox-previous',
    text: '‹',
    attributes: { type: 'button', 'aria-label': lang === 'ja' ? '前の写真' : 'Previous photograph' },
  });
  const next = createElement('button', {
    className: 'news-lightbox-nav news-lightbox-next',
    text: '›',
    attributes: { type: 'button', 'aria-label': lang === 'ja' ? '次の写真' : 'Next photograph' },
  });
  const displayed = createElement('img', { attributes: { decoding: 'async' } });
  const caption = createElement('p', { className: 'news-lightbox-caption' });
  const counter = createElement('p', { className: 'news-lightbox-counter', attributes: { 'aria-live': 'polite' } });
  const frame = createElement('div', { className: 'news-lightbox-frame' });
  frame.append(displayed, caption, counter);
  dialog.append(close, previous, frame, next);
  document.body.append(dialog);

  let activeIndex = 0;
  let returnFocus = null;
  const render = () => {
    const image = validImages[activeIndex];
    displayed.src = image.source;
    displayed.alt = image.alt;
    caption.textContent = image.caption;
    caption.hidden = !image.caption;
    counter.textContent = `${activeIndex + 1} / ${validImages.length}`;
    const multiple = validImages.length > 1;
    previous.hidden = !multiple;
    next.hidden = !multiple;
    previous.disabled = !multiple;
    next.disabled = !multiple;
  };
  const move = direction => {
    activeIndex = (activeIndex + direction + validImages.length) % validImages.length;
    render();
  };
  const open = (index, trigger) => {
    activeIndex = Math.max(0, Math.min(index, validImages.length - 1));
    returnFocus = trigger;
    render();
    document.body.classList.add('lightbox-open');
    if (typeof dialog.showModal === 'function') dialog.showModal();
    else dialog.setAttribute('open', '');
    close.focus();
  };
  const closeDialog = () => {
    if (typeof dialog.close === 'function') dialog.close();
    else {
      dialog.removeAttribute('open');
      document.body.classList.remove('lightbox-open');
      returnFocus?.focus();
    }
  };

  close.addEventListener('click', closeDialog);
  previous.addEventListener('click', () => move(-1));
  next.addEventListener('click', () => move(1));
  dialog.addEventListener('click', event => {
    if (event.target === dialog) closeDialog();
  });
  dialog.addEventListener('close', () => {
    document.body.classList.remove('lightbox-open');
    returnFocus?.focus();
  });
  dialog.addEventListener('keydown', event => {
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      move(-1);
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      move(1);
    }
  });

  return { open };
}

function newsFigure(image, lang, featured = false, lightbox = null, lightboxIndex = 0) {
  const source = safeImageSource(image?.src);
  if (!source) return null;
  const figure = createElement('figure', { className: featured ? 'news-featured-image' : 'news-article-image' });
  const imageElement = createElement('img', {
    attributes: {
      src: source,
      alt: NewsUI.localizedNewsValue(image.alt, lang),
      loading: featured ? 'eager' : 'lazy',
      decoding: 'async',
    },
  });
  if (lightbox) {
    const button = createElement('button', {
      className: 'news-image-button',
      attributes: {
        type: 'button',
        'aria-label': lang === 'ja' ? '写真を拡大表示' : 'Enlarge photograph',
      },
    });
    button.append(imageElement);
    button.addEventListener('click', () => lightbox.open(lightboxIndex, button));
    figure.append(button);
  } else {
    figure.append(imageElement);
  }
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

    const articleImages = [item.featuredImage, ...(item.images || [])].filter(image => safeImageSource(image?.src));
    const lightbox = createNewsLightbox(articleImages, lang);
    const featured = newsFigure(item.featuredImage, lang, true, lightbox, 0);
    if (featured) document.getElementById('news-featured').replaceChildren(featured);
    else document.getElementById('news-featured').remove();

    document.getElementById('news-article-content').replaceChildren(
      ...(item.content?.[lang] || []).map(paragraph => createElement('p', { text: paragraph })),
    );

    const galleryItems = (item.images || []).map((image, index) => newsFigure(image, lang, false, lightbox, index + (featured ? 1 : 0))).filter(Boolean);
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
