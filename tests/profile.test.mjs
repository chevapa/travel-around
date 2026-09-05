import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import assert from 'node:assert/strict';

const vocabData = JSON.parse(
  readFileSync(new URL('../data/vocab.json', import.meta.url))
);
globalThis.fetch = async () => ({ json: async () => vocabData });

const { computeProfile } = await import('../js/profile.js');

test('computeProfile derives affinity from seed interactions', () => {
  const places = [
    { id: 'a', cats: ['nature', 'view'], cat: 'loved', season: 'summer' },
    { id: 'b', cats: ['museum'], cat: 'ok', season: 'all' },
    { id: 'c', cats: ['nature'], cat: 'plan' },
  ];

  const profile = computeProfile(places);

  assert.deepEqual(profile.characteristicAffinity, { nature: 3, view: 3, museum: 0.5 });
  assert.deepEqual(profile.seasonAffinity, { summer: 3 });
  assert.deepEqual(profile.favoritePlaceIds, ['a']);
  assert.deepEqual(profile.avoidedCharacteristics, []);
  assert.deepEqual(profile.counts, { visited: 2, liked: 1, notInterested: 0, savedForLater: 0, wantsToReturn: 0 });
});
