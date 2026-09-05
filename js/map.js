import { PLACES, statusInfo, catInfo, countryInfo, seasonInfo, sourceKey, store } from './places.js';
import { pickMode, setPickedCoords } from './modal.js';
import { setFilter } from './filters.js';
import { haversineDistance } from './context.js';

// ---------- КАРТА ----------
// На мобильном стартуем чуть приближенным видом (примерно по кольцу ~1ч
// вокруг Загреба), а не тем же зумом, что на десктопе — иначе на маленьком
// экране полезная область карты выглядит слишком мелкой и далёкой.
const isMobileViewport = window.matchMedia('(max-width:860px)').matches;
// issue #24: тот же дефолтный зум нужен и для Terra Incognita zoom-fade
// ниже (полная интенсивность на этом зуме и дальше наружу), поэтому вынесен
// в константу, а не остаётся магическим числом только внутри setView.
const DEFAULT_ZOOM = isMobileViewport ? 9 : 8;
export const map = L.map('map', {zoomControl:false}).setView([45.85, 15.60], DEFAULT_ZOOM);
L.control.zoom({position:'bottomright'}).addTo(map);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; OpenStreetMap contributors', maxZoom: 19
}).addTo(map);

const markersLayer = L.layerGroup().addTo(map);
export const markerRefs = [];
const driveTimeCache = {};
let placeIdCounter = 0;

// issue #24 section 5/6: место за пределами дальнего кольца должно
// выглядеть и открываться иначе — "неисследованная точка на старой карте",
// а не обычное место с той же иконкой. Азимут считается тем же плоским
// приближением, что destPoint/ringKmAt ниже (та же геометрия, что рисует
// сам овал кольца), а не честной геодезией — иначе "внутри/снаружи" не
// совпадало бы с тем, что реально нарисовано на карте.
function bearingFlat(from, to){
  const latR = from.lat * Math.PI/180;
  const dLat = to.lat - from.lat, dLng = to.lng - from.lng;
  return (Math.atan2(dLng*Math.cos(latR), dLat) * 180/Math.PI + 360) % 360;
}
function isTerraIncognita(place){
  const base = BASE_POINTS.zagreb, outermost = RING_DATA.zagreb[RING_DATA.zagreb.length-1];
  const boundaryKm = ringKmAt(outermost, bearingFlat(base, place));
  return haversineDistance(base.lat, base.lng, place.lat, place.lng) > boundaryKm;
}

