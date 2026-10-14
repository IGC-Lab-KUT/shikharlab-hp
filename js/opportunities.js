function textList(items, containerId) {
  document.getElementById(containerId).replaceChildren(
    ...items.map(text => createElement('li', { text })),
  );
}

function pathwayCard(item) {
  const card = createElement('article', { className: 'pathway-card' });
  card.append(
    createElement('h3', { text: item.title }),
    createElement('p', { text: item.description }),
  );
  return card;
}

function collaborationCard(text) {
  const card = createElement('article', { className: 'feature-card feature-card--compact' });
  card.append(createElement('p', { text }));
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
    textList(content.contactSteps, 'opportunity-steps');
    textList(content.applicantInformation, 'opportunity-materials');
    document.getElementById('collaboration-options').replaceChildren(
      ...content.collaboration.map(collaborationCard),
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
