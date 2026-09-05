import { PLACES } from './places.js';
import { flyToPlace } from './map.js';
import { setFilter } from './filters.js';
import { switchScreen } from './recommend.js';

// issue #49: "open me a place / a set of filters by url" — a plain query-
// string reader, no build step or client-side history router needed for
// what's actually asked (open once on load, react to a link someone was
// sent), consistent with the rest of this app staying a static site with
// no framework.
//
// Supported shapes, deliberately query-string based rather than path
// segments (`/place/{id}`) — GitHub Pages serves this app from a static
// file (index.html) with no server-side rewrite, so a path segment like
// `/travel-around/place/abc123` 404s before any of this JS ever runs.
// `?place=abc123` and `?filter=cat:coast` work with zero extra
// infrastructure since they still resolve to the same index.html.
//   ?place=<id>              → fly to and open that place's popup
//   ?filter=<type>:<value>   → apply one tag filter, same as clicking a tag
//                              (type is one of cat/status/country/season —
//                              see FILTER_TYPES in filters.js)
//
// 404.html (repo root) redirects the literal path forms from the issue
// (`/place/<id>`, `/filter/<type>/<value>`) into these query params, so
// both the URL shape asked for in the issue and a zero-infra fallback work.
//
// Called from app.js's onPlacesLoaded — after PLACES/filters/map/recommend
// are all already initialized, so a place lookup or setFilter() here always
// has real data to act on, not an empty PLACES array from running too early.
export function applyUrlRoute(){
  const params = new URLSearchParams(window.location.search);
  const filter = params.get('filter');
  const placeId = params.get('place');

  if(filter){
    const sep = filter.indexOf(':');
    if(sep > 0) setFilter(filter.slice(0, sep), filter.slice(sep + 1));
  }

  if(placeId){
    const place = PLACES.find(p => p.id === placeId);
    if(place){ // unknown/typo'd id in a shared link — fail quiet, not a crash
      switchScreen('map');
      // Called synchronously from onPlacesLoaded, right after the map's
      // very first setView() and rebuildMarkers() populated the cluster
      // group — Leaflet.markercluster's internal cluster tree isn't done
      // settling from the map's own initial zoom/load transition yet at
      // that exact point, and calling zoomToShowLayer (inside flyToPlace,
      // see map.js) before it has produces a real thrown error ("Cannot
      // use 'in' operator to search for '_leaflet_id' in undefined") — a
      // known Leaflet.markercluster race, caught only by testing this
      // against a real URL, not just checking that no exception surfaced
      // in the happy path. A short delay avoids racing that initial
      // transition; the existing "Что рядом" callers never hit this
      // because a user's click always happens well after load has settled.
      setTimeout(() => flyToPlace(place), 300);
    }
  }
}
