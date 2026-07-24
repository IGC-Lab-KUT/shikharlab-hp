function memberCard(member, lang) {
  const displayName = member.nameJa || member.nameEn || member.name || '';
  
  // 日本語ページの場合は画像のパスを1つ上の階層に調整する
  let photoSrc = member.photo;
  if (photoSrc && lang === 'ja' && !photoSrc.startsWith('http')) {
    photoSrc = '../' + photoSrc;
  }
  
  const img = photoSrc
    ? `<img src="${photoSrc}" alt="${displayName}">`
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
  const lang = document.documentElement.lang || 'en';
  // 言語によってJSONのパスを切り替える
  const dataPath = lang === 'ja' ? '../data/members.json' : 'data/members.json';
  const data = await fetch(dataPath).then(r => r.json());

  document.getElementById('pi-grid').innerHTML = data.pi.map(m => memberCard(m, lang)).join('');
  document.getElementById('phd-grid').innerHTML = data.phd.map(m => memberCard(m, lang)).join('');
  document.getElementById('master-grid').innerHTML = data.master.map(m => memberCard(m, lang)).join('');
  document.getElementById('alumni-grid').innerHTML = data.alumni.map(m => memberCard(m, lang)).join('');
  document.getElementById('bachelor-grid').innerHTML = data.bachelor.map(m => memberCard(m, lang)).join('');
}

renderMembers();