export function buildMarker(place){
  const color = statusInfo(place.cat).color;
  const terra = isTerraIncognita(place);
  const html = terra
    ? `<div class="pin-wrap"><div class="pin-terra" style="border-color:${color}"></div></div>`
    : `<div class="pin-wrap">
      <div class="pin-dot" style="background:${color}"></div>
      ${place.wantReturn ? `<div class="pin-badge">★</div>` : ''}
    </div>`;
  const icon = L.divIcon({html, className:'', iconSize:[28,28], iconAnchor:[14,18], popupAnchor:[0,-20]});
  const marker = L.marker([place.lat,place.lng], {icon});
  const st = statusInfo(place.cat);
  const starMark = place.wantReturn ? ' <span class="star-mark">★</span>' : '';
  const driveId = `dt-${placeIdCounter++}`;
  const catBadges = place.cats.slice(0,3).map(c=>
    `<span class="popup-badge cat cat-tag-btn" data-filter-type="cat" data-filter-value="${c}" role="button" tabindex="0">
      <span class="cat-art">${catInfo(c).ico}</span>${catInfo(c).label.replace(' / ',' · ')}</span>`).join('');
  const countryBadge = `<span class="popup-badge cat cat-tag-btn" data-filter-type="country" data-filter-value="${place.country}" role="button" tabindex="0">${countryInfo(place.country).flag} ${countryInfo(place.country).label}</span>`;
  // issue #1: сезон тоже должен быть кликабельным, как и всё остальное —
  // раньше был единственным пропущенным типом тега именно потому, что для
  // каждого типа была отдельная копипаста вместо одного общего механизма.
  const seasonBadge = place.season!=='all'
    ? `<span class="popup-badge cat cat-tag-btn" data-filter-type="season" data-filter-value="${place.season}" role="button" tabindex="0">${seasonInfo(place.season).ico} ${seasonInfo(place.season).label}</span>` : '';
  const warnBlock = place.warn ? `<p class="popup-warn">⚠️ ${place.warn}</p>` : '';
  const sourceBlock = sourceKey(place) === 'journal'
    ? `<p class="popup-source">📔 Источник: мой дневник поездок</p>`
    : `<p class="popup-source">🔎 Источник: подборка (ИИ-ресёрч по моим предпочтениям)</p>`;
  const searchQ = encodeURIComponent(`${place.q || place.name} ${countryInfo(place.country).local}`);
  const searchUrl = `https://www.google.com/search?q=${searchQ}`;
  // Ссылка "нарисовать маршрут" ведёт в Google Maps без указания origin —
  // Google сам подставляет текущее местоположение пользователя (веб и приложение).
  // BASE_POINTS/base-select здесь больше не участвуют — они остаются только
  // для оценки времени в пути через OSRM (loadDriveTime), где нужна конкретная точка отсчёта.
  const gmapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${place.lat},${place.lng}&travelmode=driving`;
  // issue #24 section 6: место за пределами ~3ч должно чётко сообщать об
  // этом при открытии — не удалять и не занижать данные, просто явно
  // обозначить контекст перед обычным содержимым попапа.
  // place.drive is missing on some research-sourced places (pre-existing
  // data gap, not introduced here — see EXPERIMENT-LOG-style note: caught
  // while testing this exact block against Каньон Матка) — falls back
  // rather than interpolating "undefined" into the popup.
  const terraBlock = terra
    ? `<p class="popup-terra-badge">TERRA INCOGNITA</p><p class="popup-terra-note">За пределами ~3 ч от Загреба${place.drive ? ' · ' + place.drive : ''}</p>`
    : '';
  marker.bindPopup(
    terraBlock +
    `<div class="popup-badges"><span class="popup-badge ${st.badge} cat-tag-btn" data-filter-type="status" data-filter-value="${place.cat}" role="button" tabindex="0">${st.label}</span>${countryBadge}${seasonBadge}${catBadges}</div>` +
    `<p class="popup-title"><a href="${searchUrl}" target="_blank" rel="noopener" class="title-link">${place.name}<svg class="ext-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3"/></svg></a>${starMark}</p>` +
    `<p class="popup-note">${place.note}</p>` +
    warnBlock +
    (place.meta ? `<p class="popup-meta">${place.meta}</p>` : '') +
    sourceBlock +
    `<p class="popup-drivetime" id="${driveId}"><a href="${gmapsUrl}" target="_blank" rel="noopener" class="drivetime-link">🚗 время в пути: <span class="dt-value">${place.drive}</span> <svg class="ext-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3"/></svg></a></p>` +
    `<div class="nearby-box"><button class="nearby-btn" data-id="${place.id}">Что рядом →</button><div class="nearby-out"></div></div>`
  );
  marker.on('popupopen', ()=>loadDriveTime(place, driveId));
  marker.on('add', ()=>{
    const el = marker.getElement();
    const b = el && el.querySelector('.pin-badge');
    if(b) b.classList.toggle('hidden', !showReturnBadge);
  });
  markerRefs.push({place, marker});
}

// filters.js вызывает это при каждом изменении видимого набора — единственная
// точка, где кто-то снаружи трогает markersLayer, остальное инкапсулировано.
export function showPlaces(visiblePlaces){
  const visible = new Set(visiblePlaces);
  markersLayer.clearLayers();
  markerRefs.forEach(({place, marker})=>{
    if(visible.has(place)) markersLayer.addLayer(marker);
  });
}

export function rebuildMarkers(){
  markerRefs.length = 0;
  placeIdCounter = 0;
  PLACES.forEach(buildMarker);
}

export function flyToPlace(place){
  map.flyTo([place.lat,place.lng], 11, {duration:.6});
  const ref = markerRefs.find(r=>r.place===place);
  if(ref) setTimeout(()=>ref.marker.openPopup(), 650);
}

// Значок "хотим вернуться" на пинах можно скрыть галочкой в фильтрах —
// сюда просто пишут текущее состояние без прямой зависимости от filters.js.
let showReturnBadge = true;
export function setReturnBadgeVisible(on){
  showReturnBadge = on;
  markerRefs.forEach(({place, marker})=>{
    if(!place.wantReturn) return;
    const el = marker.getElement();
    const b = el && el.querySelector('.pin-badge');
    if(b) b.classList.toggle('hidden', !on);
  });
}

// ---------- ВРЕМЯ В ПУТИ ----------
// Время в пути зашито вручную (реалистичные значения для оптимальных условий).
// OSRM ниже используется только как уточнение, если сеть доступна.
async function loadDriveTime(place, driveId){
  const base = BASE_POINTS[document.getElementById('base-select').value];
  const cacheKey = `${base.name}::${place.id}`;
  const el = document.getElementById(driveId);
  if(!el) return;
  if(driveTimeCache[cacheKey]){
    el.querySelector('.dt-value').textContent = driveTimeCache[cacheKey];
    return;
  }
  try{
    const url = `https://router.project-osrm.org/route/v1/driving/${base.lng},${base.lat};${place.lng},${place.lat}?overview=false`;
    const ctrl = new AbortController();
    const timer = setTimeout(()=>ctrl.abort(), 5000);
    const res = await fetch(url, {signal:ctrl.signal});
    clearTimeout(timer);
    if(!res.ok) throw new Error('bad');
    const data = await res.json();
    if(!data.routes || !data.routes.length) throw new Error('none');
    const s = data.routes[0].duration, km = Math.round(data.routes[0].distance/1000);
    const h = Math.floor(s/3600), m = Math.round((s%3600)/60);
    const str = (h>0 ? `${h} ч ${m} мин` : `${m} мин`) + ` (${km} км по дорогам)`;
    driveTimeCache[cacheKey] = str;
    const cur = document.getElementById(driveId);
    if(cur){
      cur.querySelector('.dt-value').textContent = str;
      cur.classList.remove('dt-error');
    }
  }catch(err){
    // сеть недоступна — остаётся зашитое значение, ничего не меняем
  }
}

