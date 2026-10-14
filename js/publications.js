function groupedByYear(items) {
  return items.reduce((groups, item) => {
    (groups[item.year] ||= []).push(item);
    return groups;
  }, {});
}

function publicationItem(publication, lang) {
  const item = createElement('li', { className: 'publication-item' });
  const title = createElement('h4');
  if (publication.url) appendExternalLink(title, publication.title, publication.url);
  else title.textContent = publication.title;
  item.append(
    title,
    createElement('p', { className: 'authors', text: publication.authors }),
    createElement('p', { className: 'venue', text: publication.venue }),
  );
  return item;
}

function publicationGroup(items, type, lang) {
  const labels = lang === 'ja'
    ? { journal: '論文誌', conference: '国際会議論文', bookChapter: '書籍章' }
    : { journal: 'Journal Articles', conference: 'Conference Papers', bookChapter: 'Book Chapters' };
  const publications = items.filter(item => item.type === type);
  if (!publications.length) return null;

  const group = createElement('div', { className: 'publication-type-group' });
  const list = createElement('ul', { className: 'publication-list' });
  list.append(...publications.map(item => publicationItem(item, lang)));
  group.append(createElement('h3', { text: labels[type] }), list);
  return group;
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
      section.append(
        ...['journal', 'conference', 'bookChapter']
          .map(type => publicationGroup(groups[year], type, lang))
          .filter(Boolean),
      );
      return section;
    });
    container.replaceChildren(...sections);
  } catch (error) {
    console.error(error);
    showLoadError(container, lang);
  }
}

renderPublications();
