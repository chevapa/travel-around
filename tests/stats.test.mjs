import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeExplorationStats } from '../js/statsEngine.js';

const places = [
  { cat: 'loved', country: 'hr', wantReturn: true },
  { cat: 'loved', country: 'hr', wantReturn: false },
  { cat: 'ok', country: 'hr', wantReturn: false },
  { cat: 'plan', country: 'hr', wantReturn: false },
  { cat: 'plan', country: 'si', wantReturn: false },
];

test('computeExplorationStats counts explored (loved+ok) vs total', () => {
  const s = computeExplorationStats(places);
  assert.equal(s.total, 5);
  assert.equal(s.explored, 3);
  assert.equal(s.loved, 2);
  assert.equal(s.ok, 1);
  assert.equal(s.plan, 2);
  assert.equal(s.wantReturn, 1);
  assert.equal(s.percent, 60); // 3/5
});

test('computeExplorationStats country breakdown only includes countries with explored places', () => {
  const s = computeExplorationStats(places);
  const codes = s.countryBreakdown.map(c => c.code);
  assert.deepEqual(codes, ['hr']); // 'si' has zero explored places, excluded
  const hr = s.countryBreakdown.find(c => c.code === 'hr');
  assert.equal(hr.total, 4);
  assert.equal(hr.explored, 3);
  assert.equal(hr.percent, 75);
});

test('computeExplorationStats handles an empty places array without dividing by zero', () => {
  const s = computeExplorationStats([]);
  assert.equal(s.total, 0);
  assert.equal(s.percent, 0);
  assert.deepEqual(s.countryBreakdown, []);
});