// ---------- РАДИУСЫ (кольца ~1ч / ~2ч / ~3ч) ----------
const BASE_POINTS = { zagreb:{name:'Загреб', lat:45.8150, lng:15.9819} };
// Расстояния ПО ПРЯМОЙ (не по дорогам), откалиброванные по реальному времени:
//  1ч — Вараждин 1:05 (61км) · Ново-Место 54мин (63км) · Кутина 55мин (72км) · Караловац 50мин (47км)
//  2ч — Грац 2:00 (146км) · Постойна 1:58 (137км) · Плитвице 2:00 (107км) · Слав.Брод 1:50 (175км)
//  3ч — Задар 3:00 (197км) · Удине 3:00 (214км) · Осиек 2:50 (213км)
const RING_DATA = { zagreb:[
  {label:'~1 ч', N:61,  E:72,  S:47,  W:63},
  {label:'~2 ч', N:146, E:180, S:107, W:137},
  {label:'~3 ч', N:200, E:225, S:197, W:214},
]};
let baseMarker = null, radiusShapes = [];

function smoothLerp(a,b,t){ const s=t*t*(3-2*t); return a+(b-a)*s; }
function destPoint(lat0,lng0,km,brg){
  const r=brg*Math.PI/180, latR=lat0*Math.PI/180;
  return [lat0 + (km*Math.cos(r))/111.32, lng0 + (km*Math.sin(r))/(111.32*Math.cos(latR))];
}
// Вынесено из ovalPoints (было одно тело цикла) — issue #24 переиспользует
// это же интерполирование, чтобы понять, на каком расстоянии по конкретному
// азимуту проходит граница кольца, а не только для рисования самого овала.
function ringKmAt(d,b){
  if(b<=90) return smoothLerp(d.N,d.E,b/90);
  if(b<=180) return smoothLerp(d.E,d.S,(b-90)/90);
  if(b<=270) return smoothLerp(d.S,d.W,(b-180)/90);
  return smoothLerp(d.W,d.N,(b-270)/90);
}
function ovalPoints(c,d,steps=144){
  const pts=[];
  for(let i=0;i<steps;i++){
    const b=i*360/steps;
    pts.push(destPoint(c.lat,c.lng,ringKmAt(d,b),b));
  }
  return pts;
}

