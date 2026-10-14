function researchAreaCard(area, lang) {
  const card = createElement('article', { className: 'research-area-card' });
  card.append(
    createElement('h3', { text: area[lang === 'ja' ? 'titleJa' : 'titleEn'] }),
    createElement('p', { text: area[lang === 'ja' ? 'summaryJa' : 'summaryEn'] }),
  );
  return card;
}

function localizedProjectText(value, lang) {
  const parts = String(value || '').split(/(?<=[.!?])\s+(?=[^\x00-\x7F])/);
  if (parts.length === 1) return value;
  return lang === 'ja' ? parts.slice(1).join(' ') : parts[0];
}

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
    createElement('p', { text: localizedProjectText(project.description, lang) }),
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
    const [projectData, researchData] = await Promise.all([
      fetchJson('data/projects.json'),
      fetchJson('data/research.json'),
    ]);
    document.getElementById('research-areas-grid').replaceChildren(
      ...(researchData.areas || []).map(area => researchAreaCard(area, lang)),
    );
    renderProjectGroup(projectData.current || [], 'current-projects-grid', 'current-projects-section', lang);
    renderProjectGroup(projectData.past || [], 'past-projects-grid', 'past-projects-section', lang);
  } catch (error) {
    console.error(error);
    showLoadError(main, lang);
  }
}

renderProjects();
