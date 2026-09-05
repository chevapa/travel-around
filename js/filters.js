import { PLACES, CATEGORIES, COUNTRIES, SEASONS, STATUSES, SOURCES, catInfo, countryInfo, statusInfo, seasonInfo, sourceKey, getVisiblePlaces } from './places.js';
import { map, showPlaces, flyToPlace, setReturnBadgeVisible, BASE_POINTS } from './map.js';
import { haversineDistance } from './context.js';

// ---------- СОСТОЯНИЕ ФИЛЬТРОВ ----------
// По умолчанию при открытии сайта показываем только план поездок по Хорватии
// (это то, что чаще всего актуально смотреть) — остальное включается вручную.
const DEFAULT_STATUSES = ['plan'];
const DEFAULT_COUNTRIES = ['hr'];
const DEFAULT_SOURCES = Object.keys(SOURCES); // источник не ограничиваем

export const state = {
  statuses: new Set(DEFAULT_STATUSES),
  cats: new Set(Object.keys(CATEGORIES)),
  countries: new Set(DEFAULT_COUNTRIES),
  seasons: new Set(Object.keys(SEASONS)),
  sources: new Set(DEFAULT_SOURCES),
  onlyReturn: false,
  showReturnBadge: true,
  query: "",
  sortByDistance: false, // issue #39
};

export function visiblePlaces(){
  return getVisiblePlaces(state);
}

export function refresh(){
  const visible = visiblePlaces();
  showPlaces(visible);
  renderList(visible);
  updateCounts();
}

// ---------- ФИЛЬТР ПО КЛИКУ НА ЛЮБОЙ ТЕГ ----------
// issue #1 (после #14/#15/#16): раньше на каждый тип тега была отдельная,
// почти одинаковая функция (setCatFilter/setStatusFilter/setCountryFilter)
// — и сезон остался некликабельным просто потому что четвёртую копию
// никто не написал. Это ровно то, о чём просил issue: "FILTER SYSTEM > ANY
// TAG TYPE > CLICK > FILTER BY THIS TAG TYPE" — один источник правды на
// каждый тип тега (какой ключ в state, какая панель, как читать текущий
// выбор, как подписать тост) и одна функция setFilter(type, value), общая
// для всех. Добавить новый тип тега в будущем — это одна запись здесь плюс
// data-filter-type/-value на самом теге (см. map.js/recommend.js), а не
// ещё одна копия этой функции.
const FILTER_TYPES = {
  cat:     { stateKey:'cats',      listId:'cat-list',     countSelector:'[data-cat-count]',     countProp:'catCount',     label:catInfo,     toastPrefix:'Выбран тип места' },
  status:  { stateKey:'statuses',  listId:'status-list',  countSelector:'[data-status-count]',  countProp:'statusCount',  label:statusInfo,  toastPrefix:'Выбран статус' },
  country: { stateKey:'countries', listId:'country-list', countSelector:'[data-country-count]', countProp:'countryCount', label:countryInfo, toastPrefix:'Выбрана страна' },
  season:  { stateKey:'seasons',   listId:'season-list',  countSelector:'[data-season-count]',  countProp:'seasonCount',  label:seasonInfo,  toastPrefix:'Выбран сезон' },
};

export function setFilter(type, value){
  const cfg = FILTER_TYPES[type];
  if(!cfg) return; // неизвестный тип тега — молча ничего не делаем, не падаем
  state[cfg.stateKey] = new Set([value]);
  document.getElementById(cfg.listId).querySelectorAll('input').forEach(input=>{
    const label = input.closest('.check');
    const on = label.querySelector(cfg.countSelector).dataset[cfg.countProp] === value;
    input.checked = on;
    label.classList.toggle('off', !on);
  });
  refresh();
  showFilterToast(`${cfg.toastPrefix}: ${cfg.label(value).label}`);
}

