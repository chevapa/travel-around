// ---------- СЛОВАРИ / ВОКАБУЛЯР МЕСТА ----------
// Категории, страны, сезоны, статусы, источники — общий "справочник",
// на который опираются карта (иконки/цвета), фильтры (чекбоксы) и
// модалка добавления/редактирования (select'ы). Раньше эти 5 объектов были
// захардкожены прямо тут; теперь они лежат в data/vocab.json — так же, как
// сами места лежат в JSON, а не в коде. Правится через GitHub, без правки .js.
//
// top-level await: модуль places.js не закончит инициализацию (а значит и
// все, кто его импортирует — map.js/filters.js/modal.js/app.js — не начнут
// строить UI), пока этот fetch не завершится. Это специально: раньше
// CATEGORIES и другие константы были доступны сразу и синхронно, и не
// хотелось переписывать весь app.js на передачу колбэков ради одного fetch.
const VOCAB_URL = 'data/vocab.json';
const vocab = await fetch(VOCAB_URL).then(r => r.json());

export const CATEGORIES = vocab.categories;
export const COUNTRIES = vocab.countries;
export const SEASONS = vocab.seasons;
export const STATUSES = vocab.statuses;
export const SOURCES = vocab.sources;

// Заглушки для незнакомой/опечатанной категории/страны/статуса/сезона —
// чтобы одна плохая точка не ломала отрисовку остальных мест.
export function catInfo(c){ return CATEGORIES[c] || {label:c, ico:'❔'}; }
export function countryInfo(cc){ return COUNTRIES[cc] || {flag:'🏳️', label:cc, local:cc}; }
export function statusInfo(cat){ return STATUSES[cat] || {label:cat, color:'#888', badge:'grey'}; }
export function seasonInfo(s){ return SEASONS[s] || {label:s, ico:'📅'}; }

// Места без явного src (напр. дропнутые в places/ файлы без этого поля)
// по умолчанию считаются "ресёрчем" — неподтверждённая подборка, не личный опыт.
// Места, добавленные вручную через карту (custom:true), считаются личными
// (как дневник), даже если явный src не указан.
export function sourceKey(p){
  if(p.src === 'journal') return 'journal';
  if(p.custom) return 'journal';
  return 'research';
}

// ---------- КОЛЛЕКЦИЯ МЕСТ ----------
// Базовый набор мест больше НЕ хранится здесь построчно.
// Он подгружается асинхронно из репозитория GitHub — файлы
// places/base-visited-loved.json, base-visited-ok.json,
// base-plans.json, base-research-east.json (см. loadBasePlaces() ниже).
// Пользовательские точки (custom:true) — из localStorage (loadCustom()).
// Точки из места-файлов сообщества — из папки places/ (loadFolderPlaces()).
export const PLACES = [];

// Возвращает подмножество PLACES, проходящее фильтр state. Чистая функция —
// не трогает DOM/карту, поэтому легко переиспользуется и из filters.js
// (для рендера списка/счётчиков), и потенциально откуда угодно ещё.
export function getVisiblePlaces(state){
  const q = state.query.trim().toLowerCase();
  return PLACES.filter(p=>{
    const text = [p.name,p.q,p.note,p.meta].filter(Boolean).join(" ").toLowerCase();
    return state.statuses.has(p.cat) &&
      state.countries.has(p.country) &&
      state.seasons.has(p.season) &&
      state.sources.has(sourceKey(p)) &&
      p.cats.some(c=>state.cats.has(c)) &&
      (!state.onlyReturn || p.wantReturn) &&
      (!q || text.includes(q));
  });
}

// ---------- ХРАНИЛИЩЕ ----------
// Универсальное хранилище: window.storage (артефакт) или localStorage (GitHub Pages/локально)
export const store = {
  async set(k,v){
    if(window.storage) return window.storage.set(k,v);
    localStorage.setItem(k,v);
  },
  async get(k){
    if(window.storage) return window.storage.get(k);
    const v = localStorage.getItem(k);
    return v==null ? null : {value:v};
  }
};

export const STORAGE_KEY = 'trip-atlas-custom-places';

