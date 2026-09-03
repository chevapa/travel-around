// ---------- РЕКОМЕНДАЦИЯ v1 (proto AI level) ----------
// Recommendation из data_refactoring.md §7: место + score + reasons +
// context. Формула — буквально та, что описана там в §10 (MVP scope):
//
//   характеристики места + взаимодействия + история визитов + контекст
//   = score рекомендации
//
// Никакого обучения — прозрачная сумма понятных бонусов/штрафов, чтобы
// каждую рекомендацию можно было объяснить (CLAUDE.md §9: не просто
// «Жумберак», а «Жумберак — потому что…»). profile приходит из profile.js
// (взаимодействия), ctx/weather — из context.js (объективная реальность).
import { isSeasonSuitable } from './context.js';

const OUTDOOR_CATS = ['nature', 'beach', 'view', 'water', 'cave', 'bike'];

export function scorePlace(place, profile, ctx, weather){
  let score = 0;
  const reasons = [];

  // 1) Совпадение с характеристиками, которые пользователь уже любит.
  const liked = (place.cats || []).filter(c => (profile.characteristicAffinity[c] || 0) > 0);
  if(liked.length){
    const bonus = liked.reduce((sum, c) => sum + profile.characteristicAffinity[c], 0);
    score += bonus;
    reasons.push({ icon:'❤️', title:'Похоже на места, которые вам понравились', sub: liked.slice(0,3).join(', '), weight: bonus });
  }

  // 2) Характеристики, которые раньше не заходили — штраф, не полный бан:
  //    proto-модель не настолько уверена в себе, чтобы навсегда вычёркивать.
  const avoided = (place.cats || []).filter(c => profile.avoidedCharacteristics.includes(c));
  if(avoided.length){
    score -= avoided.length;
    reasons.push({ icon:'👎', title:'Раньше похожее не заходило', sub: avoided.join(', '), weight: -avoided.length });
  }

  // 3) Явный сильный сигнал приоритета.
  if(place.wantReturn){
    score += 3;
    reasons.push({ icon:'★', title:'Вы отметили — «хотим вернуться»', sub:'осталось только доехать', weight:3 });
  }

  // 4) Новизна — куда ещё не добрались.
  if(place.cat === 'plan'){
    score += 1;
    reasons.push({ icon:'📍', title:'Вы здесь ещё не были', sub:'новое место на карте', weight:1 });
  }

  // 5) Сезон — сейчас подходящее время года для этого места или нет.
  const seasonOk = isSeasonSuitable(place.season, ctx);
  if(place.season && place.season !== 'all'){
    if(seasonOk){ score += 1; reasons.push({ icon:'🍂', title:'Подходящий сезон', sub:'сейчас как раз то время', weight:1 }); }
    else { score -= 2; reasons.push({ icon:'📅', title:'Сейчас не сезон', sub:'обычно едут в другое время года', weight:-2 }); }
  }

  // 6) Погода — влияет только на места "на открытом воздухе".
  const isOutdoor = (place.cats || []).some(c => OUTDOOR_CATS.includes(c));
  if(weather && weather.key !== 'unknown' && isOutdoor){
    if(weather.key === 'good'){ score += 1.5; reasons.push({ icon: weather.icon, title:'Хорошая погода', sub:'отличный день для улицы', weight:1.5 }); }
    if(weather.key === 'bad'){ score -= 1.5; reasons.push({ icon: weather.icon, title:'Ожидаются осадки', sub:'может быть неудачный день для природы', weight:-1.5 }); }
  }

  // Важная информация, не влияющая на score.
  if(place.warn){
    reasons.push({ icon:'⚠️', title:'Проверить перед выездом', sub: place.warn, weight:0 });
  }

  reasons.sort((a, b) => Math.abs(b.weight) - Math.abs(a.weight));
  return { score, reasons: reasons.slice(0, 4) };
}

export function rankPlaces(places, profile, ctx, weather){
  return places
    .map(place => ({ place, ...scorePlace(place, profile, ctx, weather) }))
    .sort((a, b) => b.score - a.score);
}
