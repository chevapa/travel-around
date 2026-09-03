// ---------- ЭКРАН «КУДА СЕГОДНЯ?» (рекомендации / свайпы) ----------
// Второй способ смотреть на те же PLACES (первый — карта+фильтры в app.js).
// Кандидаты — места со статусом "plan" (ещё не были). Сигналы свайпов
// (нравится / не интересно / на потом) хранятся отдельно от самих мест —
// они не трогают исходные данные (places/*.json), только локальный "опыт
// использования" этого экрана, через тот же store, что и custom-места.
import { PLACES, statusInfo, catInfo, countryInfo, seasonInfo, store } from './places.js';
import { flyToPlace, map } from './map.js';

const LIKED_KEY   = 'trip-atlas-reco-liked';
const SKIPPED_KEY = 'trip-atlas-reco-skipped';
const LATER_KEY   = 'trip-atlas-reco-later';

let liked = new Set(), skipped = new Set(), later = new Set();
let queue = [];
let stackEl, sheetBack, sheetBody;

async function loadSignals(){
  const [l, s, t] = await Promise.all([
    store.get(LIKED_KEY).catch(()=>null),
    store.get(SKIPPED_KEY).catch(()=>null),
    store.get(LATER_KEY).catch(()=>null),
  ]);
  try{ liked   = new Set(l && l.value ? JSON.parse(l.value) : []); }catch(e){ liked = new Set(); }
  try{ skipped = new Set(s && s.value ? JSON.parse(s.value) : []); }catch(e){ skipped = new Set(); }
  try{ later   = new Set(t && t.value ? JSON.parse(t.value) : []); }catch(e){ later = new Set(); }
}
function persist(){
  store.set(LIKED_KEY, JSON.stringify([...liked])).catch(()=>{});
  store.set(SKIPPED_KEY, JSON.stringify([...skipped])).catch(()=>{});
  store.set(LATER_KEY, JSON.stringify([...later])).catch(()=>{});
}

// ---------- ПОДБОР КАНДИДАТОВ ----------
function buildQueue(){
  const candidates = PLACES.filter(p =>
    p.cat === 'plan' && !skipped.has(p.name) && !liked.has(p.name));
  // "На потом" не выкидываем — просто откладываем в конец очереди,
  // чтобы карточка попалась снова, но не мешала свежим вариантам.
  const primary  = candidates.filter(p => !later.has(p.name));
  const deferred = candidates.filter(p => later.has(p.name));
  queue = [...primary, ...deferred];
}

// категории мест, которые пользователь уже отметил "понравилось" —
// используется, чтобы объяснить рекомендацию через реальное совпадение вкуса.
function lovedCatSet(){
  const set = new Set();
  PLACES.filter(p => p.cat === 'loved').forEach(p => p.cats.forEach(c => set.add(c)));
  return set;
}

function buildReasons(place){
  const reasons = [];
  reasons.push({icon:'🚗', title:`${place.drive} от Загреба`, sub:'реалистичная оценка для выходных'});
  if(place.wantReturn){
    reasons.push({icon:'★', title:'Вы отметили — «хотим вернуться»', sub:'осталось только доехать'});
  }else{
    reasons.push({icon:'📍', title:'Вы здесь ещё не были', sub:'новое место на карте'});
  }
  const overlap = place.cats.filter(c => lovedCatSet().has(c));
  if(overlap.length){
    reasons.push({
      icon:'❤️',
      title:'Похоже на места, которые вам понравились',
      sub: overlap.slice(0,3).map(c=>catInfo(c).label).join(', ')
    });
  }
  if(place.season && place.season !== 'all'){
    reasons.push({icon: seasonInfo(place.season).ico, title: seasonInfo(place.season).label, sub:'подходящий сезон'});
  }
  if(place.warn){
    reasons.push({icon:'⚠️', title:'Проверить перед выездом', sub:place.warn});
  }
  return reasons.slice(0,4);
}

function catArtSrc(catKey){
  const html = catInfo(catKey).ico || '';
  const m = /src=['"]([^'"]+)['"]/.exec(html);
  return m ? m[1] : '';
}

// ---------- РЕНДЕР СТОПКИ КАРТОЧЕК ----------
function badgesHtml(place){
  const st = statusInfo(place.cat);
  const catBadges = place.cats.slice(0,2).map(c =>
    `<span class="popup-badge cat"><span class="cat-art">${catInfo(c).ico}</span>${catInfo(c).label.replace(' / ',' · ')}</span>`).join('');
  const seasonBadge = place.season !== 'all'
    ? `<span class="popup-badge cat">${seasonInfo(place.season).ico} ${seasonInfo(place.season).label}</span>` : '';
  return `<div class="popup-badges reco-badges">
      <span class="popup-badge ${st.badge}">${st.label}</span>
      <span class="popup-badge cat">${countryInfo(place.country).flag} ${countryInfo(place.country).label}</span>
      ${seasonBadge}${catBadges}
    </div>`;
}

