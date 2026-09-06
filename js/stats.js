// ---------- ЭКРАН СТАТИСТИКИ АТЛАСА ----------
// issue #58: "добавить экран путешественника со статистикой — Ты
// исследовал 23% атласа". Deterministic aggregation over PLACES — no
// separate stored state, same "always recomputed, never cached" principle
// as computeProfile() (profile.js) and getVisiblePlaces() (places.js), so
// this can never drift out of sync with the actual place data. The actual
// aggregation logic lives in statsEngine.js (pure, no places.js import —
// see that file's comment for why), re-exported here for callers that
// already import from stats.js.
import { PLACES, countryInfo } from './places.js';
import { computeExplorationStats } from './statsEngine.js';
export { computeExplorationStats };

function renderStats(){
  const body = document.getElementById('stats-body');
  if(!body) return;
  const s = computeExplorationStats(PLACES);

  if(s.total === 0){
    body.innerHTML = `<p class="stats-empty">Места ещё загружаются — секунду.</p>`;
    return;
  }

  const countryRows = s.countryBreakdown.map(c => `
    <div class="stats-country-row">
      <span class="stats-country-flag">${countryInfo(c.code).flag || '🏳️'}</span>
      <span class="stats-country-name">${countryInfo(c.code).label || c.code}</span>
      <span class="stats-country-bar"><span style="width:${c.percent}%"></span></span>
      <span class="stats-country-pct">${c.percent}%</span>
    </div>`).join('');

  body.innerHTML = `
    <p class="stats-headline"><strong>${s.percent}%</strong> атласа исследовано</p>
    <p class="stats-sub">${s.explored} из ${s.total} мест — уже не просто план</p>
    <div class="stats-grid">
      <div class="stats-tile"><strong>${s.loved}</strong><span>❤️ понравилось</span></div>
      <div class="stats-tile"><strong>${s.ok}</strong><span>🙂 посещено</span></div>
      <div class="stats-tile"><strong>${s.plan}</strong><span>🗺 в планах</span></div>
      <div class="stats-tile"><strong>${s.wantReturn}</strong><span>★ хотим вернуться</span></div>
    </div>
    ${countryRows ? `<p class="stats-subhead">По странам</p>${countryRows}` : ''}
  `;
}

export function initStats(){
  const back = document.getElementById('stats-back');
  const openBtn = document.getElementById('open-stats');
  const closeBtn = document.getElementById('stats-close');
  if(!back || !openBtn || !closeBtn) return;

  openBtn.addEventListener('click', () => {
    renderStats();
    back.classList.add('open');
  });
  closeBtn.addEventListener('click', () => back.classList.remove('open'));
  back.addEventListener('click', e => { if(e.target === back) back.classList.remove('open'); });
}
