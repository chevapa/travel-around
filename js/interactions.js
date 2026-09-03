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
