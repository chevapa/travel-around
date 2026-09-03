import { PLACES, STATUSES, COUNTRIES, SEASONS, CATEGORIES, saveCustom } from './places.js';
import { map, rebuildMarkers } from './map.js';
import { refresh } from './filters.js';

let editingPlace = null;

// pickMode экспортируется как "живая" переменная — map.js читает её
// напрямую в обработчике клика по карте, без обратного импорта функций.
export let pickMode = false;

let modalBack, pickHint, fCats;

function fillSelect(id, obj, labelFn){
  const sel = document.getElementById(id);
  sel.innerHTML = '';
  Object.entries(obj).forEach(([k,v])=>{
    const o = document.createElement('option');
    o.value = k; o.textContent = labelFn(v);
    sel.appendChild(o);
  });
}

export function openModal(place){
  editingPlace = place || null;
  document.getElementById('modal-title').textContent = place ? 'Изменить место' : 'Новое место';
  document.getElementById('f-name').value  = place ? place.name : '';
  document.getElementById('f-q').value     = place && place.q ? place.q : '';
  document.getElementById('f-lat').value   = place ? place.lat : '';
  document.getElementById('f-lng').value   = place ? place.lng : '';
  document.getElementById('f-status').value= place ? place.cat : 'plan';
  document.getElementById('f-country').value=place ? place.country : 'hr';
  document.getElementById('f-season').value = place ? place.season : 'all';
  document.getElementById('f-drive').value = place ? place.drive : '';
  document.getElementById('f-note').value  = place ? place.note : '';
  document.getElementById('f-warn').value  = place && place.warn ? place.warn : '';
  document.getElementById('f-meta').value  = place && place.meta ? place.meta : '';
  document.getElementById('f-return').checked = place ? !!place.wantReturn : false;
  fCats.querySelectorAll('input').forEach(i=>{
    i.checked = place ? place.cats.includes(i.value) : false;
  });
  document.getElementById('del-wrap').style.display = (place && place.custom) ? 'block' : 'none';
  document.getElementById('form-err').classList.remove('show');
  modalBack.classList.add('open');
}

function closeModal(){
  modalBack.classList.remove('open');
  setPickMode(false);
  editingPlace = null;
}

function setPickMode(on){
  pickMode = on;
  document.getElementById('pick-btn').classList.toggle('active', on);
  pickHint.classList.toggle('show', on);
  modalBack.style.visibility = on ? 'hidden' : 'visible';
  map.getContainer().style.cursor = on ? 'crosshair' : '';
}

// Вызывается из map.js, когда пользователь кликнул по карте в pick-режиме.
export function setPickedCoords(lat, lng){
  document.getElementById('f-lat').value = lat.toFixed(4);
  document.getElementById('f-lng').value = lng.toFixed(4);
  setPickMode(false);
}

export function initModal(){
  modalBack = document.getElementById('modal-back');
  pickHint = document.getElementById('pick-hint');
  fCats = document.getElementById('f-cats');

  fillSelect('f-status', STATUSES, v=>v.label);
  fillSelect('f-country', COUNTRIES, v=>`${v.flag} ${v.label}`);
  fillSelect('f-season', SEASONS, v=>`${v.ico} ${v.label}`);

  Object.entries(CATEGORIES).forEach(([key,c])=>{
    const el = document.createElement('label');
    el.className='check';
    el.innerHTML = `<input type="checkbox" value="${key}">
      <span class="ico">•</span><span class="txt">${c.label}</span>`;
    fCats.appendChild(el);
  });

  document.getElementById('add-place').addEventListener('click', ()=>openModal());
  document.getElementById('pick-btn').addEventListener('click', ()=>setPickMode(!pickMode));
  document.getElementById('cancel-btn').addEventListener('click', closeModal);
  modalBack.addEventListener('click', e=>{ if(e.target===modalBack) closeModal(); });

  document.getElementById('save-btn').addEventListener('click', ()=>{
    const err = document.getElementById('form-err');
    const name = document.getElementById('f-name').value.trim();
    const lat = parseFloat(document.getElementById('f-lat').value);
    const lng = parseFloat(document.getElementById('f-lng').value);
    const cats = [...fCats.querySelectorAll('input:checked')].map(i=>i.value);

    if(!name){ err.textContent='Укажите название.'; err.classList.add('show'); return; }
    if(isNaN(lat)||isNaN(lng)){ err.textContent='Укажите координаты — вручную или кнопкой «На карте».'; err.classList.add('show'); return; }
    if(!cats.length){ err.textContent='Выберите хотя бы один тип места.'; err.classList.add('show'); return; }

    const data = {
      name, lat, lng, cats,
      cat: document.getElementById('f-status').value,
      country: document.getElementById('f-country').value,
      season: document.getElementById('f-season').value,
      drive: document.getElementById('f-drive').value.trim() || '—',
      note: document.getElementById('f-note').value.trim() || 'Без описания.',
      wantReturn: document.getElementById('f-return').checked,
      custom: true,
    };
    const warn = document.getElementById('f-warn').value.trim();
    const meta = document.getElementById('f-meta').value.trim();
    const qv = document.getElementById('f-q').value.trim();
    if(warn) data.warn = warn;
    if(meta) data.meta = meta;
    if(qv) data.q = qv;

    if(editingPlace){
      Object.assign(editingPlace, data);
    } else {
      PLACES.push(data);
    }
    rebuildMarkers();
    refresh();
    saveCustom();
    closeModal();
  });

  document.getElementById('del-btn').addEventListener('click', ()=>{
    if(!editingPlace) return;
    const i = PLACES.indexOf(editingPlace);
    if(i>-1) PLACES.splice(i,1);
    rebuildMarkers();
    refresh();
    saveCustom();
    closeModal();
  });
}
