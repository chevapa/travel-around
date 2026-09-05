import { test } from 'node:test';
import assert from 'node:assert/strict';
import { scorePlace } from '../js/recommendationEngine.js';

test('scoreCaseA_likedCharacteristicBonus', () => {
  const result = scorePlace(
    { cats: ['museum'], cat: 'ok', season: 'all', warn: '', lat: 0, lng: 0 },
    { characteristicAffinity: { museum: 2 }, avoidedCharacteristics: [] },
    {}, null
  );
  assert.equal(result.score, 2);
  assert.equal(result.reasons.length, 1);
  assert.equal(result.reasons[0].icon, '❤️');
  assert.equal(result.reasons[0].weight, 2);
});

test('scoreCaseB_wantReturnBonus', () => {
  const result = scorePlace(
    { cats: [], cat: 'ok', season: 'all', warn: '', wantReturn: true, lat: 0, lng: 0 },
    { characteristicAffinity: {}, avoidedCharacteristics: [] },
    {}, null
  );
  assert.equal(result.score, 3);
  assert.equal(result.reasons.length, 1);
  assert.equal(result.reasons[0].icon, '★');
  assert.equal(result.reasons[0].weight, 3);
});

test('scoreCaseC_noveltyBonus', () => {
  const result = scorePlace(
    { cats: [], cat: 'plan', season: 'all', warn: '', lat: 0, lng: 0 },
    { characteristicAffinity: {}, avoidedCharacteristics: [] },
    {}, null
  );
  assert.equal(result.score, 1);
  assert.equal(result.reasons.length, 1);
  assert.equal(result.reasons[0].icon, '📍');
  assert.equal(result.reasons[0].weight, 1);
});

test('scoreCaseD_seasonMismatchPenalty', () => {
  const result = scorePlace(
    { cats: [], cat: 'ok', season: 'summer', warn: '', lat: 0, lng: 0 },
    { characteristicAffinity: {}, avoidedCharacteristics: [] },
    { month: 0 }, null
  );
  assert.equal(result.score, -2);
  assert.equal(result.reasons.length, 1);
  assert.equal(result.reasons[0].icon, '📅');
  assert.equal(result.reasons[0].weight, -2);
});

test('scoreCaseE_weatherBonusOutdoorOnly', () => {
  const weather = { key: 'good', icon: '☀️' };
  const profileEmpty = { characteristicAffinity: {}, avoidedCharacteristics: [] };

  const indoor = scorePlace(
    { cats: ['museum'], cat: 'ok', season: 'all', warn: '', lat: 0, lng: 0 },
    profileEmpty, {}, weather
  );

  const outdoor = scorePlace(
    { cats: ['nature'], cat: 'ok', season: 'all', warn: '', lat: 0, lng: 0 },
    profileEmpty, {}, weather
  );

  assert.equal(indoor.score, 0);
  assert.equal(indoor.reasons.length, 0);
  assert.equal(outdoor.score, 1.5);
  assert.equal(outdoor.reasons.length, 1);
  assert.equal(outdoor.reasons[0].icon, '☀️');
  assert.equal(outdoor.reasons[0].weight, 1.5);
});
