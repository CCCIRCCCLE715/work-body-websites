import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { SITES } from '../src/planet-surface.js';
import { siteQuaternion } from '../src/landmarks.js';

// The home globe orientation, before any drag or project selection.
const home = new THREE.Quaternion(-0.5114911087237605, -0.5633280702293083, -0.6436836689292443, 0.08191254691467569);

test('fixed facades face the default orbit approach without rotating the planet on zoom', () => {
  const x = new THREE.Vector3(1, 0, 0), y = new THREE.Vector3(0, 1, 0);
  for (const site of SITES.slice(1)) {
    const normal = site.n.clone().applyQuaternion(home);
    const yaw = new THREE.Quaternion().setFromAxisAngle(y, -Math.atan2(normal.x, normal.z));
    normal.applyQuaternion(yaw);
    const pitch = new THREE.Quaternion().setFromAxisAngle(x, 1.05 - Math.atan2(normal.z, normal.y));
    const orbit = pitch.multiply(yaw).multiply(home);
    const front = site.frame.f.clone().applyQuaternion(orbit);
    const expected = new THREE.Vector3(0, -Math.sin(1.05), Math.cos(1.05));
    assert.ok(front.dot(expected) > 0.99, site.id + ' entrance should face the normal orbit approach');
    const up = new THREE.Vector3(0, 1, 0).applyQuaternion(siteQuaternion(site));
    assert.ok(up.dot(site.n) > 0.999999, site.id + ' must remain upright on the sphere');
    assert.ok(site.standDir.dot(site.frame.f) > 0.6, site.id + ' arrival must stay in front of the entrance');
  }
});
