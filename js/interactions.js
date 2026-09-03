// ---------- ЖУРНАЛ ВЗАИМОДЕЙСТВИЙ (Interaction log) ----------
// Реализация Interaction из data_refactoring.md: сырые события "пользователь
// сделал что-то с местом", а не готовые выводы. Раньше recommend.js хранил
// три отдельных Set (liked/skipped/later) — это сразу терялось как источник
// правды: нельзя было сказать, когда именно место лайкнули, при каких
// обстоятельствах, сколько раз его пропускали и т.п. Теперь это один
// append-only список событий; всё остальное (very "сигналы", профиль,
// рекомендации) считается ИЗ него, а не хранится параллельно.
//
// Пользователь один (это личный проект автора) — поэтому userId не нужен
// как отдельное измерение, в отличие от полной модели в data_refactoring.md.
// Если/когда появится больше одного пользователя, добавить userId сюда —
// одно поле, без изменения формы остальной схемы.
import { store } from './places.js';

export const INTERACTION_TYPES = [
  'viewed',            // рекомендация показана
  'liked',             // свайп "да" на экране рекомендаций
  'not_interested',    // свайп "мимо"
  'saved_for_later',   // свайп "на потом"
  'visited',           // реальный визит (в т.ч. восстановленный из старого cat)
  'wants_to_return',   // отдельный сигнал "хочу вернуться" (было поле wantReturn)
];

const STORAGE_KEY = 'trip-atlas-interactions';

let log = [];
let loaded = false;

function makeId(){
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`;
}

export async function loadInteractions(){
  if(loaded) return log;
  try{
    const r = await store.get(STORAGE_KEY);
    log = r && r.value ? JSON.parse(r.value) : [];
    if(!Array.isArray(log)) log = [];
  }catch(e){ log = []; }
  loaded = true;
  return log;
}

function persist(){
  store.set(STORAGE_KEY, JSON.stringify(log)).catch(()=>{
    /* хранилище недоступно — события останутся только на эту сессию */
  });
}

// context — необязательный объект по образцу data_refactoring.md
// (например { season, source, recommendationId }).
export function logInteraction(type, placeId, context){
  const entry = { id: makeId(), placeId, type, timestamp: Date.now(), context: context || undefined };
  log.push(entry);
  persist();
  return entry;
}

export function getInteractions(){
  return log;
}

export function getInteractionsForPlace(placeId){
  return log.filter(e => e.placeId === placeId);
}

// Было ли хоть раз событие данного типа для этого места — этого достаточно
// для текущих UI-сценариев (свайп необратим до кнопки "начать заново").
export function hasInteraction(placeId, type){
  return log.some(e => e.placeId === placeId && e.type === type);
}

export function clearInteractions(){
  log = [];
  persist();
}

// ---------- СИНТЕТИЧЕСКАЯ ИСТОРИЯ ИЗ СТАРЫХ ПОЛЕЙ (cat / wantReturn) ----------
// places/*.json на 117 мест хранят "loved"/"ok"/"plan" как поле места и
// используют это как есть уже пару лет — переписывать все файлы руками,
// чтобы формально соблюсти "Place не должен знать про visited/liked" из
// data_refactoring.md, не стоит того. Вместо миграции файлов — конвертируем
// на лету: cat/wantReturn читаются как раньше (карта, фильтры), а тут же
// из них ВЫВОДИТСЯ история посещений в виде Interaction-событий с
// timestamp:null ("дата неизвестна, это исторический импорт"). Эти события
// нигде не сохраняются — они пересчитываются заново при каждой загрузке,
// то есть по определению не могут разъехаться с source-of-truth (самим
// местом), в отличие от закешированных производных данных.
export function getSeedInteractions(places){
  const seeds = [];
  places.forEach(p => {
    if(p.cat === 'loved' || p.cat === 'ok'){
      seeds.push({ id:`seed-${p.id}-visited`, placeId:p.id, type:'visited',
        timestamp:null, context:{source:'legacy_cat', rating:p.cat} });
    }
    if(p.cat === 'loved'){
      seeds.push({ id:`seed-${p.id}-liked`, placeId:p.id, type:'liked',
        timestamp:null, context:{source:'legacy_cat'} });
    }
    if(p.wantReturn){
      seeds.push({ id:`seed-${p.id}-wants-return`, placeId:p.id, type:'wants_to_return',
        timestamp:null, context:{source:'legacy_wantReturn'} });
    }
  });
  return seeds;
}

// Полная история для чтения (профиль/сигналы/рекомендации): исторический
// "импорт" + реальный залогированный опыт. Порядок имеет значение только
// для отладки, не для корректности — потребители читают по типу/месту.
export function getAllInteractions(places){
  return [...getSeedInteractions(places), ...log];
}
