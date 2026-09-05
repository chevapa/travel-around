#!/usr/bin/env node
// Проверяет, что все "энум"-поля мест (cat/cats/country/season) в
// places/*.json используют только значения, реально существующие в
// data/vocab.json. Только читает — ничего не перезаписывает.
//
// Запуск: node scripts/validate-vocab.mjs
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const vocab = JSON.parse(readFileSync(new URL('../data/vocab.json', import.meta.url), 'utf8'));
const validStatuses = Object.keys(vocab.statuses);
const validCategories = Object.keys(vocab.categories);
const validCountries = Object.keys(vocab.countries);
const validSeasons = Object.keys(vocab.seasons);

const DIR = new URL('../places/', import.meta.url).pathname;
const files = readdirSync(DIR).filter(f => f.endsWith('.json') && !f.startsWith('_'));

let errorCount = 0;

for(const file of files){
  const path = join(DIR, file);
  const data = JSON.parse(readFileSync(path, 'utf8'));
  const items = Array.isArray(data) ? data : [data];

  items.forEach(place => {
    const label = place.id || place.name;

    // Каждое поле проверяется независимо — отсутствие одного не должно
    // пропускать проверку остальных.
    if(place.cat && !validStatuses.includes(place.cat)){
      console.log(`${file}: ${label} — invalid cat "${place.cat}"`);
      errorCount++;
    }

    if(Array.isArray(place.cats)){
      place.cats.forEach(c => {
        if(!validCategories.includes(c)){
          console.log(`${file}: ${label} — invalid cats "${c}"`);
          errorCount++;
        }
      });
    }

    if(place.country && !validCountries.includes(place.country)){
      console.log(`${file}: ${label} — invalid country "${place.country}"`);
      errorCount++;
    }

    if(place.season && !validSeasons.includes(place.season)){
      console.log(`${file}: ${label} — invalid season "${place.season}"`);
      errorCount++;
    }
  });
}

if(errorCount > 0){
  console.log(`Found ${errorCount} problem(s).`);
  process.exit(1);
} else {
  console.log('All places valid.');
}
