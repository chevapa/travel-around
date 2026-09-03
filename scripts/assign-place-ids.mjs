#!/usr/bin/env node
// Одноразовая (но переиспользуемая) миграция: проставляет каждому месту
// стабильный `id`, если его ещё нет. Нужно как база под историю
// взаимодействий (Interaction/Visit) — раньше места идентифицировались
// строкой `name`, что ломалось при любом переименовании (см. data_refactoring.md).
//
// Запуск: node scripts/assign-place-ids.mjs
// Идемпотентен: у мест, где id уже есть, он не трогается; коллизии новых
// слагов с уже существующими id тоже учитываются.

import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const DIR = new URL('../places/', import.meta.url).pathname;

// Простая транслитерация кириллицы -> латиницы (для мест без поля `q`,
// которое обычно и так уже на местном латинском языке).
const CYR_TO_LAT = {
  а:'a', б:'b', в:'v', г:'g', д:'d', е:'e', ё:'e', ж:'zh', з:'z', и:'i',
  й:'y', к:'k', л:'l', м:'m', н:'n', о:'o', п:'p', р:'r', с:'s', т:'t',
  у:'u', ф:'f', х:'h', ц:'ts', ч:'ch', ш:'sh', щ:'sch', ъ:'', ы:'y', ь:'',
  э:'e', ю:'yu', я:'ya',
};

function transliterate(str){
  return str.toLowerCase().split('').map(ch => CYR_TO_LAT[ch] ?? ch).join('');
}

function slugify(str){
  return transliterate(str)
    .normalize('NFKD').replace(/[̀-ͯ]/g, '') // диакритика типа č/ž/š
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

const files = readdirSync(DIR).filter(f => f.endsWith('.json') && !f.startsWith('_'));

const usedIds = new Set();
let assigned = 0, kept = 0;

for(const file of files){
  const path = join(DIR, file);
  const raw = readFileSync(path, 'utf8');
  const data = JSON.parse(raw);
  const items = Array.isArray(data) ? data : [data];

  items.forEach(p => usedIds.has(p.id) ? null : (p.id && usedIds.add(p.id)));
}

for(const file of files){
  const path = join(DIR, file);
  const data = JSON.parse(readFileSync(path, 'utf8'));
  const items = Array.isArray(data) ? data : [data];
  let changed = false;

  items.forEach(p => {
    if(p.id){ kept++; return; }
    const base = slugify(p.q || p.name) || 'place';
    let candidate = `${base}-${p.country || 'xx'}`;
    let n = 2;
    while(usedIds.has(candidate)){ candidate = `${base}-${p.country || 'xx'}-${n++}`; }
    usedIds.add(candidate);
    p.id = candidate;
    changed = true;
    assigned++;
  });

  if(changed){
    // id — первое поле, для читаемости при просмотре/редактировании файла.
    const reordered = items.map(({id, ...rest}) => ({id, ...rest}));
    const out = Array.isArray(data) ? reordered : reordered[0];
    writeFileSync(path, JSON.stringify(out, null, 2) + '\n');
  }
}

console.log(`Готово: присвоено ${assigned} новых id, у ${kept} уже был свой.`);
