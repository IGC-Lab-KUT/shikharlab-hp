function memberCard(member) {
  const img = member.photo
    ? `<img src="${member.photo}" alt="${member.name}">`
    : `<img src="" alt="${member.name}">`;
  const email = member.email
    ? `<p class="email">${member.email}</p>`
    : '';
  return `<div class="member-card">${img}<h3>${member.name}</h3><p class="role">${member.role}</p>${email}</div>`;
}

async function renderMembers() {
  const data = await fetch('data/members.json').then(r => r.json());

  document.getElementById('pi-grid').innerHTML = data.pi.map(memberCard).join('');
  document.getElementById('phd-grid').innerHTML = data.phd.map(memberCard).join('');
  document.getElementById('master-grid').innerHTML = data.master.map(memberCard).join('');
  document.getElementById('alumni-grid').innerHTML = data.alumni.map(memberCard).join('');
}

renderMembers();
