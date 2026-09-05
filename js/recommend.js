// ---------- ЭКРАН «КУДА СЕГОДНЯ?» (рекомендации / свайпы) ----------
// Второй способ смотреть на те же PLACES (первый — карта+фильтры в app.js).
// Кандидаты — места со статусом "plan" (ещё не были). Решения по свайпам
// (нравится / не интересно / на потом) больше не хранятся как отдельные
// три Set'а — это события в общем журнале взаимодействий (interactions.js),
// см. data_refactoring.md: raw-события отдельно от того, что из них следует.
import { PLACES, statusInfo, catInfo, countryInfo, seasonInfo } from './places.js';
import { flyToPlace, map } from './map.js';
import { setFilter } from './filters.js';
import { loadInteractions, logInteraction, hasInteraction, clearInteractions } from './interactions.js';
import { computeProfile } from './profile.js';
import { currentContext, getWeather, getUserPosition } from './context.js';
import { rankPlaces } from './recommendationEngine.js';

let queue = [];               // элементы {place, score, reasons} — см. buildQueue()
let stackEl, sheetBack, sheetBody;
// Погода — один запрос на сессию (см. context.js), приходит асинхронно
// уже после первого рендера; когда придёт, просто пересчитываем очередь.
let weather = null;
// Позиция пользователя — тот же принцип, что и погода: один запрос на
// сессию, приходит асинхронно; когда придёт, просто пересчитываем очередь.
let userPos = null;
// "Показано" в эту сессию — только чтобы не заспамить журнал повторным
// логированием 'viewed' при каждом ре-рендере одной и той же верхней
// карточки (renderStack дергается чаще, чем реально меняется top of stack).
const viewedThisSession = new Set();

// ---------- ПОДБОР И РАНЖИРОВАНИЕ КАНДИДАТОВ ----------
// Реализация "Place → Interaction → Derived signals → Recommendation" из
// data_refactoring.md: candidates — сырые кандидаты (места-планы, на
// которые ещё нет решения), profile/ctx/weather — производные сигналы и
// объективная реальность, rankPlaces — сама формула score.
function buildQueue(){
  const candidates = PLACES.filter(p =>
    p.cat === 'plan' && !hasInteraction(p.id, 'not_interested') && !hasInteraction(p.id, 'liked'));
  const profile = computeProfile(PLACES);
  const ctx = currentContext();
  const ranked = rankPlaces(candidates, profile, ctx, weather, userPos);
  // "На потом" не выкидываем — просто откладываем в конец очереди,
  // чтобы карточка попалась снова, но не мешала более уместным вариантам.
  const primary  = ranked.filter(r => !hasInteraction(r.place.id, 'saved_for_later'));
  const deferred = ranked.filter(r => hasInteraction(r.place.id, 'saved_for_later'));
  queue = [...primary, ...deferred];
}

function catArtSrc(catKey){
  const html = catInfo(catKey).ico || '';
  const m = /src=['"]([^'"]+)['"]/.exec(html);
  return m ? m[1] : '';
}

// ---------- РЕНДЕР СТОПКИ КАРТОЧЕК ----------
function badgesHtml(place){
  const st = statusInfo(place.cat);
  // issue #15/#1: эти теги фильтруют так же, как на карте, для ЛЮБОГО типа
  // тега (не только category/status/country — сезон тоже, см. filters.js's
  // FILTER_TYPES) — .cat-tag-btn даёт тот же CSS-хук (курсор/hover), что и
  // на карте (styles.css грузится глобально); .reco-link — чтобы клик по
  // тегу внутри свайп-карточки не запускал драг (см. attachDrag ниже).
  const catBadges = place.cats.slice(0,2).map(c =>
    `<span class="popup-badge cat cat-tag-btn reco-link" data-filter-type="cat" data-filter-value="${c}" role="button" tabindex="0"><span class="cat-art">${catInfo(c).ico}</span>${catInfo(c).label.replace(' / ',' · ')}</span>`).join('');
  const seasonBadge = place.season !== 'all'
    ? `<span class="popup-badge cat cat-tag-btn reco-link" data-filter-type="season" data-filter-value="${place.season}" role="button" tabindex="0">${seasonInfo(place.season).ico} ${seasonInfo(place.season).label}</span>` : '';
  return `<div class="popup-badges reco-badges">
      <span class="popup-badge ${st.badge} cat-tag-btn reco-link" data-filter-type="status" data-filter-value="${place.cat}" role="button" tabindex="0">${st.label}</span>
      <span class="popup-badge cat cat-tag-btn reco-link" data-filter-type="country" data-filter-value="${place.country}" role="button" tabindex="0">${countryInfo(place.country).flag} ${countryInfo(place.country).label}</span>
      ${seasonBadge}${catBadges}
    </div>`;
}

