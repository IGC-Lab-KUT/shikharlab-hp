function textList(items, containerId) {
  document.getElementById(containerId).replaceChildren(
    ...items.map(text => createElement('li', { text })),
  );
}

function pathwayCard(item) {
  const card = createElement('article', { className: 'pathway-card' });
  card.append(
    createElement('span', { className: 'card-icon', text: item.icon, attributes: { 'aria-hidden': 'true' } }),
    createElement('h3', { text: item.title }),
    createElement('p', { text: item.description }),
  );
  return card;
}

function iconCard(item, extraClass = '') {
  const card = createElement('article', { className: `feature-card icon-card ${extraClass}`.trim() });
  card.append(
    createElement('span', { className: 'card-icon', text: item.icon, attributes: { 'aria-hidden': 'true' } }),
    createElement('div', { className: 'icon-card-content' }),
  );
  card.lastElementChild.append(
    createElement('h3', { text: item.title }),
    createElement('p', { text: item.description }),
  );
  return card;
}

async function renderOpportunities() {
  const lang = document.documentElement.lang || 'en';
  const main = document.querySelector('main');
  try {
    const [data, config] = await Promise.all([
      fetchJson('data/opportunities.json'),
      fetchJson(lang === 'ja' ? 'data/ja/config.json' : 'data/config.json'),
    ]);
    const content = data[lang] || data.en;
    document.getElementById('opportunities-intro').textContent = content.intro;
    document.getElementById('opportunity-pathways').replaceChildren(...content.pathways.map(pathwayCard));
    textList(content.topics, 'opportunity-topics');
    textList(content.backgrounds, 'opportunity-backgrounds');
    document.getElementById('collaboration-intro').textContent = content.collaborationIntro;
    document.getElementById('collaboration-options').replaceChildren(
      ...content.collaboration.map(item => iconCard(item, 'collaboration-card')),
    );
    document.getElementById('lab-activities').replaceChildren(
      ...content.labActivities.map(item => iconCard(item, 'lab-life-card')),
    );
    document.getElementById('lab-facilities').replaceChildren(
      ...content.labFacilities.map(item => iconCard(item, 'lab-life-card')),
    );
    document.getElementById('opportunity-contact-heading').textContent = content.contactLabel;
    document.getElementById('opportunity-contact-note').textContent = content.contactNote;
    document.getElementById('opportunity-email').textContent = config.contact.email;
  } catch (error) {
    console.error(error);
    showLoadError(main, lang);
  }
}

renderOpportunities();
