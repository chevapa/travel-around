// ---------- ФОТО МЕСТА (issue #35) ----------
// "The card's image area is a generic colored icon, not a photo. For
// someone who arrived because a photo/video looked good on TikTok."
//
// Where to actually get photos, evaluated (this is the "think on where to
// get photos" part of #35):
//   - A paid stock/photo API (Unsplash, Pexels) — needs an API key this
//     personal static-site project has nowhere safe to hold client-side,
//     and place-name search on generic stock photo sites is unreliable for
//     specific small towns/castles (mostly returns generic scenery, not
//     the actual place).
//   - Google Places Photos — needs a paid API key + billing account, the
//     same "no backend to hide a key" problem, worse (Google's terms are
//     stricter about client-side key exposure than most).
//   - Wikipedia's own page-image API — free, no key, CORS-enabled via
//     origin=*, and place-name search on Wikipedia actually works well
//     for the kind of places in this dataset (towns, castles, named
//     natural landmarks almost always have a Wikipedia article with a
//     real photo). This is what's implemented below.
// Real photos aren't available for every place this way (a random
// restaurant or an obscure viewpoint has no Wikipedia article) — this is
// deliberately a progressive enhancement, not a guarantee: falls back to
// the existing generic category icon when no photo is found, same as
// drive-time/weather elsewhere in this app fail soft rather than block
// rendering.
const WIKI_ENDPOINTS = ['ru.wikipedia.org', 'en.wikipedia.org'];
const THUMB_SIZE = 480;
const cache = new Map(); // placeId -> url | null (null = looked up, no photo found)

async function queryWiki(host, title){
  const url = `https://${host}/w/api.php?action=query&titles=${encodeURIComponent(title)}` +
    `&prop=pageimages&format=json&pithumbsize=${THUMB_SIZE}&origin=*`;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 5000);
  try{
    const res = await fetch(url, { signal: ctrl.signal });
    if(!res.ok) return null;
    const data = await res.json();
    const pages = data.query && data.query.pages;
    if(!pages) return null;
    const page = Object.values(pages)[0];
    return (page && page.thumbnail && page.thumbnail.source) || null;
  }catch(e){
    return null; // сеть недоступна / таймаут / нет статьи — молча пропускаем
  }finally{
    clearTimeout(timer);
  }
}

// Пробует местное название (q) сначала — оно ближе к реальному заголовку
// статьи в Wikipedia (напр. "Ozalj" вместо "Озаль"), затем русское имя,
// на двух языковых разделах — первое реальное фото побеждает.
export async function fetchPlacePhoto(place){
  if(cache.has(place.id)) return cache.get(place.id);
  const titles = [place.q, place.name].filter(Boolean);
  for(const host of WIKI_ENDPOINTS){
    for(const title of titles){
      const url = await queryWiki(host, title);
      if(url){ cache.set(place.id, url); return url; }
    }
  }
  cache.set(place.id, null);
  return null;
}
