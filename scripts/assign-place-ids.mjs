#!/usr/bin/env node
// Одноразовая миграция: переприсваивает каждому месту случайный `id`
// (8 символов, base36) вместо старого слага из названия — слаги для
// длинных официальных названий превращались в нечитаемых монстров вроде
// `varazdinske-toplice-aquae-iasae-arheoloski-park-hr` (см. историю
// scripts/assign-place-ids.mjs в git). Схема раньше была детерминированной
// (слаг из name/q + country), теперь id ничего не выражает — только
// стабилен после присвоения.
//
// Запуск: node scripts/assign-place-ids.mjs
// НЕ идемпотентен: перезаписывает id всем местам при каждом запуске, а не
// только тем, у кого его ещё нет. Это осознанно — на момент миграции
// реальной истории взаимодействий (лайки/визиты), привязанной к старым id,
// не было. Если она появится в будущем, перед повторным запуском
// проверьте, не сломает ли это сохранённые interaction-логи (id там
// используется как внешний ключ, см. js/interactions.js).

import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const DIR = new URL('../places/', import.meta.url).pathname;

const files = readdirSync(DIR).filter(f => f.endsWith('.json') && !f.startsWith('_'));

const usedIds = new Set();
let assigned = 0;

for(const file of files){
  const path = join(DIR, file);
  const data = JSON.parse(readFileSync(path, 'utf8'));
  const items = Array.isArray(data) ? data : [data];

  items.forEach(p => {
    let candidate;
    do {
      candidate = Math.random().toString(36).slice(2, 10);
    } while (usedIds.has(candidate));
    usedIds.add(candidate);
    p.id = candidate;
    assigned++;
  });

  // id — первое поле, для читаемости при просмотре/редактировании файла.
  const reordered = items.map(({id, ...rest}) => ({id, ...rest}));
  const out = Array.isArray(data) ? reordered : reordered[0];
  writeFileSync(path, JSON.stringify(out, null, 2) + '\n');
}

console.log(`Готово: присвоено ${assigned} новых id.`);