// Общая функция для карточки свайпа и шторки деталей — обе используют
// badgesHtml() и должны применять фильтр одинаково, но это два разных места
// вставки в DOM (см. buildCardEl/openSheet), поэтому клики навешиваются
// отдельно на каждый контейнер, а не один раз глобально.
function wireBadgeClicks(container){
  container.querySelectorAll('.cat-tag-btn[data-filter-type]').forEach(tag=>{
    const activate = (e)=>{
      e.stopPropagation();
      setFilter(tag.dataset.filterType, tag.dataset.filterValue);
      // "ведут себя так же, как на карте" — там клик по тегу закрывает
      // попап и фильтрует карту под ним; здесь ближайший эквивалент —
      // закрыть шторку деталей, если она открыта (клик мог прийти оттуда),
      // и сразу показать отфильтрованную карту.
      if(sheetBack.classList.contains('open')) closeSheet();
      switchScreen('map');
    };
    tag.addEventListener('click', activate);
    tag.addEventListener('keydown', e=>{
      if(e.key === 'Enter' || e.key === ' '){ e.preventDefault(); activate(e); }
    });
  });
}

function buildCardEl(place, depth, reasons){
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
      ${reasons.map(r => `
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
  wireBadgeClicks(el);

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
      clearInteractions();
      viewedThisSession.clear();
      buildQueue();
      renderStack();
    });
    return;
  }

  queue.slice(0,3).forEach((item, i)=>{
    const cardEl = buildCardEl(item.place, i, item.reasons);
    stackEl.appendChild(cardEl);
    if(i === 0) attachDrag(cardEl, item.place);
  });

  const top = queue[0];
  if(top && !viewedThisSession.has(top.place.id)){
    viewedThisSession.add(top.place.id);
    logInteraction('viewed', top.place.id, {source:'recommend_stack', score: top.score});
  }
}

// ---------- СВАЙП: РЕШЕНИЕ + АНИМАЦИЯ ----------
const DIR_TO_TYPE = { like:'liked', skip:'not_interested', save:'saved_for_later' };

function decide(place, dir){
  logInteraction(DIR_TO_TYPE[dir], place.id, {source:'swipe'});
  if(dir === 'like'){ showToast(`❤️ «${place.name}» — понравилось, учтём в следующих подборках`); }
  if(dir === 'skip'){ showToast(`Скрыли «${place.name}»`); }
  if(dir === 'save'){ showToast(`«${place.name}» — сохранили на потом`); }
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
  decide(top.place, dir);
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
  wireBadgeClicks(sheetBody);
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
  if(name === 'map'){
    setTimeout(()=>map.invalidateSize(), 60);
  }else{
    // уходим с карты — если там был открыт попап места, он не должен
    // "всплывать" поверх следующего экрана (Leaflet считает его открытым
    // независимо от того, что #app сейчас скрыт через CSS)
    map.closePopup();
  }
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

  await loadInteractions();

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

  // Погода приходит позже первого рендера (сетевой запрос + геолокация) —
  // когда придёт, просто пересчитываем очередь с уже известной погодой.
  // Не блокируем открытие экрана ради этого.
  getWeather().then(w => { weather = w; refreshRecommend(); });
  getUserPosition().then(p => { userPos = p; refreshRecommend(); });
}
