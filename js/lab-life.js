function labLifeCard(item) {
  const card = createElement('article', { className: 'feature-card icon-card lab-life-card' });
  const content = createElement('div', { className: 'icon-card-content' });
  content.append(
    createElement('h3', { text: item.title }),
    createElement('p', { text: item.description }),
  );
  card.append(
    createElement('span', { className: 'card-icon', text: item.icon, attributes: { 'aria-hidden': 'true' } }),
    content,
  );
  return card;
}

function galleryItem(item) {
  const imageSource = safeImageSource(item.image);
  if (!imageSource) return null;

  const figure = createElement('figure', { className: 'lab-gallery-item' });
  figure.append(
    createElement('img', {
      className: 'lab-gallery-image',
      attributes: {
        src: imageSource,
        alt: item.alt,
        loading: 'lazy',
        decoding: 'async',
      },
    }),
    createElement('figcaption', { text: item.caption }),
  );
  return figure;
}

async function renderLabLife() {
  const lang = document.documentElement.lang || 'en';
  const main = document.querySelector('main');
  try {
    const data = await fetchJson('data/opportunities.json');
    const content = data[lang] || data.en;
    document.getElementById('lab-life-intro').textContent = content.labLifeIntro;
    document.getElementById('lab-activities').replaceChildren(...content.labActivities.map(labLifeCard));
    document.getElementById('lab-facilities').replaceChildren(...content.labFacilities.map(labLifeCard));
    document.getElementById('lab-gallery').replaceChildren(
      ...(content.labGallery || []).map(galleryItem).filter(Boolean),
    );
  } catch (error) {
    console.error(error);
    showLoadError(main, lang);
  }
}

renderLabLife();
