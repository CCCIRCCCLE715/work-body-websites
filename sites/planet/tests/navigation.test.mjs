import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { SITES, SEA_LINE, LAKES } from '../src/planet-surface.js';
import { createNavigator, walkable, clearArc } from '../src/navigation.js';
const nav = createNavigator();
function check(path, from, to) {
  assert.ok(path?.length >= 2, 'destination must be reachable');
  assert.ok(path[0].distanceTo(from) < 1e-7, 'route starts at current position');
  assert.ok(path.at(-1).distanceTo(to) < 1e-7, 'route ends at clicked position');
  for (let i = 1; i < path.length; i++) assert.ok(clearArc(path[i - 1], path[i]), 'each full segment stays on unobstructed land');
}
test('walk between every pair of landmarks without crossing water or buildings', () => {
  for (const a of SITES) for (const b of SITES) check(nav.route(a.stand, b.stand), a.stand, b.stand);
});
test('arbitrary empty ground supports exact arrival and retargeting from mid-route', () => {
  let from = SITES[0].stand;
  let count = 0;
  for (let i = 0; i < 120; i++) {
    const y = 1 - 2 * (i + 0.5) / 120, a = i * Math.PI * (3 - Math.sqrt(5));
    const to = new THREE.Vector3(Math.sqrt(1-y*y)*Math.cos(a), y, Math.sqrt(1-y*y)*Math.sin(a));
    if (!walkable(to)) continue;
    const path = nav.route(from, to); check(path, from, to);
    from = path[0].clone().lerp(path[1], 0.37).normalize(); count++;
  }
  assert.ok(count > 50);
});
test('water and landmark footprints cannot be selected as empty ground', () => {
  for (const d of [...SEA_LINE, ...LAKES.map(l => l.c), ...SITES.map(s => s.n)]) {
    assert.equal(walkable(d), false);
    assert.equal(nav.route(SITES[0].stand, d), null);
  }
});