// Огромный прямоугольник «весь мир» (не буквально ±90 — полюса ломают
// проекцию Меркатора) — внешнее кольцо каждого «бублика» градиента ниже.
// Leaflet рисует многокольцевые полигоны по правилу evenodd, так что
// внутреннее кольцо каждого шага вырезает дыру — но только у ПОСЛЕДНЕГО
// (самого дальнего) шага внешним кольцом служит WORLD_BOUNDS; у остальных
// внешнее кольцо — это граница СЛЕДУЮЩЕГО шага (см. TERRA_GRADIENT ниже).
const WORLD_BOUNDS = [[85,-180],[85,180],[-85,180],[-85,-180]];
// Четыре диагональных азимута — не совпадают с N/E/S/W (0/90/180/270), где
// уже сидят подписи самих колец ("~1 ч" и т.п.), поэтому не перекрываются.
const TERRA_INCOGNITA_BEARINGS = [45, 135, 225, 315];

// issue #24 (переоткрыт: "make area out of town really not visible" — один
// плоский тон поверх чётких тайлов читался просто как лёгкий цветной
// фильтр, а не как «карта растворяется в неизвестность»). Вместо одной
// заливки — несколько концентрических шагов НАРАСТАЮЩЕЙ непрозрачности,
// от границы дальнего кольца наружу: дешёвый, но настоящий градиент без
// canvas/SVG-градиентов и второго тайл-слоя (issue просил не переписывать
// архитектуру карты). mult — во сколько раз дальше исходного кольца
// проходит внешняя граница шага; opacity — целевая fillOpacity ПРИ ПОЛНОЙ
// интенсивности (см. zoom-фейд ниже — реальная непрозрачность = opacity*t).
// ВАЖНО: диапазон mult подобран под то, что реально попадает в вьюпорт на
// DEFAULT_ZOOM — граница дальнего кольца уже занимает большую часть экрана
// (см. скриншот в issue), так что "снаружи" остаётся только узкая кайма.
// Первая версия растягивала градиент до 3.2x — на практике вся сильная
// часть уходила за пределы экрана, а видимый край держался на 0.14
// (слабее старой плоской заливки в 0.4) — issue reopened именно из-за
// этого. Сжато до 1.0-1.8x, с высокой стартовой непрозрачностью.
const TERRA_GRADIENT = [
  { mult:1.00, opacity:.35 },
  { mult:1.15, opacity:.55 },
  { mult:1.30, opacity:.72 },
  { mult:1.50, opacity:.88 },
  { mult:1.80, opacity:.96 },
];
// Полная интенсивность на дефолтном зуме и дальше наружу (меньше число —
// дальше от камеры) — это и есть тот зум, на котором пользователь впервые
// видит карту и жалуется, что эффект не виден. Спадает к нулю только когда
// пользователь зумится куда ближе дефолта — тогда он явно разглядывает
// конкретное место, а не общий вид "известный мир / неизвестность".
const TERRA_ZOOM_FULL = DEFAULT_ZOOM;
const TERRA_ZOOM_NONE = DEFAULT_ZOOM + 3;

let terraRings = [];      // [{layer, baseOpacity}] — для пересчёта на зум
let terraLabelEls = [];   // DOM-узлы подписей — тоже проявляются по мере зума

