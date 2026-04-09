function projectCard(project) {
  const img = project.image
    ? `<img src="${project.image}" alt="${project.name}">`
    : `<img src="" alt="${project.name}">`;
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
  const data = await fetch('data/projects.json').then(r => r.json());

  document.getElementById('current-projects-grid').innerHTML = data.current.map(projectCard).join('');
  document.getElementById('past-projects-grid').innerHTML = data.past.map(projectCard).join('');
}

renderProjects();
