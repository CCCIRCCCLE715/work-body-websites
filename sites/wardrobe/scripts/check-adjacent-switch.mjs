import assert from 'node:assert/strict';
import fs from 'node:fs';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const { GARMENT_TURN, garmentEnvelope, initializeRail, resolveRailActive, arrangeRail } = await import(
  'data:text/javascript;base64,' + Buffer.from(fs.readFileSync(root + 'dist/cloth-rail.js')).toString('base64')
);
const meta = JSON.parse(fs.readFileSync(root + 'dist/assets/cloth-baked/collection.json'));
const buf = zlib.gunzipSync(fs.readFileSync(root + 'dist/assets/cloth-baked/collection.bin.gz'));
const config = fs.readFileSync(root + 'dist/config.js', 'utf8');
const spacing = Number(config.match(/garmentSpacing:\s*([\d.]+)/)[1]);
const half = Number(config.match(/rackWidth:\s*([\d.]+)/)[1]) / 2 - .025;
const ids = 'emperor scholar survivor director planner drama_lead designer phone_steward programmer curator wizard racer'.split(' ');
const rest = 68 * Math.PI / 180;
const shapes = ids.map((id, index) => {
  const m = meta[id], layout = m.layout.rest;
  return { id, index, x: (index - 5.5) * spacing, envelope: garmentEnvelope(new Float32Array(buf.buffer, buf.byteOffset + m.offset + layout.offset, layout.length), m.profile) };
});

// Selecting a displaced neighbor must still complete its turn without sliding
// that selected hanger. These adjacent pairs previously stopped permanently.
let maximumYawError = 0, maximumHomeError = 0, minimumClearance = Infinity, switches = 0;
for (const fps of [30, 60, 120]) {
  const dt = 1 / fps, k = GARMENT_TURN.stiffness / GARMENT_TURN.durationScale ** 2, c = GARMENT_TURN.damping / GARMENT_TURN.durationScale;
  const items = shapes.map(g => ({ ...g, railYaw: rest, rotation: { value: rest, velocity: 0 }, pivot: { position: { x: g.x } } }));
  initializeRail(items, half);
  function step(index, target = 0) {
    const active = resolveRailActive(items, index < 0 ? null : items[index], half);
    for (const g of items) {
      const goal = g === active ? target : rest;
      g.rotation.velocity += (k * (goal - g.rotation.value) - c * g.rotation.velocity) * dt;
      g.rotation.value += g.rotation.velocity * dt;
    }
    arrangeRail(items, active, half, dt);
    assert.ok(items.every((g, i) => Number.isFinite(g.pivot.position.x) && (!i || g.pivot.position.x > items[i - 1].pivot.position.x)), 'Slots must remain finite and ordered');
    for (let i = 0; i < items.length; i++) for (let j = i + 1; j < items.length; j++) {
      const a = items[i], b = items[j];
      const u = [Math.cos(a.railYaw), -Math.sin(a.railYaw)], v = [-u[1], u[0]];
      const s = [Math.cos(b.railYaw), -Math.sin(b.railYaw)], t = [-s[1], s[0]];
      const dot = (a, b) => Math.abs(a[0] * b[0] + a[1] * b[1]);
      const gap = Math.max(...[u, v, s, t].map(n => Math.abs((b.pivot.position.x - a.pivot.position.x) * n[0]) - a.envelope.width * dot(u, n) - a.envelope.depth * dot(v, n) - b.envelope.width * dot(s, n) - b.envelope.depth * dot(t, n)));
      minimumClearance = Math.min(minimumClearance, gap);
      assert.ok(gap > .0079, 'Switching must preserve clearance between every pair');
    }
  }
  for (const [first, second] of [[2, 1], [3, 1], [9, 10], [1, 3], [10, 9]]) {
    for (let f = 0; f < fps * 2; f++) step(-1);
    for (let f = 0; f < fps * 1.5; f++) step(first);
    let anchor;
    for (let f = 0; f < fps * 3; f++) {
      step(second);
      if (items.railAnchor?.garment === items[second]) {
        anchor ??= items[second].pivot.position.x;
        assert.ok(Math.abs(items[second].pivot.position.x - anchor) < 1e-8, 'Selected hanger must stay anchored throughout its turn');
      }
    }
    const error = Math.abs(items[second].railYaw);
    maximumYawError = Math.max(maximumYawError, error);
    assert.ok(error < .005, `${fps} FPS: ${ids[first]} → ${ids[second]} stuck at ${error * 180 / Math.PI}°`);
  }
  // Reproduce rapid interrupted gestures as well as sustained new hovers.
  // Seed 818 previously trapped the astronaut on the right after 110 switches.
  let seed = 818;
  const random = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
  for (let cycle = 0; cycle < 180; cycle++) {
    const index = Math.floor(random() * 12), target = (random() * 68 - 34) * Math.PI / 180;
    const frames = Math.floor(random() * 35) + 4;
    for (let f = 0; f < frames; f++) step(index, target);
    if (cycle % 10 === 9) {
      for (let f = 0; f < fps * 3; f++) step(index, target);
      const error = Math.abs(items[index].railYaw - target);
      maximumYawError = Math.max(maximumYawError, error);
      assert.ok(error < .005, `${fps} FPS: interrupted switch ${cycle} cannot finish ${ids[index]}`);
    }
    switches++;
  }
  for (let f = 0; f < fps * 4; f++) step(-1);
  maximumHomeError = Math.max(maximumHomeError, ...items.map(g => Math.abs(g.pivot.position.x - g.homeX)));
  assert.ok(maximumHomeError < .00001, 'Every hanger must return to its original slot');
}
const result = { adjacentTransitions: 15, interruptedSwitches: switches, maximumYawErrorDegrees: maximumYawError * 180 / Math.PI, maximumHomeErrorMm: maximumHomeError * 1000, minimumClearanceMm: minimumClearance * 1000 };
console.log(result);
fs.mkdirSync(root + 'docs/adjacent-switch', { recursive: true });
fs.writeFileSync(root + 'docs/adjacent-switch/solver.json', JSON.stringify(result, null, 2) + '\n');
