import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import assert from 'node:assert/strict';

const vocabData = JSON.parse(
  readFileSync(new URL('../data/vocab.json', import.meta.url))
);
globalThis.fetch = async () => ({ json: async () => vocabData });

const { ensurePlaceId } = await import('../js/places.js');

test('Existing id is preserved unchanged', () => {
  const input = { id: 'existing123', name: 'Test' };
  const result = ensurePlaceId(input);
  assert.strictEqual(result.id, 'existing123');
  assert.strictEqual(result.name, 'Test');
});

test('Missing id gets a well-formed random one', () => {
  const input = { name: 'No Id Place' };
  const result = ensurePlaceId(input);
  assert.ok(result.hasOwnProperty('id'));
  assert.strictEqual(typeof result.id, 'string');
  assert.match(result.id, /^[a-z0-9]{1,8}$/);
});

test('Repeated calls without an id never collide', () => {
  const ids = [];
  for (let i = 0; i < 50; i++) {
    const input = { name: `Place ${i}` };
    const result = ensurePlaceId(input);
    ids.push(result.id);
  }
  assert.strictEqual(new Set(ids).size, ids.length);
});
