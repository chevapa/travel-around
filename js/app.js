import { loadBasePlaces, loadCustom, loadFolderPlaces } from './places.js';
import { initMap, rebuildMarkers, loadRouteCache } from './map.js';
import { initFilters, visiblePlaces, refresh } from './filters.js';
import { initModal } from './modal.js';

// Порядок важен и повторяет прежний монолитный <script>:
// 1) карта и маркеры (пока PLACES пуст — рисовать нечего, но слушатели уже готовы),
// 2) UI фильтров (строит чек-боксы, один раз вызывает refresh() — счётчик "0 мест"),
// 3) модалка добавления/редактирования места,
// 4) асинхронные загрузки данных — они сами вызовут rebuildMarkers()+refresh(),
//    когда действительно что-то добавят (см. onLoaded ниже).
initMap(visiblePlaces);
initFilters();
initModal();

function onPlacesLoaded(){
  rebuildMarkers();
  refresh();
}

loadBasePlaces(onPlacesLoaded);
loadCustom(onPlacesLoaded);
loadRouteCache();
loadFolderPlaces(onPlacesLoaded);
