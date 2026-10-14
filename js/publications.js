function groupedByYear(items) {
  return items.reduce((groups, item) => {
    (groups[item.year] ||= []).push(item);
    return groups;
  }, {});
}

function publicationItem(publication, lang) {
  const item = createElement('li', { className: 'publication-item' });
  const title = createElement('h3');
  const typeLabels = lang === 'ja'
    ? { journal: '論文誌', conference: '国際会議', bookChapter: '書籍章' }
    : { journal: 'Journal', conference: 'Conference', bookChapter: 'Book chapter' };
  if (publication.url) appendExternalLink(title, publication.title, publication.url);
  else title.textContent = publication.title;
  item.append(
    createElement('p', { className: 'publication-type', text: typeLabels[publication.type] || '' }),
    title,
    createElement('p', { className: 'authors', text: publication.authors }),
    createElement('p', { className: 'venue', text: publication.venue }),
  );
  return item;
}

async function renderPublications() {
  const lang = document.documentElement.lang || 'en';
  const container = document.getElementById('publications-container');
  try {
    const data = await fetchJson('data/publications.json');
    const groups = groupedByYear(data);
    const years = Object.keys(groups).sort((a, b) => Number(b) - Number(a));
    const sections = years.map(year => {
      const section = createElement('section', { className: 'year-section' });
      section.append(createElement('h2', { text: year }));
      const list = createElement('ul', { className: 'publication-list' });
      list.append(...groups[year].map(item => publicationItem(item, lang)));
      section.append(list);
      return section;
    });
    container.replaceChildren(...sections);
  } catch (error) {
    console.error(error);
    showLoadError(container, lang);
  }
}

renderPublications();