function terraZoomFactor(){
  const z = map.getZoom();
  const t = (TERRA_ZOOM_NONE - z) / (TERRA_ZOOM_NONE - TERRA_ZOOM_FULL);
  return Math.max(0, Math.min(1, t));
}

// Вызывается и на каждый тик зума (map.on('zoom', ...) ниже), и один раз
// сразу после drawBase() — пересчитывает уже СОЗДАННЫЕ слои (setStyle /
// прямая запись в style), а не создаёт их заново: полигоны с их геометрией
// трогать на каждый кадр зума было бы намного дороже.
export function updateTerraIncognitaZoom(){
  const t = terraZoomFactor();
  terraRings.forEach(({layer, baseOpacity})=>{
    layer.setStyle({fillOpacity: baseOpacity * t});
  });
  terraLabelEls.forEach(el=>{ if(el) el.style.opacity = t; });
  document.documentElement.style.setProperty('--terra-t', t);
}

function drawBase(key){
  const base = BASE_POINTS[key], rings = RING_DATA[key]||[];
  radiusShapes.forEach(s=>map.removeLayer(s));
  radiusShapes = [];
  terraRings = [];
  terraLabelEls = [];
  if(baseMarker) map.removeLayer(baseMarker);
  rings.forEach(ring=>{
    const shape = L.polygon(ovalPoints(base,ring), {
      color:'#6B7280', weight:2, dashArray:'7,7', fill:false, opacity:.85, interactive:false
    }).addTo(map);
    shape.bindTooltip(ring.label,{permanent:true,direction:'top',className:'radius-label',offset:[0,-2]});
    shape.openTooltip(destPoint(base.lat,base.lng,ring.N,0));
    radiusShapes.push(shape);
  });

  // issue #24: за пределами самого дальнего кольца — «ещё не открытая»
  // территория, в духе старых атласов (issue приложил антикварную карту
  // Тасмана как референс) — чисто декоративно, реальную карту/фильтрацию
  // мест это не трогает, просто визуально отмечает «сюда за день не
  // доедешь». interactive:false у всех частей — маска не должна перехватывать
  // клики/панорамирование карты под собой.
  const outermost = rings[rings.length-1];
  if(outermost){
    TERRA_GRADIENT.forEach((step, i)=>{
      const innerRing = { N:outermost.N*step.mult, E:outermost.E*step.mult, S:outermost.S*step.mult, W:outermost.W*step.mult };
      const inner = ovalPoints(base, innerRing);
      const next = TERRA_GRADIENT[i+1];
      const outer = next
        ? ovalPoints(base, { N:outermost.N*next.mult, E:outermost.E*next.mult, S:outermost.S*next.mult, W:outermost.W*next.mult })
        : WORLD_BOUNDS;
      const layer = L.polygon([outer, inner], {
        className:'terra-incognita-mask', stroke:false, interactive:false, fillOpacity:0,
      }).addTo(map);
      radiusShapes.push(layer);
      terraRings.push({layer, baseOpacity: step.opacity});
    });

    TERRA_INCOGNITA_BEARINGS.forEach(brg=>{
      const km = ringKmAt(outermost, brg) * 1.15; // within the visible strong-tint band, not off-screen
      const [lat,lng] = destPoint(base.lat, base.lng, km, brg);
      const label = L.marker([lat,lng], {
        icon: L.divIcon({
          html:'<div class="terra-incognita-label">Terra Incognita</div>',
          className:'', iconSize:[0,0],
        }),
        interactive:false,
      }).addTo(map);
      label.on('add', ()=>{ terraLabelEls.push(label.getElement()); });
      radiusShapes.push(label);
    });
  }

  baseMarker = L.marker([base.lat,base.lng],{
    icon:L.divIcon({html:'<div class="base-pin"></div>',className:'',iconSize:[16,16],iconAnchor:[8,8]}),
    interactive:false, zIndexOffset:1000
  }).addTo(map);
  updateTerraIncognitaZoom();
}

