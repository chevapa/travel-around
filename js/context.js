// ---------- КОНТЕКСТ РЕКОМЕНДАЦИИ (объективная реальность) ----------
// Recommendation Context из data_refactoring.md §7 / CLAUDE.md §9: сигналы,
// которые не зависят от истории пользователя, а зависят от момента — сезон
// календаря, день недели/время суток, погода "здесь и сейчас".
//
// Погода — через Open-Meteo (open-meteo.com): бесплатный публичный API без
// ключа и с открытым CORS, поэтому его можно дёргать прямо из браузера на
// статическом сайте без бэкенда — единственный вариант, доступный этому
// проекту (см. data_refactoring.md про "proto-backend на GitHub Pages").
// Геолокация — best effort: если браузер её не даёт или API не ответил,
// тихо падаем на координаты Загреба (тот же base point, что и на карте) —
// контекст остаётся приблизительным, но ничего не ломает.
const WEATHER_URL = 'https://api.open-meteo.com/v1/forecast';
const FALLBACK_COORDS = { lat: 45.8150, lng: 15.9819 }; // Загреб

// Расстояние по дуге большого круга между двумя точками (км) — используется
// рекомендательным движком для сигнала "подходящее расстояние" (CLAUDE.md §9).
export function haversineDistance(lat1, lng1, lat2, lng2){
  const R = 6371; // радиус Земли, км
  const toRad = deg => deg * (Math.PI / 180);
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Грубые месячные окна под уже существующий словарь сезонов (data/vocab.json).
// 0-индексация месяцев, как у Date#getMonth().
const SEASON_MONTH_RANGES = {
  warm:   [3, 9], // апр–окт
  summer: [5, 7], // июн–авг
  stork:  [2, 7], // март–авг
};

export function currentContext(){
  const now = new Date();
  return {
    date: now,
    month: now.getMonth(),
    weekday: now.getDay(),   // 0=вс..6=сб
    isWeekend: now.getDay() === 0 || now.getDay() === 6,
    hour: now.getHours(),
  };
}

export function isSeasonSuitable(seasonKey, ctx = currentContext()){
  if(!seasonKey || seasonKey === 'all') return true;
  const range = SEASON_MONTH_RANGES[seasonKey];
  if(!range) return true; // незнакомое значение сезона — не блокируем карточку
  return ctx.month >= range[0] && ctx.month <= range[1];
}

// issue #47: приложение просило геолокацию сразу при загрузке экрана
// рекомендаций, ещё до того, как пользователь вообще что-то сделал —
// нежелательный браузерный permission-prompt "на входе". Пока в проекте нет
// экрана/действия, которое явно объясняет пользователю, зачем нужна геолокация
// (см. CLAUDE.md §9 — геолокация как один из сигналов контекста, не более),
// реальный запрос выключен флагом ниже, а функция всегда отдаёт fallback-
// координаты. Вся остальная логика (кэш, таймаут, промис-интерфейс) сохранена
// специально, чтобы возврат к реальной геолокации был одной строкой, когда
// появится подходящий момент/UI её запрашивать.
const GEOLOCATION_ENABLED = false;

export function getUserPosition(){
  return new Promise(resolve => {
    if(!GEOLOCATION_ENABLED || !navigator.geolocation){ resolve(FALLBACK_COORDS); return; }
    const timer = setTimeout(() => resolve(FALLBACK_COORDS), 4000);
    navigator.geolocation.getCurrentPosition(
      pos => { clearTimeout(timer); resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }); },
      () => { clearTimeout(timer); resolve(FALLBACK_COORDS); },
      { maximumAge: 15 * 60 * 1000, timeout: 4000 }
    );
  });
}

// Код погоды WMO -> грубая пригодность для прогулки/поездки на улице.
// Самая "proto" часть контекста: три корзины вместо честной модели.
const WEATHER_BUCKETS = {
  good: { codes: [0, 1], label: 'ясно', icon: '☀️' },
  ok:   { codes: [2, 3, 45, 48], label: 'облачно', icon: '⛅' },
  bad:  { codes: [51,53,55,56,57,61,63,65,66,67,71,73,75,77,80,81,82,85,86,95,96,99], label: 'осадки', icon: '🌧' },
};
function classifyWeatherCode(code){
  for(const [key, info] of Object.entries(WEATHER_BUCKETS)){
    if(info.codes.includes(code)) return { key, label: info.label, icon: info.icon };
  }
  return { key: 'unknown', label: 'погода неизвестна', icon: '🌡' };
}

// Один запрос на сессию — рекомендация "на сейчас" не нуждается в живом
// опросе погоды каждую секунду, а закрытая вкладка всё равно всё забудет.
let cached = null;
export async function getWeather(){
  if(cached) return cached;
  try{
    const { lat, lng } = await getUserPosition();
    const url = `${WEATHER_URL}?latitude=${lat}&longitude=${lng}&current_weather=true`;
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 5000);
    const res = await fetch(url, { signal: ctrl.signal });
    clearTimeout(timer);
    if(!res.ok) throw new Error('bad response');
    const data = await res.json();
    const cw = data.current_weather;
    if(!cw) throw new Error('no current_weather');
    cached = { ...classifyWeatherCode(cw.weathercode), temperature: cw.temperature, source: 'open-meteo' };
  }catch(e){
    // нет сети / нет геолокации / API недоступен — рекомендация просто не
    // получит бонус/штраф за погоду, а не сломается.
    cached = { key: 'unknown', label: 'погода недоступна', icon: '🌡', temperature: null, source: 'unavailable' };
  }
  return cached;
}
