function projectCard(project, lang) {
  // 日本語ページの場合は画像のパスを1つ上の階層に調整する
  let imgSrc = project.image;
  if (imgSrc && lang === 'ja' && !imgSrc.startsWith('http')) {
    imgSrc = '../' + imgSrc;
  }

  const img = imgSrc
    ? `<img src="${imgSrc}" alt="${project.name}">`
    : '';
  const tags = project.tags
    .map(tag => `<span class="tag">${tag}</span>`)
    .join('');
  return `<div class="project-card">
    ${img}
    <div class="content">
      <h3>${project.name}</h3>
      <p>${project.description}</p>
      <div class="tags">${tags}</div>
    </div>
  </div>`;
}

async function renderProjects() {
  const lang = document.documentElement.lang || 'en';
  // 言語によってJSONのパスを切り替える
  const dataPath = lang === 'ja' ? '../data/projects.json' : 'data/projects.json';
  const data = await fetch(dataPath).then(r => r.json());

  document.getElementById('current-projects-grid').innerHTML = data.current.map(p => projectCard(p, lang)).join('');
  document.getElementById('past-projects-grid').innerHTML = data.past.map(p => projectCard(p, lang)).join('');
}

renderProjects();