function buildCardEl(place, depth){
  const el = document.createElement('div');
  el.className = 'reco-card';
  el.style.transform = `translateY(${depth*10}px) scale(${1 - depth*0.035})`;
  el.style.zIndex = String(50 - depth);
  const art = catArtSrc(place.cats[0]) || catArtSrc('town');
  const accent = statusInfo(place.cat).color;

  el.innerHTML = `
    <div class="reco-eyebrow">${place.wantReturn ? 'В ПРИОРИТЕТЕ' : 'НОВОЕ МЕСТО'}</div>
    <p class="popup-title reco-name">${place.name}</p>
    ${badgesHtml(place)}
    <div class="reco-art" style="background:${accent}22;">
      <img src="${art}" alt="" class="reco-art-img">
    </div>
    <div class="reco-reasons">
      ${buildReasons(place).map(r => `
        <div class="reco-reason">
          <span class="reco-reason-badge">${r.icon}</span>
          <span class="reco-reason-txt"><strong>${r.title}</strong><span>${r.sub}</span></span>
        </div>`).join('')}
    </div>
    <div class="reco-card-foot">
      <button type="button" class="reco-link" data-action="details">Детали</button>
      <button type="button" class="reco-link" data-action="map">На карте →</button>
    </div>
    <div class="reco-stamp like">ДА!</div>
    <div class="reco-stamp skip">МИМО</div>
    <div class="reco-stamp save">ПОТОМ</div>
  `;

  el.querySelector('[data-action="details"]').addEventListener('click', (e)=>{ e.stopPropagation(); openSheet(place); });
  el.querySelector('[data-action="map"]').addEventListener('click', (e)=>{
    e.stopPropagation();
    switchScreen('map');
    flyToPlace(place);
  });

  return el;
}

function renderStack(){
  if(!stackEl) return;
  stackEl.innerHTML = '';

  if(PLACES.length === 0){
    stackEl.innerHTML = `<div class="reco-card reco-empty"><p class="reco-empty-big">Собираем места…</p>
      <p class="reco-empty-sub">Секунду — подгружаем список из репозитория.</p></div>`;
    return;
  }
  if(queue.length === 0){
    stackEl.innerHTML = `<div class="reco-card reco-empty">
      <p class="reco-empty-big">На сегодня всё 🎉</p>
      <p class="reco-empty-sub">Вы прошли все текущие планы. Новые появятся, когда вы добавите места со статусом «план» — или начните заново.</p>
      <button type="button" class="reco-reset-btn" id="reco-reset">Начать заново</button>
    </div>`;
    document.getElementById('reco-reset').addEventListener('click', ()=>{
      liked.clear(); skipped.clear(); later.clear();
      persist();
      buildQueue();
      renderStack();
    });
    return;
  }

  queue.slice(0,3).forEach((place, i)=>{
    const cardEl = buildCardEl(place, i);
    stackEl.appendChild(cardEl);
    if(i === 0) attachDrag(cardEl, place);
  });
}

// ---------- СВАЙП: РЕШЕНИЕ + АНИМАЦИЯ ----------
function decide(place, dir){
  if(dir === 'like'){ liked.add(place.name); showToast(`❤️ «${place.name}» — понравилось, учтём в следующих подборках`); }
  if(dir === 'skip'){ skipped.add(place.name); showToast(`Скрыли «${place.name}»`); }
  if(dir === 'save'){ later.add(place.name); showToast(`«${place.name}» — сохранили на потом`); }
  persist();
}

function flyAway(el, dir, onDone){
  el.style.transition = 'transform .35s ease, opacity .35s ease';
  if(dir === 'like') el.style.transform = 'translate(480px, -30px) rotate(22deg)';
  if(dir === 'skip') el.style.transform = 'translate(-480px, -30px) rotate(-22deg)';
  if(dir === 'save') el.style.transform = 'translate(0, 520px) scale(0.85)';
  el.style.opacity = '0';
  setTimeout(onDone, 300);
}

function swipeTop(dir){
  const top = queue[0];
  const topEl = stackEl && stackEl.querySelector('.reco-card:not(.reco-empty)');
  if(!top || !topEl) return;
  decide(top, dir);
  flyAway(topEl, dir, ()=>{
    buildQueue();
    renderStack();
  });
}

