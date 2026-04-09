async function renderIndex() {
  const [config, news] = await Promise.all([
    fetch('data/config.json').then(r => r.json()),
    fetch('data/news.json').then(r => r.json()),
  ]);

  document.getElementById('hero-title').textContent = `Welcome to ${config.labName}`;
  document.getElementById('hero-subtitle').textContent = config.subtitle;
  document.getElementById('about-text').textContent = config.about;
  document.getElementById('contact-email').textContent = config.contact.email;
  document.getElementById('contact-address').textContent = config.contact.address;

  document.getElementById('news-list').innerHTML = news
    .map(item => `<li><span class="date">${item.date}</span> ${item.text}</li>`)
    .join('');

  document.getElementById('links-list').innerHTML = config.links
    .map(link => `<li><a href="${link.url}" target="_blank">${link.label}</a></li>`)
    .join('');
}

renderIndex();
