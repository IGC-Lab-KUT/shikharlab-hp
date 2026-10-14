function timelineItem(item, type) {
  const row = createElement('article', { className: 'timeline-item' });
  row.append(
    createElement('p', { className: 'timeline-period', text: item.year || item.period }),
    createElement('h3', { text: type === 'education' ? item.qualification : item.role }),
    createElement('p', { text: item.institution }),
  );
  return row;
}

function contributionItem(publication) {
  const item = createElement('li', { className: 'compact-publication-item' });
  const heading = createElement('h3');
  if (publication.url) appendExternalLink(heading, publication.title, publication.url);
  else heading.textContent = publication.title;
  item.append(
    heading,
    createElement('p', { className: 'authors', text: publication.authors }),
    createElement('p', { className: 'venue', text: `${publication.venue} (${publication.year})` }),
  );
  return item;
}

function serviceItem(item) {
  const row = createElement('article', { className: 'service-item' });
  if (item.period) row.append(createElement('p', { className: 'service-period', text: item.period }));
  row.append(createElement('div', { text: `${item.role} — ${item.organization}` }));
  if (!item.period) row.classList.add('service-item--no-period');
  return row;
}

function fundingItem(item, lang) {
  const row = createElement('article', { className: 'funding-item' });
  const details = createElement('dl', { className: 'funding-details' });
  const labels = lang === 'ja'
    ? { role: '役割', institution: '機関', agency: '助成機関', amount: '研究費' }
    : { role: 'Role', institution: 'Institution', agency: 'Funding agency', amount: 'Grant amount' };

  Object.entries(labels).forEach(([key, label]) => {
    if (!item[key]) return;
    details.append(
      createElement('dt', { text: label }),
      createElement('dd', { text: item[key] }),
    );
  });

  row.append(
    createElement('p', { className: 'funding-period', text: item.period }),
    createElement('h3', { text: item.title }),
    details,
  );
  return row;
}

function teachingGroup(label, courses) {
  const group = createElement('section', { className: 'teaching-group' });
  const list = createElement('ul', { className: 'check-list' });
  list.replaceChildren(...courses.map(course => createElement('li', { text: course })));
  group.append(createElement('h3', { text: label }), list);
  return group;
}

function renderTeaching(teaching) {
  const container = document.getElementById('pi-teaching');
  if (!container || !teaching) return;

  const content = createElement('div', { className: 'teaching-content' });
  if (teaching.summary) content.append(createElement('p', { className: 'teaching-summary', text: teaching.summary }));

  const groups = createElement('div', { className: 'teaching-groups' });
  if (teaching.undergraduate?.length) {
    groups.append(teachingGroup(teaching.undergraduateLabel, teaching.undergraduate));
  }
  if (teaching.graduate?.length) {
    groups.append(teachingGroup(teaching.graduateLabel, teaching.graduate));
  }
  if (groups.children.length) content.append(groups);

  const sourceUrl = safeExternalUrl(teaching.sourceUrl);
  if (sourceUrl && teaching.sourceLabel) {
    const source = createElement('p', { className: 'teaching-source' });
    appendExternalLink(source, teaching.sourceLabel, sourceUrl);
    content.append(source);
  }
  container.replaceChildren(content);
}

function piAwardItem(award, lang) {
  const item = createElement('article', { className: 'mini-list-item' });
  item.append(
    createElement('p', { className: 'achievement-year', text: award.year }),
    createElement('h3', { text: lang === 'ja' ? award.titleJa || award.title : award.title }),
    createElement('p', { text: lang === 'ja' ? award.venueJa || award.venue : award.venue }),
  );
  return item;
}

async function renderPiProfile() {
  const lang = document.documentElement.lang || 'en';
  const main = document.querySelector('main');
  try {
    const [data, publications, awards] = await Promise.all([
      fetchJson('data/pi.json'),
      fetchJson('data/publications.json'),
      fetchJson('data/awards.json'),
    ]);
    const profile = data[lang] || data.en;
    const photoSource = safeImageSource(data.photo);
    if (photoSource) {
      const photo = createElement('img', {
        className: 'profile-photo',
        attributes: { src: photoSource, alt: profile.name, width: 800, height: 1200, decoding: 'async' },
      });
      const sourceUrl = safeExternalUrl(data.photoSource);
      if (sourceUrl) {
        const photoLink = createElement('a', {
          attributes: { href: sourceUrl, target: '_blank', rel: 'noopener noreferrer' },
        });
        photoLink.append(photo);
        document.getElementById('pi-photo-wrap').append(photoLink);
      } else {
        document.getElementById('pi-photo-wrap').append(photo);
      }
    }

    document.getElementById('pi-name').textContent = profile.name;
    document.getElementById('pi-appointment').textContent = profile.appointment;
    document.getElementById('pi-affiliation').textContent = profile.affiliation;
    document.getElementById('pi-biography').textContent = profile.biography;
    document.getElementById('pi-email').textContent = profile.contact.email;
    document.getElementById('pi-office').textContent = profile.contact.office;

    const linkItems = data.profileLinks
      .filter(link => link.verified && (link[lang === 'ja' ? 'urlJa' : 'urlEn']))
      .map(link => {
        const item = createElement('li');
        appendExternalLink(
          item,
          link[lang === 'ja' ? 'labelJa' : 'labelEn'],
          link[lang === 'ja' ? 'urlJa' : 'urlEn'],
        );
        return item;
      });
    document.getElementById('pi-profile-links').replaceChildren(...linkItems);
    document.getElementById('pi-education').replaceChildren(
      ...profile.education.map(item => timelineItem(item, 'education')),
    );
    document.getElementById('pi-appointments').replaceChildren(
      ...profile.appointments.map(item => timelineItem(item, 'appointment')),
    );
    renderTeaching(profile.teaching);
    document.getElementById('pi-interests').replaceChildren(
      ...profile.researchInterests.map(text => createElement('li', { text })),
    );
    document.getElementById('pi-funding').replaceChildren(...(profile.funding || []).map(item => fundingItem(item, lang)));
    document.getElementById('pi-service').replaceChildren(...profile.professionalService.map(serviceItem));

    const selectedUrls = new Set(data.selectedPublicationUrls || []);
    document.getElementById('pi-contributions').replaceChildren(
      ...publications.filter(item => selectedUrls.has(item.url)).map(contributionItem),
    );
    document.getElementById('pi-awards').replaceChildren(...awards.slice(0, 5).map(award => piAwardItem(award, lang)));
  } catch (error) {
    console.error(error);
    showLoadError(main, lang);
  }
}

renderPiProfile();