// issue #27: вынесено из initFilters() в отдельную функцию — раньше жило
// только внутри обработчика клика на #reset-filters, теперь нужно ещё и
// из ссылки «Сбросить» внутри тоста (см. showFilterToast). Не полагается
// на локальные переменные initFilters() — сама делает все document.
// getElementById, чтобы быть вызываемой из любого места.
function resetFilters(){
  state.statuses = new Set(DEFAULT_STATUSES);
  state.countries = new Set(DEFAULT_COUNTRIES);
  state.seasons = new Set(Object.keys(SEASONS));
  state.cats = new Set(Object.keys(CATEGORIES));
  state.sources = new Set(DEFAULT_SOURCES);
  state.onlyReturn = false;
  state.query = '';
  const searchEl = document.getElementById('place-search');
  if(searchEl) searchEl.value = '';
  // Сезон/тип места/«хотим вернуться» всегда сбрасываются на «включено всё».
  document.querySelectorAll('#panel-season input[type=checkbox], #panel-cats input[type=checkbox], #check-return input[type=checkbox]')
    .forEach(i=>{i.checked=true; i.closest('.check')?.classList.remove('off');});
  // Статус/страна/источник — сбрасываем к тому же дефолту, что и при
  // открытии сайта (см. state выше), а не поголовно на «включено всё».
  const statusList = document.getElementById('status-list');
  const countryList = document.getElementById('country-list');
  const sourceList = document.getElementById('source-list');
  [
    [statusList, 'status-count', 'statusCount'],
    [countryList, 'country-count', 'countryCount'],
    [sourceList, 'source-count', 'sourceCount'],
  ].forEach(([list, attr, dataKey])=>{
    list.querySelectorAll('.check').forEach(check=>{
      const key = check.querySelector(`[data-${attr}]`).dataset[dataKey];
      const stateSet = list===statusList ? state.statuses : list===countryList ? state.countries : state.sources;
      const on = stateSet.has(key);
      check.querySelector('input').checked = on;
      check.classList.toggle('off', !on);
    });
  });
  refresh();
}

// issue #16: клик по тегу молча меняет фильтры — на карте это выглядит как
// «внезапная» смена без объяснения. Короткий тост — самая безопасная часть
// предложенных в issue вариантов (сообщение о том, что фильтр изменился);
// автооткрытие сайдбара фильтров и подсветка внутри него сознательно
// оставлены как отдельная задача, как и разрешает сам issue текстом
// "if only some part ... implemented leave the rest for a new task".
//
// issue #27: 2200ms оказалось мало, чтобы успеть среагировать, а сам тост
// был чисто информационным — теперь дольше висит (5000ms) и несёт кнопку
// «Сбросить», сбрасывающую все фильтры к дефолту (та же resetFilters(),
// что и у #reset-filters в тулбаре) прямо из тоста, без похода к панели
// фильтров. msg подставляется только из ${cfg.label(value).label} внутри
// самого filters.js (см. setFilter) — не пользовательский ввод, поэтому
// innerHTML здесь безопасен.
let filterToastEl;
function showFilterToast(msg){
  if(!filterToastEl){
    filterToastEl = document.createElement('div');
    filterToastEl.id = 'filter-toast';
    filterToastEl.innerHTML = `<span class="filter-toast-msg"></span><button type="button" class="filter-toast-reset">Сбросить</button>`;
    filterToastEl.querySelector('.filter-toast-reset').addEventListener('click', ()=>{
      resetFilters();
      filterToastEl.classList.remove('show');
      clearTimeout(filterToastEl._hideTimer);
    });
    document.body.appendChild(filterToastEl);
  }
  filterToastEl.querySelector('.filter-toast-msg').textContent = msg;
  filterToastEl.classList.add('show');
  clearTimeout(filterToastEl._hideTimer);
  filterToastEl._hideTimer = setTimeout(()=>filterToastEl.classList.remove('show'), 5000);
}

