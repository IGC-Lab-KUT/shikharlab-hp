function memberCard(member) {
  const displayName = member.nameJa || member.nameEn || member.name || '';
  const img = member.photo
    ? `<img src="${member.photo}" alt="${displayName}">`
    : '';
  const nameJa = member.nameJa
    ? `<p class="name-ja">${member.nameJa}</p>`
    : '';
  const nameEn = member.nameEn
    ? `<p class="name-en">${member.nameEn}</p>`
    : '';
  const name = (!member.nameJa && !member.nameEn && member.name)
    ? `<h3>${member.name}</h3>`
    : `<div class="name-group">${nameJa}${nameEn}</div>`;
  return `<div class="member-card">${img}${name}<p class="role">${member.role}</p></div>`;
}

async function renderMembers() {
  const data = await fetch('data/members.json').then(r => r.json());

  document.getElementById('pi-grid').innerHTML = data.pi.map(memberCard).join('');
  document.getElementById('phd-grid').innerHTML = data.phd.map(memberCard).join('');
  document.getElementById('master-grid').innerHTML = data.master.map(memberCard).join('');
  document.getElementById('alumni-grid').innerHTML = data.alumni.map(memberCard).join('');
  document.getElementById('bachelor-grid').innerHTML = data.bachelor.map(memberCard).join('');
}

renderMembers();
