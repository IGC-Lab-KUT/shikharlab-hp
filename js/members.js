function hasMemberContent(member) {
  return Boolean(member && (member.nameJa || member.nameEn || member.name || member.roleEn || member.roleJa || member.role || member.photo));
}

function memberCard(member, lang) {
  const displayName = member.nameJa || member.nameEn || member.name || '';
  const card = createElement('article', { className: 'member-card' });
  const photoSource = safeImageSource(member.photo);
  if (photoSource) {
    const photo = createElement('img', {
      className: member.photoFocus === 'upper' ? 'member-photo member-photo--upper' : 'member-photo',
      attributes: {
        src: photoSource, alt: displayName, width: 150, height: 150,
        loading: 'lazy', decoding: 'async',
      },
    });
    if (member.photoFocus === 'upper') {
      const frame = createElement('div', { className: 'member-photo-frame' });
      frame.append(photo);
      card.append(frame);
    } else {
      card.append(photo);
    }
  } else {
    card.append(createElement('div', {
      className: 'member-placeholder', text: displayName.slice(0, 1), attributes: { 'aria-hidden': 'true' },
    }));
  }

  const names = createElement('div', { className: 'name-group' });
  const profilePage = safeInternalPath(member.profilePage);
  const appendName = (container, tag, className, text) => {
    const nameElement = createElement(tag, { className });
    if (profilePage) {
      nameElement.append(createElement('a', {
        text,
        attributes: {
          href: profilePage,
          'aria-label': lang === 'ja' ? `${text}の学術プロフィール` : `${text} academic profile`,
        },
      }));
    } else {
      nameElement.textContent = text;
    }
    container.append(nameElement);
  };
  if (member.nameJa) appendName(names, 'h3', 'name-ja', member.nameJa);
  if (member.nameEn) appendName(names, member.nameJa ? 'p' : 'h3', 'name-en', member.nameEn);
  if (!member.nameJa && !member.nameEn) names.append(createElement('h3', { text: member.name || '' }));
  card.append(names);
  const role = member[lang === 'ja' ? 'roleJa' : 'roleEn'] || member.role;
  if (role) card.append(createElement('p', { className: 'role', text: role }));
  return card;
}

function renderMemberGroup(data, key, gridId, sectionId, lang) {
  const members = (data[key] || []).filter(hasMemberContent);
  const section = document.getElementById(sectionId);
  if (!members.length) {
    section.hidden = true;
    return;
  }
  document.getElementById(gridId).replaceChildren(...members.map(member => memberCard(member, lang)));
}

async function renderMembers() {
  const lang = document.documentElement.lang || 'en';
  const main = document.querySelector('main');
  try {
    const data = await fetchJson('data/members.json');
    renderMemberGroup(data, 'pi', 'pi-grid', 'pi-section', lang);
    renderMemberGroup(data, 'researchCollaborators', 'collaborators-grid', 'collaborators-section', lang);
    renderMemberGroup(data, 'phd', 'phd-grid', 'phd-section', lang);
    renderMemberGroup(data, 'master', 'master-grid', 'master-section', lang);
    renderMemberGroup(data, 'bachelor', 'bachelor-grid', 'bachelor-section', lang);
    renderMemberGroup(data, 'alumni', 'alumni-grid', 'alumni-section', lang);
  } catch (error) {
    console.error(error);
    showLoadError(main, lang);
  }
}

renderMembers();
