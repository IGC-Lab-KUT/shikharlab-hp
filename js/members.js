function hasMemberContent(member) {
  return Boolean(member && (member.nameJa || member.nameEn || member.name || member.role || member.photo));
}

function memberCard(member) {
  const displayName = member.nameJa || member.nameEn || member.name || '';
  const card = createElement('article', { className: 'member-card' });
  const photoSource = safeImageSource(member.photo);
  if (photoSource) {
    card.append(createElement('img', {
      attributes: {
        src: photoSource, alt: displayName, width: 150, height: 150,
        loading: 'lazy', decoding: 'async',
      },
    }));
  } else {
    card.append(createElement('div', {
      className: 'member-placeholder', text: displayName.slice(0, 1), attributes: { 'aria-hidden': 'true' },
    }));
  }

  const names = createElement('div', { className: 'name-group' });
  if (member.nameJa) names.append(createElement('h3', { className: 'name-ja', text: member.nameJa }));
  if (member.nameEn) names.append(createElement(member.nameJa ? 'p' : 'h3', { className: 'name-en', text: member.nameEn }));
  if (!member.nameJa && !member.nameEn) names.append(createElement('h3', { text: member.name || '' }));
  card.append(names);
  if (member.role) card.append(createElement('p', { className: 'role', text: member.role }));
  return card;
}

function renderMemberGroup(data, key, gridId, sectionId) {
  const members = (data[key] || []).filter(hasMemberContent);
  const section = document.getElementById(sectionId);
  if (!members.length) {
    section.hidden = true;
    return;
  }
  document.getElementById(gridId).replaceChildren(...members.map(memberCard));
}

async function renderMembers() {
  const lang = document.documentElement.lang || 'en';
  const main = document.querySelector('main');
  try {
    const data = await fetchJson('data/members.json');
    renderMemberGroup(data, 'pi', 'pi-grid', 'pi-section');
    renderMemberGroup(data, 'researchCollaborators', 'collaborators-grid', 'collaborators-section');
    renderMemberGroup(data, 'phd', 'phd-grid', 'phd-section');
    renderMemberGroup(data, 'master', 'master-grid', 'master-section');
    renderMemberGroup(data, 'bachelor', 'bachelor-grid', 'bachelor-section');
    renderMemberGroup(data, 'alumni', 'alumni-grid', 'alumni-section');
  } catch (error) {
    console.error(error);
    showLoadError(main, lang);
  }
}

renderMembers();
