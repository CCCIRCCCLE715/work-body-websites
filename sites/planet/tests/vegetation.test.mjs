import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createHash } from 'node:crypto';
import { createVegetation } from '../src/vegetation.js';
import { R, heightAt, tangentFrame, moveAlong } from '../src/planet-surface.js';

function snapshot(group) {
  return group.children.map(mesh => ({
    name: mesh.name, count: mesh.count,
    matrices: createHash('sha256').update(new Uint8Array(mesh.instanceMatrix.array.buffer)).digest('hex'),
    colors: createHash('sha256').update(new Uint8Array(mesh.instanceColor.array.buffer)).digest('hex'),
  }));
}

test('walking past a tree and rotating the view never changes planted scenery', () => {
  const vegetation = createVegetation(), planet = new THREE.Group();
  planet.add(vegetation.group); planet.updateMatrixWorld(true);
  const tree = vegetation.group.getObjectByName('veg-round');
  const matrix = new THREE.Matrix4(); tree.getMatrixAt(0, matrix);
  const base = new THREE.Vector3().setFromMatrixPosition(matrix), dir = base.clone().normalize();
  const frame = tangentFrame(dir), camera = new THREE.PerspectiveCamera(36, 1.6, 0.1, 1200);
  const before = snapshot(vegetation.group);
  for (const angle of [0.07, 0.03, -0.03, -0.07]) {
    const at = moveAlong(dir, frame.f, angle);
    const avatar = at.multiplyScalar(R + heightAt(at));
    camera.position.copy(base).addScaledVector(dir, 8).addScaledVector(frame.f, -6);
    camera.lookAt(avatar); camera.updateMatrixWorld(true);
    // Exercise the old camera/character hooks too, so this reproduces the original disappearing trees.
    vegetation.updateOcclusion?.(avatar, camera, planet, 1);
    vegetation.pack?.(camera.position.clone().normalize(), 0.2);
    assert.deepEqual(snapshot(vegetation.group), before);
  }
});


test('plant geometry reuses shared vertices without dropping triangles', () => {
  const vegetation = createVegetation();
  let vertices = 0, corners = 0;
  for (const mesh of vegetation.group.children) {
    vertices += mesh.geometry.attributes.position.count * mesh.count;
    corners += (mesh.geometry.index?.count ?? mesh.geometry.attributes.position.count) * mesh.count;
  }
  assert.ok(vertices < corners * 0.7, 'repeated plant vertices should be shared on the GPU');
  assert.equal(corners / 3, vegetation.tris);
});


test('different groundcover species keep breathing room instead of overlapping into clumps', () => {
  const vegetation = createVegetation(), plants = [], matrix = new THREE.Matrix4();
  for (const mesh of vegetation.group.children) {
    if (!mesh.name.startsWith('veg-bush') && mesh.name !== 'veg-fern') continue;
    for (let i = 0; i < mesh.count; i++) {
      mesh.getMatrixAt(i, matrix);
      plants.push(new THREE.Vector3().setFromMatrixPosition(matrix).normalize());
    }
  }
  for (let i = 0; i < plants.length; i++) for (let j = i + 1; j < plants.length; j++) {
    assert.ok(plants[i].distanceTo(plants[j]) >= 0.0469, 'shared spacing between shrubs and ferns');
  }
  const peak = Math.max(...plants.map(p => plants.filter(q => p.distanceTo(q) < 0.1).length));
  assert.ok(peak <= 9, 'a small patch should not contain a dense pile of large groundcover');
  assert.ok(vegetation.tris <= 228336, 'keep foliage below the previous triangle load');
});

test('reloads preserve planting while local tree neighbourhoods mix species', () => {
  const a = createVegetation(), b = createVegetation();
  assert.deepEqual(snapshot(a.group), snapshot(b.group));
  const names = new Set(['round', 'roundDeep', 'orange', 'blossom', 'conifer', 'cypress', 'birch', 'palm']);
  const trees = [], matrix = new THREE.Matrix4();
  for (const mesh of a.group.children) {
    const species = mesh.name.slice(4);
    if (!names.has(species)) continue;
    for (let i = 0; i < mesh.count; i++) {
      mesh.getMatrixAt(i, matrix);
      trees.push({ species, dir: new THREE.Vector3().setFromMatrixPosition(matrix).normalize() });
    }
  }
  const diverse = trees.filter(p => new Set(trees.filter(q => p.dir.distanceTo(q.dir) < 0.5).map(q => q.species)).size >= 3);
  assert.ok(diverse.length / trees.length > 0.8, 'most local areas contain several tree silhouettes');
});