// ---------- СПИСОК РЕЗУЛЬТАТОВ ----------
// issue #39: place.drive — захардкоженный текст ("50 мин"), не число, и
// парсить его ненадёжно (формат "X ч Y мин (Z км по дорогам)" не всегда
// одинаковый). Сортируем по прямому расстоянию от той же базовой точки,
// вокруг которой рисуются кольца ~1ч/~2ч/~3ч (map.js's BASE_POINTS) — это
// уже настоящее число для каждого места (lat/lng есть всегда).
function distanceKm(place){
  // BASE_POINTS.zagreb accessed lazily, not cached at module top level —
  // map.js and filters.js import each other (map.js needs setFilter,
  // filters.js needs BASE_POINTS), and dereferencing BASE_POINTS eagerly
  // at module init time hit "Cannot access 'BASE_POINTS' before
  // initialization" depending on which module's top-level code ran first.
  // Every other cross-import here was already lazy (used inside click
  // handlers) for the same reason.
  const zagreb = BASE_POINTS.zagreb;
  return haversineDistance(zagreb.lat, zagreb.lng, place.lat, place.lng);
}
function renderList(places){
  const wrap = document.getElementById('list-wrap');
  wrap.innerHTML = '';
  if(!places.length){
    wrap.innerHTML = '<p class="empty-note">Ничего не подходит под выбранные фильтры. Включите больше типов мест или статусов.</p>';
    return;
  }
  Object.entries(STATUSES).forEach(([key, s])=>{
    const items = places.filter(p=>p.cat===key);
    if(!items.length) return;
    if(state.sortByDistance) items.sort((a,b)=>distanceKm(a)-distanceKm(b));
    const h = document.createElement('div');
    h.className='group-title'; h.textContent = s.label;
    wrap.appendChild(h);
    items.forEach(place=>{
      const card = document.createElement('div');
      card.className='place-card';
      const star = place.wantReturn ? '<span class="star-mark">★</span>' : '';
      const catIcons = place.cats.slice(0,3).map(c=>catInfo(c).ico).join(' ');
      card.innerHTML = `<span class="dot" style="background:${s.color}"></span>
        <span class="info">
          <div class="name">${countryInfo(place.country).flag} ${place.name}${star}${place.warn?' <span title="Проверить перед выездом">⚠️</span>':''}</div>
          <div class="meta">${catIcons} · 🚗 ${place.drive}${place.meta ? ' · '+place.meta : ''}</div>
        </span>`;
      card.addEventListener('click', ()=>flyToPlace(place));
      wrap.appendChild(card);
    });
  });
}

function updateCounts(){
  const vis = visiblePlaces();
  document.getElementById('result-count-text').textContent = `${vis.length} мест${state.query ? ' по запросу «'+state.query+'»' : ' подходит'}`;
  document.getElementById('hero-count').textContent = vis.length;
  document.querySelectorAll('[data-status-count]').forEach(el=>{
    el.textContent = PLACES.filter(p=>p.cat===el.dataset.statusCount).length;
  });
  document.querySelectorAll('[data-cat-count]').forEach(el=>{
    el.textContent = PLACES.filter(p=>p.cats.includes(el.dataset.catCount)).length;
  });
  document.querySelectorAll('[data-country-count]').forEach(el=>{
    el.textContent = PLACES.filter(p=>p.country===el.dataset.countryCount).length;
  });
  document.querySelectorAll('[data-season-count]').forEach(el=>{
    el.textContent = PLACES.filter(p=>p.season===el.dataset.seasonCount).length;
  });
  document.querySelectorAll('[data-source-count]').forEach(el=>{
    el.textContent = PLACES.filter(p=>sourceKey(p)===el.dataset.sourceCount).length;
  });
  document.getElementById('count-return').textContent = PLACES.filter(p=>p.wantReturn).length;
}

