import { loadBasePlaces, loadCustom, loadFolderPlaces } from './places.js';
import { initMap, rebuildMarkers, loadRouteCache } from './map.js';
import { initFilters, visiblePlaces, refresh } from './filters.js';
import { initModal } from './modal.js';
import { initRecommend, refreshRecommend } from './recommend.js';
import { applyUrlRoute } from './router.js';

// Порядок важен и повторяет прежний монолитный <script>:
// 1) карта и маркеры (пока PLACES пуст — рисовать нечего, но слушатели уже готовы),
// 2) UI фильтров (строит чек-боксы, один раз вызывает refresh() — счётчик "0 мест"),
// 3) модалка добавления/редактирования места,
// 4) асинхронные загрузки данных — они сами вызовут rebuildMarkers()+refresh(),
//    когда действительно что-то добавят (см. onLoaded ниже).
initMap(visiblePlaces);
initFilters();
initModal();
initRecommend();

// issue #49: three independent loaders below (base/custom/folder places)
// each call onPlacesLoaded when they finish — applyUrlRoute() only makes
// sense once, and only after there's at least a first render to fly/filter
// against, so it's guarded here rather than folded into each loader.
let urlRouteApplied = false;
function onPlacesLoaded(){
  rebuildMarkers();
  refresh();
  refreshRecommend();
  if(!urlRouteApplied){
    urlRouteApplied = true;
    applyUrlRoute();
  }
}

loadBasePlaces(onPlacesLoaded);
loadCustom(onPlacesLoaded);
loadRouteCache();
loadFolderPlaces(onPlacesLoaded);
