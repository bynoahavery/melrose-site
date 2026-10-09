// Renders the sign-in dashboard (same layout as Ranee's).
// Used by /admin and by the design preview's dashboard panel.
// Sign-in: { at, name }
window.renderDashboard = function renderDashboard(body, { signIns, emptyText }) {
  const fmt = (iso) => new Date(iso).toLocaleString('en-AU', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
  const el = (t, cls, text) => { const n = document.createElement(t); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; };

  const latestFirst = signIns.slice().sort((a, b) => b.at.localeCompare(a.at));
  const people = new Map();
  for (const s of latestFirst) {
    const k = s.name.toLowerCase();
    const p = people.get(k) || { name: s.name, visits: 0, last: s.at };
    p.visits += 1;
    people.set(k, p);
  }

  body.replaceChildren();
  const stats = el('dl', 'tp-stats');
  for (const [label, value] of [['People', people.size], ['Visits', latestFirst.length]]) {
    const d = el('div'); d.append(el('dt', null, label), el('dd', null, String(value))); stats.append(d);
  }
  body.append(stats);

  if (!latestFirst.length) { body.append(el('p', 'tp-empty', emptyText || 'No sign-ins yet.')); return; }

  const table = (title, head, rows) => {
    const sec = el('section', 'tp-person'); sec.append(el('h3', null, title));
    const t = el('table', 'tp-table'); const hr = el('tr'); head.forEach((h) => hr.append(el('th', null, h))); t.append(hr);
    rows.forEach((r) => { const tr = el('tr'); r.forEach((c) => tr.append(el('td', null, String(c)))); t.append(tr); });
    sec.append(t); body.append(sec);
  };
  table('People', ['Name', 'Visits', 'Latest sign-in'], [...people.values()].map((p) => [p.name, p.visits, fmt(p.last)]));
  table('All sign-ins', ['Signed in', 'Name'], latestFirst.map((s) => [fmt(s.at), s.name]));
};