// ---------- ИНИЦИАЛИЗАЦИЯ UI ФИЛЬТРОВ ----------
export function initFilters(){
  const statusList = document.getElementById('status-list');
  Object.entries(STATUSES).forEach(([key, s])=>{
    const checked = state.statuses.has(key);
    const el = document.createElement('label');
    el.className = 'check' + (checked ? '' : ' off');
    el.innerHTML = `<input type="checkbox" ${checked ? 'checked' : ''}>
      <span class="swatch" style="background:${s.color}"></span>
      <span class="txt">${s.label}</span>
      <span class="num" data-status-count="${key}"></span>
      <button type="button" class="panel-toggle-btn only-btn" data-filter-type="status" data-filter-value="${key}">только</button>`;
    el.querySelector('input').addEventListener('change', e=>{
      if(e.target.checked) state.statuses.add(key); else state.statuses.delete(key);
      el.classList.toggle('off', !e.target.checked);
      refresh();
    });
    statusList.appendChild(el);
  });

  const sourceList = document.getElementById('source-list');
  Object.entries(SOURCES).forEach(([key, s])=>{
    const checked = state.sources.has(key);
    const el = document.createElement('label');
    el.className = 'check' + (checked ? '' : ' off');
    el.innerHTML = `<input type="checkbox" ${checked ? 'checked' : ''}>
      <span class="ico">${s.ico}</span>
      <span class="txt">${s.label}</span>
      <span class="num" data-source-count="${key}"></span>`;
    el.querySelector('input').addEventListener('change', e=>{
      if(e.target.checked) state.sources.add(key); else state.sources.delete(key);
      el.classList.toggle('off', !e.target.checked);
      refresh();
    });
    sourceList.appendChild(el);
  });

  const countryList = document.getElementById('country-list');
  const countryToggleRow = document.createElement('div');
  countryToggleRow.className = 'panel-toggle-row';
  countryToggleRow.innerHTML = `<button type="button" class="panel-toggle-btn" data-toggle="all">Выбрать все</button>
    <button type="button" class="panel-toggle-btn" data-toggle="none">Снять всё</button>`;
  countryList.appendChild(countryToggleRow);

  const countryCheckboxes = []; // {key, input, label} — для массового вкл/выкл кнопками выше
  Object.entries(COUNTRIES).forEach(([key, c])=>{
    const checked = state.countries.has(key);
    const el = document.createElement('label');
    el.className = 'check' + (checked ? '' : ' off');
    el.innerHTML = `<input type="checkbox" ${checked ? 'checked' : ''}>
      <span class="ico">${c.flag}</span>
      <span class="txt">${c.label}</span>
      <span class="num" data-country-count="${key}"></span>
      <button type="button" class="panel-toggle-btn only-btn" data-filter-type="country" data-filter-value="${key}">только</button>`;
    const input = el.querySelector('input');
    input.addEventListener('change', e=>{
      if(e.target.checked) state.countries.add(key); else state.countries.delete(key);
      el.classList.toggle('off', !e.target.checked);
      refresh();
    });
    countryCheckboxes.push({ key, input, label: el });
    countryList.appendChild(el);
  });

  countryToggleRow.querySelectorAll('[data-toggle]').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const selectAll = btn.dataset.toggle === 'all';
      countryCheckboxes.forEach(({ key, input, label })=>{
        if(selectAll) state.countries.add(key); else state.countries.delete(key);
        input.checked = selectAll;
        label.classList.toggle('off', !selectAll);
      });
      refresh();
    });
  });

  const seasonList = document.getElementById('season-list');
  Object.entries(SEASONS).forEach(([key, s])=>{
    const el = document.createElement('label');
    el.className = 'check';
    el.innerHTML = `<input type="checkbox" checked>
      <span class="ico">${s.ico}</span>
      <span class="txt">${s.label}</span>
      <span class="num" data-season-count="${key}"></span>
      <button type="button" class="panel-toggle-btn only-btn" data-filter-type="season" data-filter-value="${key}">только</button>`;
    el.querySelector('input').addEventListener('change', e=>{
      if(e.target.checked) state.seasons.add(key); else state.seasons.delete(key);
      el.classList.toggle('off', !e.target.checked);
      refresh();
    });
    seasonList.appendChild(el);
  });

  const catList = document.getElementById('cat-list');
  Object.entries(CATEGORIES).forEach(([key, c])=>{
    const el = document.createElement('label');
    el.className = 'check';
    el.innerHTML = `<input type="checkbox" checked>
      <span class="ico">•</span>
      <span class="txt">${c.label}</span>
      <span class="num" data-cat-count="${key}"></span>
      <button type="button" class="panel-toggle-btn only-btn" data-filter-type="cat" data-filter-value="${key}">только</button>`;
    el.querySelector('input').addEventListener('change', e=>{
      if(e.target.checked) state.cats.add(key); else state.cats.delete(key);
      el.classList.toggle('off', !e.target.checked);
      refresh();
    });
    catList.appendChild(el);
  });

  document.getElementById('cats-all').addEventListener('click', ()=>{
    Object.keys(CATEGORIES).forEach(k=>state.cats.add(k));
    catList.querySelectorAll('input').forEach(i=>{i.checked=true; i.closest('.check').classList.remove('off');});
    refresh();
  });
  document.getElementById('cats-none').addEventListener('click', ()=>{
    state.cats.clear();
    catList.querySelectorAll('input').forEach(i=>{i.checked=false; i.closest('.check').classList.add('off');});
    refresh();
  });

  // issue #38: одна делегированная точка на все .only-btn сразу — они уже
  // несут data-filter-type/-value (см. status/country/season/cat блоки
  // выше), так что isolate-to-one — это ровно тот же setFilter(), что уже
  // используют клики по тегам на карте/рекомендациях. preventDefault/
  // stopPropagation обязательны: кнопка лежит внутри <label>, клик по
  // которому иначе ещё и переключил бы сам чекбокс.
  document.querySelectorAll('.only-btn').forEach(btn=>{
    btn.addEventListener('click', e=>{
      e.preventDefault();
      e.stopPropagation();
      setFilter(btn.dataset.filterType, btn.dataset.filterValue);
    });
  });

  // issue #39
  const sortToggle = document.getElementById('sort-toggle');
  sortToggle.addEventListener('click', ()=>{
    state.sortByDistance = !state.sortByDistance;
    sortToggle.classList.toggle('active', state.sortByDistance);
    refresh();
  });

  const returnCheck = document.getElementById('check-return').querySelector('input');
  returnCheck.addEventListener('change', e=>{
    // checked = показывать звёзды и не фильтровать; unchecked = скрыть звёзды
    state.showReturnBadge = e.target.checked;
    setReturnBadgeVisible(e.target.checked);
    document.getElementById('check-return').classList.toggle('off', !e.target.checked);
  });

  // Раскрывающиеся секции (Статус/Источник/Страна/...)
  document.querySelectorAll('.panel-head').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      document.getElementById(btn.dataset.panel).classList.toggle('closed');
    });
  });

  // Mobile: раньше блок фильтров схлопывался, чтобы был виден список —
  // теперь на мобильном полноэкранная шторка и место есть, поэтому просто
  // не сворачиваем вовсе (см. также styles.css: #controls всегда открыт).
  const filtersToggle = document.getElementById('filters-toggle');
  const controlsEl = document.getElementById('controls');
  filtersToggle.addEventListener('click', ()=>{
    controlsEl.classList.toggle('collapsed');
    filtersToggle.classList.toggle('collapsed');
  });

  // ---------- ШТОРКА ФИЛЬТРОВ / ПОИСК / СБРОС ----------
  const sidebarEl = document.getElementById('sidebar');
  const searchEl = document.getElementById('place-search');
  function setFiltersOpen(open){
    sidebarEl.classList.toggle('open', open);
    if(open) setTimeout(()=>document.getElementById('base-select')?.focus(), 30);
  }
  document.getElementById('open-filters').addEventListener('click', ()=>setFiltersOpen(!sidebarEl.classList.contains('open')));
  document.getElementById('close-filters').addEventListener('click', ()=>setFiltersOpen(false));
  document.getElementById('reset-filters').addEventListener('click', resetFilters);
  searchEl.addEventListener('input', ()=>{ state.query = searchEl.value; refresh(); });

  // ---------- СВЕРНУТЬ/ПОКАЗАТЬ ВСЮ ЛЕВУЮ ПАНЕЛЬ ----------
  const appEl = document.getElementById('app');
  document.getElementById('sidebar-collapse').addEventListener('click', ()=>{
    const hidden = appEl.classList.toggle('hidden-sidebar');
    document.getElementById('collapse-txt').textContent = hidden ? 'Показать панель' : 'Скрыть панель';
    document.getElementById('collapse-ico').innerHTML = hidden
      ? '<path d="M9 18l6-6-6-6"/>'
      : '<path d="M15 18l-6-6 6-6"/>';
    setTimeout(()=>map.invalidateSize(), 60);
  });

  refresh();
}
