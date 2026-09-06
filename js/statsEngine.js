// ---------- ЧИСТАЯ ЛОГИКА СТАТИСТИКИ АТЛАСА ----------
// issue #58. Deliberately zero imports from places.js — that module does a
// top-level fetch() for vocab.json that only resolves in a browser (see
// recommendationEngine.js's own comment on the same constraint), which
// would silently break importing this file under plain Node. Kept as a
// pure function of a places array so tests/stats.test.mjs can run it
// directly, same pattern recommendationEngine.js already established for
// scorePlace().
export function computeExplorationStats(places){
  const isExplored = p => p.cat === 'loved' || p.cat === 'ok';

  const total = places.length;
  const explored = places.filter(isExplored).length;
  const loved = places.filter(p => p.cat === 'loved').length;
  const ok = places.filter(p => p.cat === 'ok').length;
  const plan = places.filter(p => p.cat === 'plan').length;
  const wantReturn = places.filter(p => p.wantReturn).length;
  const percent = total ? Math.round((explored / total) * 100) : 0;

  const byCountry = {};
  places.forEach(p => {
    const key = p.country || '?';
    byCountry[key] = byCountry[key] || { total: 0, explored: 0 };
    byCountry[key].total++;
    if(isExplored(p)) byCountry[key].explored++;
  });
  // Только страны, где реально что-то исследовано, отсортированные по
  // проценту — "прогресс по странам", а не полный список всех кодов сразу.
  const countryBreakdown = Object.entries(byCountry)
    .filter(([, v]) => v.explored > 0)
    .map(([code, v]) => ({ code, ...v, percent: Math.round((v.explored / v.total) * 100) }))
    .sort((a, b) => b.percent - a.percent);

  return { total, explored, loved, ok, plan, wantReturn, percent, countryBreakdown };
}