// ---------- ЛЕНИВЫЙ ПОИСК СОСЕДЕЙ (OSRM /table, sources=0) ----------
// Полную матрицу мест не строим. При клике на «Что рядом» делаем ОДИН запрос
// от выбранной точки ко всем кандидатам в радиусе, результат кешируем навсегда.
const ROUTE_CACHE_KEY = 'trip-atlas-route-cache';
let routeCache = {};
const NEARBY_RADIUS_KM = 70;   // дальше комбинировать в один день смысла нет
const MAX_CANDIDATES  = 45;    // с запасом под лимит демо-сервера

function airKm(a, b){
  const dLat=(b.lat-a.lat)*111.32;
  const dLng=(b.lng-a.lng)*111.32*Math.cos(a.lat*Math.PI/180);
  return Math.hypot(dLat,dLng);
}
function fmtMin(m){
  const h=Math.floor(m/60), mm=Math.round(m%60);
  return h>0 ? `${h} ч ${mm} мин` : `${mm} мин`;
}

async function saveRouteCache(){
  try{ await store.set(ROUTE_CACHE_KEY, JSON.stringify(routeCache)); }
  catch(e){ /* хранилище недоступно — кеш живёт до перезагрузки */ }
}
export async function loadRouteCache(){
  try{
    const r = await store.get(ROUTE_CACHE_KEY);
    if(r && r.value) routeCache = JSON.parse(r.value) || {};
  }catch(e){ /* первого запуска ещё не было */ }
}

// visiblePlacesFn передаётся снаружи (filters.js), чтобы map.js не решал,
// что сейчас видимо по фильтрам — он только рисует.
async function nearbyTimes(origin, visiblePlacesFn){
  const candidates = visiblePlacesFn()
    .filter(p => p !== origin && airKm(origin, p) <= NEARBY_RADIUS_KM)
    .sort((a,b) => airKm(origin,a) - airKm(origin,b))
    .slice(0, MAX_CANDIDATES);
  if(!candidates.length) return [];

  const cached = routeCache[origin.id] || {};
  const missing = candidates.filter(p => cached[p.id] === undefined);

  if(missing.length){
    try{
      const coords = [origin, ...missing].map(p=>`${p.lng},${p.lat}`).join(';');
      const dest = missing.map((_,i)=>i+1).join(';');
      const url = `https://router.project-osrm.org/table/v1/driving/${coords}?sources=0&destinations=${dest}&annotations=duration`;
      const ctrl = new AbortController();
      const timer = setTimeout(()=>ctrl.abort(), 9000);
      const res = await fetch(url, {signal:ctrl.signal});
      clearTimeout(timer);
      if(!res.ok) throw new Error('bad');
      const data = await res.json();
      const row = data.durations && data.durations[0];
      if(!row) throw new Error('no durations');
      missing.forEach((p,i)=>{
        if(row[i]!=null) cached[p.id] = Math.round(row[i]/60);
      });
      routeCache[origin.id] = cached;
      saveRouteCache();
    }catch(err){
      // сеть недоступна — оценка по прямой с поправкой на извилистость
      missing.forEach(p=>{
        const km = airKm(origin,p);
        const kmh = km<40 ? 42 : km<80 ? 58 : 68;
        cached[p.id] = Math.round(km/kmh*60);
        cached['__est_'+p.id] = true;
      });
      routeCache[origin.id] = cached;
    }
  }

  return candidates
    .map(p=>({place:p, min:cached[p.id], estimated:!!cached['__est_'+p.id]}))
    .filter(x=>x.min!=null)
    .sort((a,b)=>a.min-b.min);
}