export async function saveCustom(){
  const custom = PLACES.filter(p=>p.custom);
  try{ await store.set(STORAGE_KEY, JSON.stringify(custom)); }
  catch(e){ /* хранилище недоступно — точки останутся только на эту сессию */ }
}

// onLoaded вызывается один раз, если реально что-то добавили — им map.js
// передаёт rebuildMarkers(), чтобы places.js не знал про Leaflet.
export async function loadCustom(onLoaded){
  try{
    const r = await store.get(STORAGE_KEY);
    if(r && r.value){
      const arr = JSON.parse(r.value);
      if(Array.isArray(arr) && arr.length){
        arr.forEach(p=>PLACES.push(p));
        onLoaded();
      }
    }
  }catch(e){ /* ключа ещё нет — это нормально при первом запуске */ }
}

// ---------- БАЗОВЫЙ НАБОР МЕСТ (places/base-*.json) ----------
// Раньше это был хардкодный массив прямо в index.html. Теперь это 4 файла
// в папке places/ репозитория — грузятся напрямую по raw-ссылке (CDN,
// без обращения к ограниченному по частоте GitHub Contents API), поэтому
// показ базового набора не зависит от лимита запросов, который делится
// с автоподхватом пользовательских файлов ниже (loadFolderPlaces).
export const BASE_FILES = [
  'base-visited-loved.json',
  'base-visited-ok.json',
  'base-plans.json',
  'base-research-east.json',
];
const RAW_BASE = 'https://raw.githubusercontent.com/chevapa/travel-around/main/places/';

export async function loadBasePlaces(onLoaded){
  try{
    const results = await Promise.all(BASE_FILES.map(async name => {
      try{
        const r = await fetch(RAW_BASE + name);
        return r.ok ? await r.json() : null;
      }catch(e){ return null; }
    }));
    let added = 0;
    results.forEach(data => {
      if(!Array.isArray(data)) return;
      data.forEach(p => {
        if(p && p.name && typeof p.lat === 'number' && typeof p.lng === 'number'){
          PLACES.push(p);
          added++;
        }
      });
    });
    if(added) onLoaded();
    console.info(`places/base-*.json: загружено ${added} точек`);
  }catch(e){ /* нет сети — карта останется пустой до восстановления соединения */ }
}

// ---------- ОБЩИЕ МЕСТА ИЗ ПАПКИ places/ В РЕПОЗИТОРИИ ----------
// Любой .json-файл, положенный в папку places/ на GitHub (drag&drop + Commit),
// подхватывается автоматически при загрузке страницы — редактировать
// массив PLACES вручную не нужно. Файлы, начинающиеся с "_", игнорируются
// (используются под шаблон/примеры), как и файлы из BASE_FILES выше —
// они уже загружены напрямую через loadBasePlaces(). Файл может содержать
// один объект-место или массив таких объектов — поля те же, что раньше
// были в PLACES (см. README).
const FOLDER_API = 'https://api.github.com/repos/chevapa/travel-around/contents/places';

export async function loadFolderPlaces(onLoaded){
  try{
    const res = await fetch(FOLDER_API);
    if(!res.ok) return; // папки нет, лимит API GitHub исчерпан и т.п. — молча пропускаем
    const files = await res.json();
    if(!Array.isArray(files)) return;

    const jsonFiles = files.filter(f =>
      f.type === 'file' && f.name.endsWith('.json') &&
      !f.name.startsWith('_') && !BASE_FILES.includes(f.name));

    const results = await Promise.all(jsonFiles.map(async f => {
      try{
        const r = await fetch(f.download_url);
        return r.ok ? await r.json() : null;
      }catch(e){ return null; }
    }));

    let added = 0;
    results.forEach(data => {
      if(!data) return;
      const items = Array.isArray(data) ? data : [data];
      items.forEach(p => {
        if(p && p.name && typeof p.lat === 'number' && typeof p.lng === 'number'){
          p.src = p.src || 'folder';
          PLACES.push(p);
          added++;
        }
      });
    });

    if(added){ onLoaded(); console.info(`places/: подхвачено ${added} точек`); }
  }catch(e){ /* нет сети / репозиторий приватный / лимит API — не критично, просто пропускаем */ }
}
