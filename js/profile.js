// ---------- ПРОИЗВОДНЫЙ ПРОФИЛЬ ПОЛЬЗОВАТЕЛЯ ----------
// User Profile из data_refactoring.md: НЕ отдельная хранимая сущность —
// всегда пересчитывается из журнала взаимодействий (interactions.js) и
// самих мест. Пользователь тут один (личный проект), поэтому профиль —
// просто объект, а не запись по userId в какой-то таблице.
//
// Веса ниже — "proto AI" уровень: простая прозрачная эвристика с ручными
// коэффициентами, а не обученная модель. Иерархия сигналов сознательно
// повторяет CLAUDE.md §5: реальный опыт > явная реакция > "на потом" >
// то, что просто показали (viewed вообще не участвует в аффинити — иначе
// часто показываемые категории выглядели бы "любимыми" без единой
// осознанной реакции пользователя).
import { getAllInteractions } from './interactions.js';

const WEIGHTS = {
  visited_loved: 2,
  wants_to_return: 1.5,
  liked: 1,
  visited_ok: 0.5,
  saved_for_later: 0.2,
  not_interested: -1,
};

function weightOf(interaction){
  if(interaction.type === 'visited'){
    return interaction.context?.rating === 'loved' ? WEIGHTS.visited_loved : WEIGHTS.visited_ok;
  }
  return WEIGHTS[interaction.type] || 0;
}

// Чистая функция: одни и те же places+interactions всегда дают один и тот
// же профиль — можно пересчитывать сколько угодно раз, ничего не кешируя
// (см. data_refactoring.md §9 про пересчитываемость производных данных).
export function computeProfile(places){
  const byId = new Map(places.map(p => [p.id, p]));
  const interactions = getAllInteractions(places);

  const characteristicAffinity = {};
  const seasonAffinity = {};
  const favoritePlaceIds = new Set();
  const counts = { visited:0, liked:0, notInterested:0, savedForLater:0, wantsToReturn:0 };

  interactions.forEach(e => {
    const place = byId.get(e.placeId);
    if(!place) return;
    const w = weightOf(e);

    if(e.type === 'visited') counts.visited++;
    if(e.type === 'liked'){ counts.liked++; favoritePlaceIds.add(place.id); }
    if(e.type === 'not_interested') counts.notInterested++;
    if(e.type === 'saved_for_later') counts.savedForLater++;
    if(e.type === 'wants_to_return'){ counts.wantsToReturn++; favoritePlaceIds.add(place.id); }

    if(w !== 0){
      (place.cats || []).forEach(c => {
        characteristicAffinity[c] = (characteristicAffinity[c] || 0) + w;
      });
      if(place.season && place.season !== 'all'){
        seasonAffinity[place.season] = (seasonAffinity[place.season] || 0) + w;
      }
    }
  });

  // "Избегаемые" характеристики — набравшие заметно отрицательный счёт.
  // Порог -1 подобран на глаз (proto), не рассчитан статистически.
  const avoidedCharacteristics = Object.entries(characteristicAffinity)
    .filter(([, score]) => score <= -1)
    .map(([c]) => c);

  return { characteristicAffinity, seasonAffinity, favoritePlaceIds: [...favoritePlaceIds], avoidedCharacteristics, counts };
}

// Топ-N характеристик по симпатии — для человекочитаемых причин
// рекомендации ("похоже на места, которые вам понравились: ...").
export function topCharacteristics(profile, n = 3){
  return Object.entries(profile.characteristicAffinity)
    .filter(([, score]) => score > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([c]) => c);
}