// ---------- ИНИЦИАЛИЗАЦИЯ ----------
// visiblePlacesFn — из filters.js (state живёт там). Вызывается один раз из app.js.
export function initMap(visiblePlacesFn){
  PLACES.forEach(buildMarker);

  drawBase('zagreb');
  document.getElementById('base-select').addEventListener('change', e=>drawBase(e.target.value));
  document.getElementById('mode-select').addEventListener('change', ()=>drawBase(document.getElementById('base-select').value));
  // issue #24: 'zoom' (not 'zoomend') fires continuously through an
  // animated zoom, not just once at the end — needed for a smooth,
  // continuously-interpolated fade rather than a sudden jump.
  map.on('zoom', updateTerraIncognitaZoom);

  map.on('click', e=>{
    if(!pickMode) return;
    setPickedCoords(e.latlng.lat, e.latlng.lng);
  });

  // Кнопка «Что рядом» — ленивый запрос соседей
  map.on('popupopen', e=>{
    const el = e.popup.getElement();
    if(!el) return;

    // Leaflet позиционирует попап абсолютно внутри .leaflet-map-pane, у
    // которого есть свой CSS-transform (панорамирование карты) — из-за
    // этого честный «position:fixed по центру экрана» из styles.css внутри
    // этого дерева не сработает (fixed считается не от вьюпорта, а от
    // ближайшего трансформированного предка). Поэтому переносим DOM самого
    // попапа в <body>, вне зоны трансформации — дальше его центрирует
    // styles.css (.popup-centered). Раньше это включалось только на мобильном
    // (≤860px) — на большом экране попап оставался «приклеен» к маркеру и
    // на карте у Загреба перекрывал поиск/фильтры сверху, а «Что рядом»
    // при раскрытии обрезался снизу. Теперь центрируем на любом экране.
    const popupContainer = el;
    if(popupContainer){
      document.body.appendChild(popupContainer);
      popupContainer.classList.add('popup-centered');
    }

    const nb = el.querySelector('.nearby-btn');
    if(nb && !nb.dataset.wired){
      nb.dataset.wired = '1';
      nb.addEventListener('click', async ()=>{
        const origin = PLACES.find(x=>x.id===nb.dataset.id);
        const out = el.querySelector('.nearby-out');
        if(!origin || !out) return;
        nb.disabled = true;
        nb.textContent = 'Считаю…';
        const list = await nearbyTimes(origin, visiblePlacesFn);
        nb.style.display = 'none';
        if(!list.length){
          out.innerHTML = '<p class="nearby-empty">Рядом ничего нет среди показанных точек — снимите фильтры.</p>';
          return;
        }
        const anyEst = list.some(x=>x.estimated);
        out.innerHTML =
          `<p class="nearby-title">Рядом · <span class="${anyEst?'src-est':'src-live'}">${anyEst?'оценка по прямой':'по дорогам, OSRM'}</span></p>` +
          list.slice(0,8).map(x=>
            `<button class="nearby-item" data-goto="${x.place.id}">
               <span class="ni-dot" style="background:${statusInfo(x.place.cat).color}"></span>
               <span class="ni-name">${x.place.name}</span>
               <span class="ni-min">${fmtMin(x.min)}</span>
             </button>`).join('');
        out.querySelectorAll('[data-goto]').forEach(b=>{
          b.addEventListener('click', ()=>{
            const t = PLACES.find(x=>x.id===b.dataset.goto);
            if(!t) return;
            map.closePopup();
            flyToPlace(t);
          });
        });
      });
    }

    // Клик по любому тегу фильтрует — issue #1: один общий механизм для
    // ЛЮБОГО типа тега (FILTER SYSTEM > ANY TAG TYPE > CLICK > FILTER BY
    // THIS TAG TYPE), а не отдельная копия на каждый тип. Каждый тег несёт
    // data-filter-type/-value (см. buildMarker выше); setFilter() в
    // filters.js сам знает, какую панель/state-ключ трогать для этого типа.
    el.querySelectorAll('.cat-tag-btn[data-filter-type]').forEach(tag=>{
      if(tag.dataset.wired) return;
      tag.dataset.wired = '1';
      const activate = ()=>{
        setFilter(tag.dataset.filterType, tag.dataset.filterValue);
        map.closePopup();
      };
      tag.addEventListener('click', activate);
      tag.addEventListener('keydown', e=>{
        if(e.key === 'Enter' || e.key === ' '){ e.preventDefault(); activate(); }
      });
    });
  });
}
