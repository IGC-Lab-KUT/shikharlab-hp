function researchHighlightCard(area, lang) {
  const card = createElement('article', { className: 'feature-card' });
  card.append(
    createElement('h3', { text: area[lang === 'ja' ? 'titleJa' : 'titleEn'] }),
    createElement('p', { text: area[lang === 'ja' ? 'summaryJa' : 'summaryEn'] }),
  );
  return card;
}

function compactPublicationItem(publication) {
  const item = createElement('li', { className: 'compact-publication-item' });
  const heading = createElement('h3');
  if (publication.url) appendExternalLink(heading, publication.title, publication.url);
  else heading.textContent = publication.title;
  item.append(
    heading,
    createElement('p', { className: 'authors', text: publication.authors }),
    createElement('p', { className: 'venue', text: `${publication.venue} (${publication.year})` }),
  );
  return item;
}

function achievementCard(award, lang) {
  const card = createElement('article', { className: 'achievement-card' });
  card.append(
    createElement('p', { className: 'achievement-year', text: award.year }),
    createElement('h3', { text: lang === 'ja' ? award.titleJa || award.title : award.title }),
    createElement('p', { text: lang === 'ja' ? award.venueJa || award.venue : award.venue }),
  );
  return card;
}

async function renderIndex() {
  const lang = document.documentElement.lang || 'en';
  const main = document.querySelector('main');
  try {
    const [config, newsData, researchData, publications, awards] = await Promise.all([
      fetchJson(lang === 'ja' ? 'data/ja/config.json' : 'data/config.json'),
      fetchJson('data/news.json'),
      fetchJson('data/research.json'),
      fetchJson('data/publications.json'),
      fetchJson('data/awards.json'),
    ]);

    document.getElementById('mission-text').textContent = config.mission;
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

    const selectedAreaIds = new Set(config.homepage?.researchAreaIds || []);
    const selectedAreas = (researchData.areas || []).filter(area => selectedAreaIds.has(area.id));
    document.getElementById('research-highlights-grid').replaceChildren(
      ...selectedAreas.map(area => researchHighlightCard(area, lang)),
    );

    const selectedPublicationUrls = new Set(config.homepage?.selectedPublicationUrls || []);
    const selectedPublications = publications.filter(item => selectedPublicationUrls.has(item.url));
    document.getElementById('selected-publications-list').replaceChildren(
      ...selectedPublications.map(compactPublicationItem),
    );

    const achievementCount = Number(config.homepage?.achievementCount) || 3;
    document.getElementById('selected-achievements-list').replaceChildren(
      ...awards.slice(0, achievementCount).map(award => achievementCard(award, lang)),
    );

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
