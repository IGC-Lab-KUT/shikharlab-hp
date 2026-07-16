async function renderAwards() {
  const data = await fetch('data/awards.json').then(r => r.json());

  const byYear = {};
  for (const award of data) {
    if (!byYear[award.year]) byYear[award.year] = [];
    byYear[award.year].push(award);
  }

  const years = Object.keys(byYear).sort((a, b) => b - a);
  const html = years.map(year => {
    const items = byYear[year].map(award => {
      const title = award.url
        ? `<a href="${award.url}" target="_blank">${award.title}</a>`
        : award.title;
      return `<li class="publication-item">
        <h3>${title}</h3>
        <p class="authors">${award.recipients}</p>
        <p class="venue">${award.venue}</p>
      </li>`;
    }).join('');
    return `<div class="year-section"><h3>${year}</h3><ul class="publication-list">${items}</ul></div>`;
  }).join('');

  document.getElementById('awards-container').innerHTML = html;
}

renderAwards();
