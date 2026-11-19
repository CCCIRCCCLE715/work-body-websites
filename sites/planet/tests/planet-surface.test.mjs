import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { SITES, EDGES, EDGE_PATHS, LAKES, LAKE_LEVEL, heightAt, stats, angleBetween, findRoute, lakeCoords, nearestSiteAngle } from '../src/planet-surface.js';

test('twelve landmarks spread evenly on land', () => {
  assert.equal(SITES.length, 12);
  for (const s of SITES) {
    assert.ok(heightAt(s.n) > 0.1, s.id + ' should sit on land');
    assert.ok(heightAt(s.stand) > 0.05, s.id + ' stand point on land');
    for (const o of SITES) if (o !== s) assert.ok(angleBetween(s.n, o.n) > 1.0, s.id + ' too close to ' + o.id);
  }
});

test('one sea under 20 percent, one or two lakes', () => {
  const st = stats(30000);
  console.log(st);
  assert.ok(st.ocean > 0.12 && st.ocean <= 0.2, 'ocean ' + st.ocean);
  assert.ok(LAKES.length >= 1 && LAKES.length <= 2);
  assert.ok(st.lake > 0.002 && st.lake < 0.02, 'lake ' + st.lake);
});

test('the sea is one connected body (no scattered ponds)', () => {
  let g = new THREE.IcosahedronGeometry(1, 40); g.deleteAttribute('normal'); g.deleteAttribute('uv'); g = mergeVertices(g, 1e-5);
  const p = g.attributes.position, n = p.count, d = new THREE.Vector3();
  const sea = new Uint8Array(n);
  for (let i = 0; i < n; i++) { d.fromBufferAttribute(p, i).normalize(); sea[i] = heightAt(d) < 0 && lakeCoords(d).u > 2 ? 1 : 0; }
  const nb = Array.from({ length: n }, () => []); const idx = g.index.array;
  for (let i = 0; i < idx.length; i += 3) for (const [a, b] of [[0, 1], [1, 2], [2, 0]]) { nb[idx[i + a]].push(idx[i + b]); }
  const seen = new Uint8Array(n); const sizes = [];
  for (let i = 0; i < n; i++) if (sea[i] && !seen[i]) {
    let size = 0; const st = [i]; seen[i] = 1;
    while (st.length) { const v = st.pop(); size++; for (const w of nb[v]) if (sea[w] && !seen[w]) { seen[w] = 1; st.push(w); } }
    sizes.push(size);
  }
  sizes.sort((a, b) => b - a);
  console.log('sea components', sizes.slice(0, 5));
  assert.ok(sizes.length >= 1);
  assert.ok(sizes.slice(1).every(s => s <= 3), 'stray water patches: ' + sizes.slice(1, 6).join(','));
});

test('lakes are shallow and enclosed', () => {
  for (const L of LAKES) {
    const centre = heightAt(L.c);
    assert.ok(LAKE_LEVEL - centre < 0.3 && LAKE_LEVEL - centre > 0.08, 'shallow centre');
    for (let k = 0; k < 64; k++) {
      const phi = k / 64 * Math.PI * 2;
      const t = L.frame.r.clone().multiplyScalar(Math.cos(phi)).addScaledVector(L.frame.f, Math.sin(phi));
      for (let a = 0.08; a < 0.3; a += 0.01) {
        const d = L.c.clone().multiplyScalar(Math.cos(a)).addScaledVector(t, Math.sin(a)).normalize();
        const u = lakeCoords(d).u;
        if (u > 1.05 && u < 1.55) assert.ok(heightAt(d) >= LAKE_LEVEL, 'rim at ' + phi.toFixed(2));
      }
    }
  }
});

test('one footpath network links every landmark over land only', () => {
  assert.equal(EDGES.length, 11);
  for (let i = 1; i < 12; i++) {
    const pts = findRoute(0, i);
    assert.ok(pts.length > 2, 'no route to ' + SITES[i].id);
    for (const p of pts) {
      assert.ok(heightAt(p) > 0.02, 'path dips into water');
      for (const s of SITES) assert.ok(angleBetween(p, s.n) > s.core, 'path crosses ' + s.id);
    }
  }
});

test('no large bare land patches far from landmarks, paths or water', () => {
  // land points farther than ~0.42 rad (4.2 units) from any landmark are allowed but must be sparse
  let far = 0, land = 0;
  for (let i = 0; i < 4000; i++) {
    const y = 1 - (i + 0.5) * 2 / 4000, r = Math.sqrt(1 - y * y), th = i * Math.PI * (3 - Math.sqrt(5));
    const d = new THREE.Vector3(Math.cos(th) * r, y, Math.sin(th) * r);
    if (heightAt(d) < 0.05) continue; land++;
    if (nearestSiteAngle(d).gap > 0.55) far++;
  }
  assert.ok(far / land < 0.05, 'land far from every landmark: ' + (far / land).toFixed(3));
});
