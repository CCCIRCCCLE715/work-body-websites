import test from 'node:test';
import assert from 'node:assert/strict';
import { LANDMARKS } from '../src/data.js';

test('entrances and screens are seen front-on in the default detail view', () => {
  for (const id of ['emperor', 'scholar', 'survivor', 'phone_steward', 'designer', 'wizard', 'planner']) {
    const s = LANDMARKS.find(s => s.id === id);
    const yaw = s.view?.[0] ?? 45;
    assert.ok(Math.cos(yaw * Math.PI / 180) > 0.96, id + ' should show its front, not its side');
  }
});


test('hiding far-side landmarks preserves the light layout and warm shader variants', async () => {
  const THREE = await import('three');
  const { createLandmarks } = await import('../src/landmarks.js');
  const planet = new THREE.Group(), landmarks = createLandmarks(planet);
  for (const entry of landmarks.entries.slice(0, 2)) {
    const model = new THREE.Group(), lamp = new THREE.PointLight(0xffaa66, 2, 3);
    lamp.position.set(0.1, 0.4, 0.2); model.add(lamp);
    landmarks.setModel(entry, model);
    planet.updateMatrixWorld(true);
    const before = lamp.getWorldPosition(new THREE.Vector3());
    entry.group.visible = false;
    const visible = []; planet.traverseVisible(o => { if (o.isPointLight) visible.push(o); });
    assert.ok(visible.includes(lamp), 'offscreen lamps must not change the shader light count');
    assert.ok(lamp.getWorldPosition(new THREE.Vector3()).distanceTo(before) < 1e-8);
  }
});


test('a landmark reappearing at the horizon never has an extra hidden model frame', async () => {
  const THREE = await import('three');
  const { createLandmarks } = await import('../src/landmarks.js');
  const landmarks = createLandmarks(new THREE.Group()), e = landmarks.entries[0];
  landmarks.setModel(e, new THREE.Group());
  e.group.visible = false; landmarks.update(0, 1 / 60);
  e.group.visible = true;
  assert.equal(e.model.visible, true, 'parent visibility must not leave a stale child visibility flag');
});
