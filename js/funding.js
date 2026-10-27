function localizedFundingValue(value, lang) {
  if (typeof value === 'string') return value;
  return value?.[lang] || value?.en || '';
}

function fundingItem(item, lang) {
  const row = createElement('article', { className: 'funding-item' });
  const details = createElement('dl', { className: 'funding-details' });
  const labels = item.type === 'lotus'
    ? (lang === 'ja'
      ? { researcher: '研究者', homeInstitution: '所属機関', hostInstitution: '受入機関', awardYear: '採択年', expectedJoining: '参加予定' }
      : { researcher: 'Researcher', homeInstitution: 'Home institution', hostInstitution: 'Host institution', awardYear: 'Award year', expectedJoining: 'Expected joining' })
    : (lang === 'ja'
      ? { program: '助成機関・制度', role: '役割', institution: '所属機関' }
      : { program: 'Funding agency and programme', role: 'Role', institution: 'Institution' });

  Object.entries(labels).forEach(([key, label]) => {
    const value = localizedFundingValue(item[key], lang);
    if (!value) return;
    details.append(
      createElement('dt', { text: label }),
      createElement('dd', { text: value }),
    );
  });

  if (item.type !== 'lotus') {
    row.append(createElement('p', {
      className: 'funding-period',
      text: localizedFundingValue(item.period, lang),
    }));
  }
  row.append(
    createElement('h4', { text: localizedFundingValue(item.title, lang) }),
    details,
  );
  return row;
}

function renderFunding(data, lang) {
  const container = document.getElementById('funding-list');
  if (!container || !Array.isArray(data?.grants)) return;

  const headings = lang === 'ja'
    ? { ongoing: '実施中の研究助成', completed: '終了した研究助成' }
    : { ongoing: 'Ongoing grants', completed: 'Completed grants' };
  const orderedGrants = data.grants
    .map((grant, index) => ({ grant, index }))
    .sort((a, b) => b.grant.sortYear - a.grant.sortYear || a.index - b.index)
    .map(({ grant }) => grant);

  const groups = ['ongoing', 'completed'].flatMap(status => {
    const grants = orderedGrants.filter(grant => grant.status === status);
    if (!grants.length) return [];
    const group = createElement('section', { className: 'funding-group' });
    const items = createElement('div', { className: 'funding-group-items' });
    items.replaceChildren(...grants.map(grant => fundingItem(grant, lang)));
    group.append(createElement('h3', { text: headings[status] }), items);
    return [group];
  });
  container.replaceChildren(...groups);
}

async function renderFundingPage() {
  const lang = document.documentElement.lang || 'en';
  const main = document.querySelector('main');
  try {
    renderFunding(await fetchJson('data/funding.json'), lang);
  } catch (error) {
    console.error(error);
    showLoadError(main, lang);
  }
}

renderFundingPage();
