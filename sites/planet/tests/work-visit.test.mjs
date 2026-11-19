import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorkVisit } from '../src/work-visit.js';

const emperor = { site: { id: 'emperor' } };
const cinema = { site: { id: 'cinema' } };
function setup(started = true) {
  const events = [], arrivals = [];
  const visit = createWorkVisit({
    walk(entry, arrived) { arrivals.push(arrived); events.push(['walk', entry]); return started; },
    dress(entry) { events.push(['dress', entry]); },
    reveal(entry) { events.push(['reveal', entry]); },
    hide() { events.push(['hide']); },
  });
  return { visit, events, arrivals };
}

test('work opens only after arrival and the outfit animation completes, once', () => {
  const { visit, events, arrivals } = setup();
  visit.begin(emperor);
  const avatar = { walking: true, outfit: 'daily', pop: 0 };
  visit.update(avatar);
  assert.deepEqual(events.map(e => e[0]), ['hide', 'walk']);
  arrivals[0]();
  assert.equal(visit.phase, 'dressing');
  avatar.walking = false; avatar.outfit = 'emperor'; avatar.pop = 0.5;
  visit.update(avatar);
  assert.equal(events.at(-1)[0], 'dress');
  avatar.pop = 0; visit.update(avatar); visit.update(avatar);
  assert.equal(visit.phase, 'open');
  assert.equal(events.filter(e => e[0] === 'reveal').length, 1);
});

test('switching work ignores the previous arrival and opens only the new work', () => {
  const { visit, events, arrivals } = setup();
  visit.begin(emperor); visit.begin(cinema);
  arrivals[0]();
  assert.equal(events.some(e => e[0] === 'dress'), false);
  arrivals[1]();
  visit.update({ walking: false, outfit: 'cinema', pop: 0 });
  assert.deepEqual(events.at(-1), ['reveal', cinema]);
});

test('clicking the same work again still invalidates the older journey', () => {
  const { visit, events, arrivals } = setup();
  visit.begin(emperor); visit.begin(emperor); arrivals[0]();
  assert.equal(visit.phase, 'walking');
  assert.equal(events.some(e => e[0] === 'dress'), false);
});

test('closing or choosing empty ground cancels waiting cards at either stage', () => {
  for (const arrived of [false, true]) {
    const { visit, events, arrivals } = setup();
    visit.begin(emperor);
    if (arrived) arrivals[0]();
    visit.cancel(); arrivals[0]();
    visit.update({ walking: false, outfit: 'emperor', pop: 0 });
    assert.equal(visit.phase, 'idle');
    assert.equal(events.some(e => e[0] === 'reveal'), false);
  }
});

test('failed paths do not leave a pending card or change an outfit', () => {
  const { visit, events } = setup(false);
  assert.equal(visit.begin(emperor), false);
  assert.equal(visit.phase, 'idle');
  assert.deepEqual(events.map(e => e[0]), ['hide', 'walk']);
});

test('an immediate arrival with reduced motion may open without an extra delay', () => {
  const events = [];
  const visit = createWorkVisit({
    walk(entry, arrived) { arrived(); return true; },
    dress() { events.push('dress'); }, hide() {}, reveal() { events.push('reveal'); },
  });
  visit.begin(emperor);
  assert.deepEqual(events, ['dress']);
  visit.update({ walking: false, outfit: 'emperor', pop: 0 });
  assert.deepEqual(events, ['dress', 'reveal']);
});
