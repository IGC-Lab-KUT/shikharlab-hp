async function renderPublications() {
  const data = await fetch('data/publications.json').then(r => r.json());

  // Group by year (descending)
  const byYear = {};
  for (const pub of data) {
    if (!byYear[pub.year]) byYear[pub.year] = [];
    byYear[pub.year].push(pub);
  }

  const years = Object.keys(byYear).sort((a, b) => b - a);
  const html = years.map(year => {
    const items = byYear[year].map(pub => {
      const title = pub.url
        ? `<a href="${pub.url}" target="_blank">${pub.title}</a>`
        : pub.title;
      return `<li class="publication-item">
        <h3>${title}</h3>
        <p class="authors">${pub.authors}</p>
        <p class="venue">${pub.venue}</p>
      </li>`;
    }).join('');
    return `<div class="year-section"><h3>${year}</h3><ul class="publication-list">${items}</ul></div>`;
  }).join('');

  document.getElementById('publications-container').innerHTML = html;
}

renderPublications();
