function projectCard(project, lang) {
  const card = createElement('article', { className: 'project-card' });
  const imageSource = safeImageSource(project.image);
  if (imageSource) {
    card.append(createElement('img', {
      attributes: { src: imageSource, alt: '', loading: 'lazy', decoding: 'async' },
    }));
  }
  const content = createElement('div', { className: 'content' });
  content.append(
    createElement('h3', { className: 'card-title', text: project.name }),
    createElement('p', { text: project.description }),
  );
  const tags = createElement('ul', {
    className: 'tags',
    attributes: { 'aria-label': lang === 'ja' ? '研究トピック' : 'Research topics' },
  });
  tags.append(...(project.tags || []).map(tag => {
    const item = createElement('li');
    item.append(createElement('span', { className: 'tag', text: tag }));
    return item;
  }));
  content.append(tags);
  card.append(content);
  return card;
}

function renderProjectGroup(projects, gridId, sectionId, lang) {
  const section = document.getElementById(sectionId);
  if (!projects.length) {
    section.hidden = true;
    return;
  }
  document.getElementById(gridId).replaceChildren(...projects.map(project => projectCard(project, lang)));
}

async function renderProjects() {
  const lang = document.documentElement.lang || 'en';
  const main = document.querySelector('main');
  try {
    const data = await fetchJson('data/projects.json');
    renderProjectGroup(data.current || [], 'current-projects-grid', 'current-projects-section', lang);
    renderProjectGroup(data.past || [], 'past-projects-grid', 'past-projects-section', lang);
  } catch (error) {
    console.error(error);
    showLoadError(main, lang);
  }
}

renderProjects();
