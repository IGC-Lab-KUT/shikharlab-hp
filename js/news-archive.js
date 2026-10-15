async function renderNewsArchive() {
  const lang = document.documentElement.lang || 'en';
  const main = document.querySelector('main');
  try {
    const data = await fetchJson('data/news.json');
    const items = NewsUI.publishedNews(data);
    const yearFilter = document.getElementById('news-year-filter');
    const categoryFilter = document.getElementById('news-category-filter');
    const list = document.getElementById('news-archive-list');
    const status = document.getElementById('news-filter-status');
    const params = new URLSearchParams(window.location.search);

    const years = [...new Set(items.map(item => item.date.slice(0, 4)))];
    yearFilter.append(...years.map(year => createElement('option', { text: year, attributes: { value: year } })));

    const categories = new Map();
    for (const item of items) categories.set(item.category.id, NewsUI.localizedNewsValue(item.category, lang));
    categoryFilter.append(...[...categories.entries()]
      .sort((a, b) => a[1].localeCompare(b[1], lang))
      .map(([value, label]) => createElement('option', { text: label, attributes: { value } })));

    if (years.includes(params.get('year'))) yearFilter.value = params.get('year');
    if (categories.has(params.get('category'))) categoryFilter.value = params.get('category');

    const update = () => {
      const filtered = items.filter(item => (
        (!yearFilter.value || item.date.startsWith(yearFilter.value))
        && (!categoryFilter.value || item.category.id === categoryFilter.value)
      ));
      list.replaceChildren(...filtered.map(item => NewsUI.renderNewsCard(item, lang)));
      status.textContent = lang === 'ja'
        ? `${filtered.length}件のニュースを表示しています。`
        : `Showing ${filtered.length} news ${filtered.length === 1 ? 'item' : 'items'}.`;

      const nextParams = new URLSearchParams();
      if (yearFilter.value) nextParams.set('year', yearFilter.value);
      if (categoryFilter.value) nextParams.set('category', categoryFilter.value);
      const query = nextParams.toString();
      window.history.replaceState(null, '', `${window.location.pathname}${query ? `?${query}` : ''}`);
    };

    yearFilter.addEventListener('change', update);
    categoryFilter.addEventListener('change', update);
    update();
  } catch (error) {
    console.error(error);
    showLoadError(main, lang);
  }
}

renderNewsArchive();
