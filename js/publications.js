const PUBLICATION_LABELS = {
  en: {
    types: { journal: 'Journal Articles', conference: 'Conference Papers', bookChapter: 'Book Chapters' },
    copy: 'Copy citation',
    copied: 'Citation copied',
    copyFailed: 'Unable to copy',
    noResults: 'No publications match the selected filters.',
    citations: 'OpenAlex citations',
  },
  ja: {
    types: { journal: '論文誌', conference: '国際会議論文', bookChapter: '書籍章' },
    copy: '引用情報をコピー',
    copied: '引用情報をコピーしました',
    copyFailed: 'コピーできませんでした',
    noResults: '選択した条件に一致する研究業績はありません。',
    citations: 'OpenAlex 被引用数',
  },
};

function publicationKey(publication) {
  const normalizedTitle = String(publication.title || '')
    .normalize('NFKD')
    .toLocaleLowerCase('en')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
  return `${publication.year}:${normalizedTitle}`;
}

function citationIndex(data) {
  const entries = Array.isArray(data?.entries) ? data.entries : [];
  return new Map(entries
    .filter(entry => entry?.matchStatus === 'matched'
      && Number.isInteger(entry.citedByCount)
      && entry.citedByCount >= 0
      && /^https:\/\/openalex\.org\/W\d+$/.test(entry.openAlexUrl || ''))
    .map(entry => [entry.publicationKey, entry]));
}

function groupedByYear(items) {
  return items.reduce((groups, item) => {
    (groups[item.year] ||= []).push(item);
    return groups;
  }, {});
}

function citationText(publication) {
  const parts = [
    `${publication.authors}.`,
    `“${publication.title}.”`,
    `${publication.venue} (${publication.year}).`,
  ];
  if (publication.url) parts.push(publication.url);
  return parts.join(' ');
}

async function copyText(value) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }

  const field = createElement('textarea', {
    attributes: { readonly: '', 'aria-hidden': 'true' },
  });
  field.value = value;
  field.readOnly = true;
  field.className = 'clipboard-fallback';
  document.body.append(field);
  field.select();
  const copied = document.execCommand('copy');
  field.remove();
  if (!copied) throw new Error('Clipboard copy was not available');
}

function publicationItem(publication, labels, citations) {
  const item = createElement('li', { className: 'publication-item' });
  const title = createElement('h4');
  if (publication.url) appendExternalLink(title, publication.title, publication.url);
  else title.textContent = publication.title;

  const copyButton = createElement('button', {
    className: 'citation-copy-button',
    text: labels.copy,
    attributes: { type: 'button' },
  });
  copyButton.addEventListener('click', async () => {
    try {
      await copyText(citationText(publication));
      copyButton.textContent = labels.copied;
    } catch (error) {
      console.error(error);
      copyButton.textContent = labels.copyFailed;
    }
    window.setTimeout(() => { copyButton.textContent = labels.copy; }, 2200);
  });

  const actions = createElement('div', { className: 'publication-actions' });
  const citation = citations.get(publicationKey(publication));
  const citationLabel = `${labels.citations}: ${citation ? citation.citedByCount : '—'}`;
  if (citation) appendExternalLink(actions, citationLabel, citation.openAlexUrl, 'openalex-citation');
  else actions.append(createElement('span', { className: 'openalex-citation openalex-citation--unmatched', text: citationLabel }));
  actions.append(copyButton);
  item.append(
    title,
    createElement('p', { className: 'authors', text: publication.authors }),
    createElement('p', { className: 'venue', text: publication.venue }),
    actions,
  );
  return item;
}

function publicationGroup(items, type, labels, citations) {
  const publications = items.filter(item => item.type === type);
  if (!publications.length) return null;

  const group = createElement('div', { className: 'publication-type-group' });
  const list = createElement('ul', { className: 'publication-list' });
  list.append(...publications.map(item => publicationItem(item, labels, citations)));
  group.append(createElement('h3', { text: labels.types[type] }), list);
  return group;
}

function normalizedSearchText(publication) {
  const keywords = Array.isArray(publication.keywords)
    ? publication.keywords.join(' ')
    : (publication.keywords || '');
  return `${publication.title} ${publication.authors} ${keywords}`.toLocaleLowerCase();
}

function renderPublicationSections(items, labels, citations) {
  const groups = groupedByYear(items);
  return Object.keys(groups)
    .sort((a, b) => Number(b) - Number(a))
    .map(year => {
      const section = createElement('section', { className: 'year-section' });
      section.append(createElement('h2', { text: year }));
      section.append(
        ...['journal', 'conference', 'bookChapter']
          .map(type => publicationGroup(groups[year], type, labels, citations))
          .filter(Boolean),
      );
      return section;
    });
}

async function renderPublications() {
  const lang = document.documentElement.lang || 'en';
  const labels = PUBLICATION_LABELS[lang === 'ja' ? 'ja' : 'en'];
  const container = document.getElementById('publications-container');
  try {
    const [data, citationData] = await Promise.all([
      fetchJson('data/publications.json'),
      fetchJson('data/openalex-citations.json').catch(error => {
        console.warn('OpenAlex citation data was unavailable; publications will remain visible.', error);
        return null;
      }),
    ]);
    const citations = citationIndex(citationData);
    const form = document.getElementById('publication-filters');
    const search = document.getElementById('publication-search');
    const yearFilter = document.getElementById('publication-year-filter');
    const typeFilter = document.getElementById('publication-type-filter');
    const status = document.getElementById('publication-filter-status');
    const params = new URLSearchParams(window.location.search);
    const years = [...new Set(data.map(item => String(item.year)))].sort((a, b) => Number(b) - Number(a));

    yearFilter.append(...years.map(year => createElement('option', { text: year, attributes: { value: year } })));
    if (years.includes(params.get('year'))) yearFilter.value = params.get('year');
    if (['journal', 'conference', 'bookChapter'].includes(params.get('type'))) typeFilter.value = params.get('type');
    search.value = params.get('q') || '';

    const update = () => {
      const query = search.value.trim().toLocaleLowerCase();
      const filtered = data.filter(publication => (
        (!query || normalizedSearchText(publication).includes(query))
        && (!yearFilter.value || String(publication.year) === yearFilter.value)
        && (!typeFilter.value || publication.type === typeFilter.value)
      ));

      const sections = renderPublicationSections(filtered, labels, citations);
      container.replaceChildren(...(sections.length ? sections : [createElement('p', {
        className: 'publication-empty',
        text: labels.noResults,
      })]));
      status.textContent = lang === 'ja'
        ? `${data.length}件中${filtered.length}件の研究業績を表示しています。`
        : `Showing ${filtered.length} of ${data.length} publications.`;

      const nextParams = new URLSearchParams();
      if (search.value.trim()) nextParams.set('q', search.value.trim());
      if (yearFilter.value) nextParams.set('year', yearFilter.value);
      if (typeFilter.value) nextParams.set('type', typeFilter.value);
      const queryString = nextParams.toString();
      window.history.replaceState(null, '', `${window.location.pathname}${queryString ? `?${queryString}` : ''}`);
    };

    search.addEventListener('input', update);
    yearFilter.addEventListener('change', update);
    typeFilter.addEventListener('change', update);
    form.addEventListener('submit', event => event.preventDefault());
    form.addEventListener('reset', () => window.setTimeout(update));
    update();
  } catch (error) {
    console.error(error);
    showLoadError(container, lang);
  }
}

renderPublications();