function attachDrag(el, place){
  let startX=0, startY=0, curX=0, curY=0, dragging=false;
  const like = el.querySelector('.reco-stamp.like');
  const skip = el.querySelector('.reco-stamp.skip');
  const save = el.querySelector('.reco-stamp.save');

  function down(e){
    if(e.target.closest('.reco-link')) return;
    dragging = true;
    const p = e.touches ? e.touches[0] : e;
    startX = p.clientX; startY = p.clientY;
    el.style.transition = 'none';
  }
  function move(e){
    if(!dragging) return;
    const p = e.touches ? e.touches[0] : e;
    curX = p.clientX - startX; curY = p.clientY - startY;
    el.style.transform = `translate(${curX}px, ${curY}px) rotate(${curX/18}deg)`;
    like.style.opacity = Math.max(0, Math.min(1, curX/90));
    skip.style.opacity = Math.max(0, Math.min(1, -curX/90));
    save.style.opacity = curY > 0 ? Math.max(0, Math.min(1, curY/90)) : 0;
  }
  function up(){
    if(!dragging) return;
    dragging = false;
    el.style.transition = 'transform .25s ease';
    if(curX > 110) swipeTop('like');
    else if(curX < -110) swipeTop('skip');
    else if(curY > 110 && Math.abs(curX) < 80) swipeTop('save');
    else{
      el.style.transform = 'translate(0,0) rotate(0)';
      like.style.opacity = 0; skip.style.opacity = 0; save.style.opacity = 0;
    }
    curX = 0; curY = 0;
  }
  el.addEventListener('pointerdown', down);
  el.addEventListener('pointermove', move);
  el.addEventListener('pointerup', up);
  el.addEventListener('pointerleave', ()=>{ if(dragging) up(); });
}

// ---------- ДЕТАЛИ (нижняя шторка) ----------
function openSheet(place){
  const st = statusInfo(place.cat);
  sheetBody.innerHTML = `
    ${badgesHtml(place)}
    <p class="popup-title">${place.name}</p>
    <p class="popup-note">${place.note || ''}</p>
    ${place.warn ? `<p class="popup-warn">⚠️ ${place.warn}</p>` : ''}
    ${place.meta ? `<p class="popup-meta">${place.meta}</p>` : ''}
    <div class="reco-sheet-actions">
      <button type="button" class="reco-sheet-map-btn" id="reco-sheet-map">Показать на карте →</button>
    </div>`;
  document.getElementById('reco-sheet-map').addEventListener('click', ()=>{
    closeSheet();
    switchScreen('map');
    flyToPlace(place);
  });
  sheetBack.classList.add('open');
}
function closeSheet(){ sheetBack.classList.remove('open'); }

// ---------- ТОСТ ----------
let toastEl;
function showToast(msg){
  if(!toastEl){
    toastEl = document.createElement('div');
    toastEl.id = 'reco-toast';
    document.body.appendChild(toastEl);
  }
  toastEl.textContent = msg;
  toastEl.classList.add('show');
  clearTimeout(showToast._t);
  showToast._t = setTimeout(()=>toastEl.classList.remove('show'), 1900);
}

// ---------- ПЕРЕКЛЮЧЕНИЕ ЭКРАНОВ ----------
export function switchScreen(name){
  document.body.dataset.screen = name;
  document.querySelectorAll('.nav-btn[data-screen]').forEach(b=>{
    b.classList.toggle('active', b.dataset.screen === name);
  });
  if(name === 'map') setTimeout(()=>map.invalidateSize(), 60);
}

// app.js вызывает это заново, когда PLACES действительно пополнились
// (см. onPlacesLoaded в app.js) — тот же паттерн, что rebuildMarkers()/refresh().
export function refreshRecommend(){
  buildQueue();
  renderStack();
}

export async function initRecommend(){
  stackEl   = document.getElementById('reco-stack');
  sheetBack = document.getElementById('reco-sheet-back');
  sheetBody = document.getElementById('reco-sheet-body');

  await loadSignals();

  document.getElementById('reco-skip').addEventListener('click', ()=>swipeTop('skip'));
  document.getElementById('reco-later').addEventListener('click', ()=>swipeTop('save'));
  document.getElementById('reco-like').addEventListener('click', ()=>swipeTop('like'));
  document.getElementById('reco-sheet-close').addEventListener('click', closeSheet);
  sheetBack.addEventListener('click', (e)=>{ if(e.target === sheetBack) closeSheet(); });

  document.querySelectorAll('.nav-btn[data-screen]').forEach(btn=>{
    btn.addEventListener('click', ()=>switchScreen(btn.dataset.screen));
  });

  const isMobile = window.matchMedia('(max-width:860px)').matches;
  switchScreen(isMobile ? 'recommend' : 'map');

  renderStack();
}
