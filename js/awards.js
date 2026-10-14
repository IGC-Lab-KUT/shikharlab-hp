function groupAwardsByYear(items) {
  return items.reduce((groups, item) => {
    (groups[item.year] ||= []).push(item);
    return groups;
  }, {});
}

function awardItem(award) {
  const item = createElement('li', { className: 'publication-item' });
  const title = createElement('h3');
  if (award.url) appendExternalLink(title, award.title, award.url);
  else title.textContent = award.title;
  item.append(
    title,
    createElement('p', { className: 'authors', text: award.recipients }),
    createElement('p', { className: 'venue', text: award.venue }),
  );
  return item;
}

async function renderAwards() {
  const lang = document.documentElement.lang || 'en';
  const container = document.getElementById('awards-container');
  try {
    const data = await fetchJson('data/awards.json');
    const groups = groupAwardsByYear(data);
    const years = Object.keys(groups).sort((a, b) => Number.parseInt(b, 10) - Number.parseInt(a, 10));
    const sections = years.map(year => {
      const section = createElement('section', { className: 'year-section' });
      section.append(createElement('h2', { text: year }));
      const list = createElement('ul', { className: 'publication-list' });
      list.append(...groups[year].map(awardItem));
      section.append(list);
      return section;
    });
    container.replaceChildren(...sections);
  } catch (error) {
    console.error(error);
    showLoadError(container, lang);
  }
}

renderAwards();
