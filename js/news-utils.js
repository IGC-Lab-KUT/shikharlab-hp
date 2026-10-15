function localizedNewsValue(value, lang) {
  if (typeof value === 'string') return value;
  if (!value || typeof value !== 'object') return '';
  return value[lang] || value.en || value.ja || '';
}

function publishedNews(data) {
  return (Array.isArray(data?.items) ? data.items : [])
    .filter(item => item && item.status === 'published' && typeof item.id === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(item.date))
    .sort((a, b) => b.date.localeCompare(a.date));
}

function newsHasDetail(item, lang) {
  return Boolean(
    (Array.isArray(item?.content?.[lang]) && item.content[lang].length)
    || item?.featuredImage
    || (Array.isArray(item?.images) && item.images.length)
    || (Array.isArray(item?.links) && item.links.length)
    || (Array.isArray(item?.relatedPublications) && item.relatedPublications.length)
    || (Array.isArray(item?.relatedProjects) && item.relatedProjects.length)
  );
}

function formatNewsDate(item, lang) {
  const dateLabel = localizedNewsValue(item.dateLabel, lang);
  if (dateLabel) return dateLabel;
  const locale = lang === 'ja' ? 'ja-JP' : 'en-GB';
  const options = { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' };
  const start = new Date(`${item.date}T00:00:00Z`);
  if (Number.isNaN(start.getTime())) return item.date;
  const startText = new Intl.DateTimeFormat(locale, options).format(start);
  if (!item.dateEnd || item.dateEnd === item.date) return startText;
  const end = new Date(`${item.dateEnd}T00:00:00Z`);
  if (Number.isNaN(end.getTime())) return startText;
  return `${startText} – ${new Intl.DateTimeFormat(locale, options).format(end)}`;
}

function newsDetailHref(item) {
  return `news-detail.html?id=${encodeURIComponent(item.id)}`;
}

function newsImage(item) {
  return item.thumbnail || item.featuredImage || null;
}

function renderNewsCard(item, lang, compact = false) {
  const card = createElement('li', { className: compact ? 'news-card news-card--compact' : 'news-card' });
  const hasDetail = newsHasDetail(item, lang);
  const image = newsImage(item);
  const imageSource = safeImageSource(image?.src);
  if (imageSource) {
    const cardImage = createElement('img', {
      className: 'news-card-image',
      attributes: {
        src: imageSource,
        alt: localizedNewsValue(image.alt, lang),
        loading: 'lazy',
        decoding: 'async',
      },
    });
    if (hasDetail) {
      const imageLink = createElement('a', {
        className: 'news-card-image-link',
        attributes: {
          href: newsDetailHref(item),
          'aria-label': localizedNewsValue(item.title, lang),
        },
      });
      imageLink.append(cardImage);
      card.append(imageLink);
    } else {
      card.append(cardImage);
    }
  }

  const body = createElement('div', { className: 'news-card-body' });
  const meta = createElement('div', { className: 'news-meta' });
  meta.append(
    createElement('time', {
      className: 'news-date',
      text: formatNewsDate(item, lang),
      attributes: { datetime: item.date },
    }),
    createElement('span', {
      className: 'news-category',
      text: localizedNewsValue(item.category, lang),
    }),
  );

  const heading = createElement('h3', { className: 'news-title' });
  if (hasDetail) {
    heading.append(createElement('a', {
      text: localizedNewsValue(item.title, lang),
      attributes: { href: newsDetailHref(item) },
    }));
  } else {
    heading.textContent = localizedNewsValue(item.title, lang);
  }
  body.append(meta, heading, createElement('p', {
    className: 'news-summary',
    text: localizedNewsValue(item.summary, lang),
  }));
  if (hasDetail) {
    body.append(createElement('a', {
      className: 'news-read-more',
      text: lang === 'ja' ? '詳しく読む' : 'Read more',
      attributes: { href: newsDetailHref(item), 'aria-label': `${lang === 'ja' ? '詳しく読む' : 'Read more'}: ${localizedNewsValue(item.title, lang)}` },
    }));
  }
  card.append(body);
  return card;
}

function appendNewsLink(parent, item, lang) {
  const label = localizedNewsValue(item.label || item.title, lang);
  const external = safeExternalUrl(item.url);
  if (external) {
    appendExternalLink(parent, label, external);
    return;
  }
  const internal = safeInternalPath(item.url);
  if (internal) parent.append(createElement('a', { text: label, attributes: { href: internal } }));
}

window.NewsUI = {
  appendNewsLink,
  formatNewsDate,
  localizedNewsValue,
  newsHasDetail,
  publishedNews,
  renderNewsCard,
};
