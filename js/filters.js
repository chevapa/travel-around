import { PLACES, CATEGORIES, COUNTRIES, SEASONS, STATUSES, SOURCES, catInfo, countryInfo, statusInfo, sourceKey, getVisiblePlaces } from './places.js';
import { map, showPlaces, flyToPlace, setReturnBadgeVisible } from './map.js';

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

// ---------- СПИСОК РЕЗУЛЬТАТОВ ----------
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
  document.getElementById('result-count').textContent = `${vis.length} мест${state.query ? ' по запросу «'+state.query+'»' : ' подходит'}`;
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
      <span class="num" data-status-count="${key}"></span>`;
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
  Object.entries(COUNTRIES).forEach(([key, c])=>{
    const checked = state.countries.has(key);
    const el = document.createElement('label');
    el.className = 'check' + (checked ? '' : ' off');
    el.innerHTML = `<input type="checkbox" ${checked ? 'checked' : ''}>
      <span class="ico">${c.flag}</span>
      <span class="txt">${c.label}</span>
      <span class="num" data-country-count="${key}"></span>`;
    el.querySelector('input').addEventListener('change', e=>{
      if(e.target.checked) state.countries.add(key); else state.countries.delete(key);
      el.classList.toggle('off', !e.target.checked);
      refresh();
    });
    countryList.appendChild(el);
  });

  const seasonList = document.getElementById('season-list');
  Object.entries(SEASONS).forEach(([key, s])=>{
    const el = document.createElement('label');
    el.className = 'check';
    el.innerHTML = `<input type="checkbox" checked>
      <span class="ico">${s.ico}</span>
      <span class="txt">${s.label}</span>
      <span class="num" data-season-count="${key}"></span>`;
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
      <span class="num" data-cat-count="${key}"></span>`;
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
  document.getElementById('reset-filters').addEventListener('click', ()=>{
    state.statuses = new Set(DEFAULT_STATUSES);
    state.countries = new Set(DEFAULT_COUNTRIES);
    state.seasons = new Set(Object.keys(SEASONS));
    state.cats = new Set(Object.keys(CATEGORIES));
    state.sources = new Set(DEFAULT_SOURCES);
    state.onlyReturn = false;
    state.query = '';
    searchEl.value = '';
    // Сезон/тип места/«хотим вернуться» всегда сбрасываются на «включено всё».
    document.querySelectorAll('#panel-season input[type=checkbox], #panel-cats input[type=checkbox], #check-return input[type=checkbox]')
      .forEach(i=>{i.checked=true; i.closest('.check')?.classList.remove('off');});
    // Статус/страна/источник — сбрасываем к тому же дефолту, что и при
    // открытии сайта (см. state выше), а не поголовно на «включено всё».
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
  });
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
