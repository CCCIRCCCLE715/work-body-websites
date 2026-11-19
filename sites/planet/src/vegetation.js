import * as THREE from 'three';
import { mergeGeometries, mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { R, SITES, LAKE, LAKES, LAKE_LEVEL, heightAt, lakeCoords, nearestSiteAngle, PATH_HASH, DirectionHash, tangentFrame, moveAlong, reliefAt, shoreMargin } from './planet-surface.js';
import { createNoise3D, mulberry32, smoothstep } from './noise.js';

let rand = mulberry32(2024);
const rr = (a, b) => a + (b - a) * rand();
const nBiome = createNoise3D(91);
const nPatch = createNoise3D(193), nStone = createNoise3D(241);

// ---------- geometry kit (all parts carry vertex colours, merged per species) ----------
function part(geo, color, { pos = [0, 0, 0], rot = [0, 0, 0], scale = [1, 1, 1], jitter = 0, shade = 0.08 } = {}) {
  let g = geo.index ? geo.toNonIndexed() : geo;
  g.deleteAttribute('uv');
  if (jitter) {
    const p = g.attributes.position; const map = new Map();
    for (let i = 0; i < p.count; i++) {
      const k = p.getX(i).toFixed(3) + p.getY(i).toFixed(3) + p.getZ(i).toFixed(3);
      if (!map.has(k)) map.set(k, 1 + (rand() - 0.5) * jitter);
      const f = map.get(k); p.setXYZ(i, p.getX(i) * f, p.getY(i) * f, p.getZ(i) * f);
    }
  }
  g.scale(...scale); g.rotateX(rot[0]); g.rotateY(rot[1]); g.rotateZ(rot[2]); g.translate(...pos);
  const c = new THREE.Color(color); const col = new Float32Array(g.attributes.position.count * 3);
  const p = g.attributes.position; const box = new THREE.Box3().setFromBufferAttribute(p);
  for (let i = 0; i < p.count; i++) {
    // darker underside, lighter top: a cheap baked occlusion that reads well in toon lighting
    const t = (p.getY(i) - box.min.y) / Math.max(1e-3, box.max.y - box.min.y);
    const f = 1 - shade + shade * 2 * t;
    col.set([c.r * f, c.g * f, c.b * f], i * 3);
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return g;
}
const blob = (r, d = 1) => { const g = new THREE.IcosahedronGeometry(r, d); return g; };
const smoothNormals = g => { g.computeVertexNormals(); return g; };
function merged(parts) { const g = mergeGeometries(parts); g.computeBoundingSphere(); return g; }
function blobPart(r, color, pos, scale = [1, 1, 1], d = 1) {
  // smooth sphere normals keep crowns soft even at low tessellation
  const g = part(blob(r, d), color, { pos, scale, jitter: 0.12, shade: 0.16 });
  const p = g.attributes.position; const n = new Float32Array(p.count * 3);
  for (let i = 0; i < p.count; i++) {
    const v = new THREE.Vector3(p.getX(i) - pos[0], (p.getY(i) - pos[1]) / scale[1], p.getZ(i) - pos[2]).normalize();
    n.set([v.x, v.y, v.z], i * 3);
  }
  g.setAttribute('normal', new THREE.BufferAttribute(n, 3));
  return g;
}
const trunk = (h, r0, r1, color = 0x8a5b3d, bend = 0) => part(new THREE.CylinderGeometry(r1, r0, h, 7, 2), color, { pos: [0, h / 2, 0], rot: [0, 0, bend], shade: 0.15 });

function roundTree(c1, c2) {
  return merged([trunk(0.62, 0.075, 0.05),
    blobPart(0.42, c1, [0, 0.86, 0], [1, 1, 1], 2), blobPart(0.3, c2, [0.27, 0.72, 0.1], [1, 0.9, 1], 1), blobPart(0.28, c2, [-0.24, 0.76, -0.12], [1, 0.9, 1], 1), blobPart(0.24, c1, [0.05, 1.14, 0.08], [1, 1, 1], 1)]);
}
function conifer() {
  const g = [trunk(0.35, 0.07, 0.05, 0x7a4f35)];
  [[0.5, 0.55, 0.32], [0.4, 0.48, 0.66], [0.29, 0.42, 0.95], [0.17, 0.3, 1.18]].forEach(([r, h, y], i) =>
    g.push(part(new THREE.ConeGeometry(r, h, 10, 1), i % 2 ? 0x3f9a6b : 0x4aa877, { pos: [0, y + h / 2, 0], shade: 0.22 })));
  return merged(g);
}
function cypress() { return merged([trunk(0.25, 0.06, 0.05), blobPart(0.26, 0x4f9e5e, [0, 0.82, 0], [1, 2.4, 1], 2)]); }
function birch() {
  const t = trunk(0.95, 0.055, 0.045, 0xf2ede4);
  const col = t.attributes.color, p = t.attributes.position;
  for (let i = 0; i < p.count; i++) if (Math.sin(p.getY(i) * 31) > 0.72) col.setXYZ(i, 0.25, 0.22, 0.2);
  return merged([t, blobPart(0.3, 0xc8e46c, [0, 1.02, 0], [1, 1.15, 1], 2), blobPart(0.22, 0xb4dc63, [0.2, 0.86, 0.05], [1, 1, 1], 1), blobPart(0.2, 0xd8ec82, [-0.16, 1.24, 0], [1, 1, 1], 1)]);
}
function palm() {
  const g = []; let x = 0, y = 0;
  for (let i = 0; i < 6; i++) {
    const seg = part(new THREE.CylinderGeometry(0.05, 0.062, 0.2, 7), i % 2 ? 0xb88d5c : 0xa97d4f, { pos: [x, y + 0.1, 0], rot: [0, 0, -0.05 * i], shade: 0.1 });
    g.push(seg); x += 0.018 * i; y += 0.19;
  }
  for (let k = 0; k < 7; k++) {
    const leaf = new THREE.PlaneGeometry(0.11, 0.46, 1, 6); const p = leaf.attributes.position;
    for (let i = 0; i < p.count; i++) { const v = p.getY(i) + 0.23; p.setZ(i, -v * v * 0.9); p.setX(i, p.getX(i) * Math.sin(Math.min(1, 0.15 + v * 2.4) * Math.PI * 0.95)); }
    leaf.translate(0, 0.23, 0); leaf.rotateX(-1.0);
    const lp = part(leaf, k % 2 ? 0x5cc46a : 0x4cb35f, { rot: [0, k / 7 * Math.PI * 2, 0], pos: [x, y + 0.02, 0], shade: 0.2 });
    lp.computeVertexNormals(); g.push(lp);
  }
  g.push(part(blob(0.05, 0), 0x7a5230, { pos: [x + 0.05, y - 0.03, 0.03] }), part(blob(0.05, 0), 0x7a5230, { pos: [x - 0.04, y - 0.04, -0.02] }));
  return merged(g);
}
function bush(c, flower) {
  const g = [blobPart(0.24, c, [0, 0.17, 0], [1.2, 0.85, 1.1], 1), blobPart(0.18, c, [0.2, 0.12, 0.05], [1, 0.9, 1], 1), blobPart(0.17, c, [-0.18, 0.12, -0.04], [1, 0.9, 1], 1)];
  if (flower) for (let i = 0; i < 6; i++) { const a = i * 1.1; g.push(part(blob(0.04, 0), flower, { pos: [Math.cos(a) * 0.2, 0.25 + 0.05 * Math.sin(i * 2), Math.sin(a) * 0.18] })); }
  return merged(g);
}
function fern() {
  const g = [];
  for (let k = 0; k < 9; k++) {
    const frond = new THREE.PlaneGeometry(0.11, 0.5, 1, 5); const p = frond.attributes.position;
    for (let i = 0; i < p.count; i++) { const v = p.getY(i) + 0.25; p.setX(i, p.getX(i) * Math.sin(Math.min(1, v * 2.2) * Math.PI) ); p.setZ(i, -v * v * 0.9); }
    frond.translate(0, 0.25, 0); frond.rotateX(-0.75 - 0.25 * (k % 3));
    const f = part(frond, k % 2 ? 0x4fae5a : 0x63c065, { rot: [0, k / 9 * Math.PI * 2 + 0.2 * (k % 2), 0], shade: 0.3 });
    f.computeVertexNormals(); g.push(f);
  }
  return merged(g);
}
function reeds() {
  const g = [];
  for (let k = 0; k < 7; k++) {
    const h = 0.55 + 0.35 * ((k * 37) % 10) / 10; const a = k * 0.9, r = 0.05 + 0.04 * (k % 3);
    const tilt = [0.08 * Math.sin(k * 2), 0, 0.08 * Math.cos(k * 3)];
    g.push(part(new THREE.CylinderGeometry(0.008, 0.016, h, 4), k % 2 ? 0x9cbc5c : 0x86ad52, { pos: [Math.cos(a) * r, h / 2, Math.sin(a) * r], rot: tilt, shade: 0.25 }));
    if (k % 2 === 0) g.push(part(new THREE.CylinderGeometry(0.022, 0.022, 0.12, 6), 0x8b5a36, { pos: [Math.cos(a) * r + tilt[2] * -h * 0.5, h * 0.95, Math.sin(a) * r + tilt[0] * h * 0.5] }));
  }
  return merged(g);
}
function rock(seed) {
  const g = part(new THREE.DodecahedronGeometry(0.22, 0), seed % 2 ? 0xc9c2b4 : 0xb3ab9c, { pos: [0, 0.08, 0], scale: [1.2, 0.7, 1], jitter: 0.35, shade: 0.2 });
  g.computeVertexNormals();
  return merged([g, ...(seed % 3 === 0 ? [part(new THREE.DodecahedronGeometry(0.1, 0), 0xbdb5a6, { pos: [0.2, 0.04, 0.08], jitter: 0.3 })] : [])]);
}
function flowers(palette) {
  const g = [];
  for (let k = 0; k < 6; k++) {
    const a = k * 2.4, r = 0.05 + 0.1 * ((k * 7) % 5) / 5, h = 0.1 + 0.06 * (k % 3);
    g.push(part(new THREE.CylinderGeometry(0.006, 0.008, h, 3, 1, true), 0x5aa84f, { pos: [Math.cos(a) * r, h / 2, Math.sin(a) * r] }));
    g.push(part(blob(0.034, 0), palette[k % palette.length], { pos: [Math.cos(a) * r, h, Math.sin(a) * r], scale: [1, 0.42, 1], shade: 0.25 }));
  }
  return merged(g);
}
function lilyPad() {
  const pad = new THREE.CircleGeometry(0.16, 14, 0.25, Math.PI * 2 - 0.5); pad.rotateX(-Math.PI / 2);
  return merged([part(pad, 0x5fb865, { pos: [0, 0.012, 0] }), part(blob(0.04, 1), 0xffb3cc, { pos: [0.05, 0.04, 0.03], scale: [1, 0.7, 1] })]);
}

// ---------- species table ----------
const SPECIES = {
  round: { geo: () => roundTree(0x6cc36a, 0x8fd66c), tree: true },
  roundDeep: { geo: () => roundTree(0x4fae63, 0x6cc36a), tree: true },
  orange: { geo: () => roundTree(0xf2b84b, 0xf7cf68), tree: true },
  blossom: { geo: () => roundTree(0xf6a9c4, 0xffc6d9), tree: true },
  conifer: { geo: conifer, tree: true },
  cypress: { geo: cypress, tree: true },
  birch: { geo: birch, tree: true },
  palm: { geo: palm, tree: true },
  bush: { geo: () => bush(0x5fb862, 0xff9eb5) },
  bushY: { geo: () => bush(0x7cc85a, 0xfff3a0) },
  bushPlain: { geo: () => bush(0x69ab73) },
  bushSilver: { geo: () => bush(0x88b58c) },
  fern: { geo: fern },
  reeds: { geo: reeds },
  rockA: { geo: () => rock(1) }, rockB: { geo: () => rock(3) },
  flowersA: { geo: () => flowers([0xff8fb1, 0xffffff, 0xffc0d6]) },
  flowersB: { geo: () => flowers([0xffd166, 0xff9f68, 0xffffff]) },
  flowersC: { geo: () => flowers([0xb69cff, 0x8ec5ff, 0xffffff]) },
  lily: { geo: lilyPad },
};

const VEG_SCALE = 0.78;

function placeMatrix(d, h, yaw, s, sink = 0.03, aspect = [1, 1, 1]) {
  const up = d.clone();
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), up);
  q.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw));
  return new THREE.Matrix4().compose(up.multiplyScalar(R + h - sink), q, new THREE.Vector3(s * aspect[0], s * aspect[1], s * aspect[2]));
}

function randomDir() {
  const u = rand() * 2 - 1, th = rand() * Math.PI * 2, r = Math.sqrt(1 - u * u);
  return new THREE.Vector3(r * Math.cos(th), u, r * Math.sin(th));
}
function slopeAt(d, h) {
  const fr = tangentFrame(d); const e = 0.01;
  const hx = heightAt(moveAlong(d, fr.r, e)), hz = heightAt(moveAlong(d, fr.f, e));
  return Math.hypot(hx - h, hz - h) / (e * R);
}

export function createVegetation() {
  rand = mulberry32(2024);
  const items = {}; for (const k of Object.keys(SPECIES)) items[k] = [];
  const treeHash = new DirectionHash(0.06);
  const push = (k, m, d) => items[k].push({ m, d });
  const standClear = d => SITES.every(s => s.stand.distanceTo(d) > 0.045);
  const clear = (d, siteGap, pathGap, small = true) => nearestSiteAngle(d, small).gap > siteGap && PATH_HASH.nearest(d, pathGap + 0.01).dist > pathGap && standClear(d);

  // Rejection sampling follows broad habitat patches instead of filling the largest empty gap.
  // A small clearance prevents overlaps while preserving irregular clusters and open meadows.
  function patchScatter(n, valid, spacing, sampler = randomDir, occupied = new DirectionHash(0.06)) {
    const out = [];
    for (let tries = 0; out.length < n && tries < n * 100; tries++) {
      const d = sampler(), h = heightAt(d);
      if (!valid(d, h) || occupied.nearest(d, spacing).item) continue;
      occupied.add(d, true); out.push({ d, h });
    }
    return out;
  }
  // Broad overlapping habitats gently bias density. Every region still receives plants;
  // there are no copied grove templates or tight centre-biased clusters.
  const habitat = d => 0.32 + 0.46 * smoothstep(-0.65, 0.65,
    nPatch(d.x * 1.65 + 3, d.y * 1.65, d.z * 1.65 - 2));
  const treeSpots = patchScatter(145, (d, h) => h > 0.08 && lakeCoords(d).u > 1.5
    && clear(d, 0.065, 0.045, false) && slopeAt(d, h) < 0.6 && rand() < habitat(d), 0.075).map(p => p.d);
  for (const d of treeSpots) {
    const h = heightAt(d);
    const b = nBiome(d.x * 2.1, d.y * 2.1, d.z * 2.1);
    let k;
    const shore = shoreMargin(d);
    if (shore < 0.05 && rand() < 0.7) k = 'palm';                    // palms hug the coast
    else if (reliefAt(d) > 0.35) k = rand() < 0.65 ? 'conifer' : 'cypress'; // conifers climb the ranges
    else if (b < -0.25) k = ['conifer', 'roundDeep', 'cypress'][Math.floor(rand() * 3)];
    else if (b < 0.1) k = ['round', 'birch', 'roundDeep', 'orange'][Math.floor(rand() * 4)];
    else if (b < 0.4) k = ['blossom', 'round', 'orange', 'birch'][Math.floor(rand() * 4)];
    else k = ['birch', 'cypress', 'blossom'][Math.floor(rand() * 3)];
    // Habitat favours a few species, but does not turn a neighbourhood into one repeated tree.
    if (rand() < 0.45) k = ['round', 'roundDeep', 'birch', 'cypress', 'conifer', 'orange', 'blossom'][Math.floor(rand() * 7)];
    const s = rr(0.75, 1.2) * (k === 'palm' ? 1.05 : 1) * VEG_SCALE;
    push(k, placeMatrix(d, h, rand() * Math.PI * 2, s, 0.04, [rr(0.85, 1.15), rr(0.82, 1.22), rr(0.85, 1.15)]), d);
    treeHash.add(d, k);
  }
  const land = (minH, siteGap, pathGap) => (d, h) => h > minH && lakeCoords(d).u > 1.3
    && clear(d, siteGap, pathGap) && !treeHash.nearest(d, 0.045).item;
  const understory = new DirectionHash(0.06);
  const place = (keys, spots, scale, sink = 0.02) => {
    for (const { d, h } of spots) {
      const s = rr(...scale) * VEG_SCALE;
      push(keys[Math.floor(rand() * keys.length)], placeMatrix(d, h, rand() * Math.PI * 2, s, sink,
        [rr(0.78, 1.2), rr(0.7, 1.25), rr(0.8, 1.15)]), d);
    }
  };
  // Shared spacing across shrubs and ferns prevents several species occupying the same spot.
  place(['bush', 'bushY', 'bushPlain', 'bushSilver'], patchScatter(180,
    (d, h) => land(0.08, 0.03, 0.03)(d, h) && rand() < habitat(d), 0.06, randomDir, understory), [0.65, 1.25]);
  place(['fern'], patchScatter(165,
    (d, h) => land(0.1, 0.025, 0.025)(d, h) && rand() < habitat(d), 0.047, randomDir, understory), [0.6, 1.15]);
  place(['flowersA', 'flowersB', 'flowersC'], patchScatter(330,
    (d, h) => land(0.08, 0.015, 0.02)(d, h) && rand() < habitat(d), 0.03, randomDir, understory), [0.65, 1.35], 0.01);
  place(['rockA', 'rockB'], patchScatter(75, (d, h) => h > -0.06 && lakeCoords(d).u > 1.15
    && clear(d, 0.02, 0.025) && !understory.nearest(d, 0.045).item
    && rand() < 0.3 + 0.45 * smoothstep(-0.45, 0.5, nStone(d.x * 2.2, d.y * 2.2 + 4, d.z * 2.2)), 0.055), [0.55, 1.45], 0.04);

  // lakes: reed clumps on parts of each bank, lily pads, a lush ring of ferns and flowers
  const nearLake = () => { const L = LAKES[Math.floor(rand() * LAKES.length)]; return moveAlong(L.c, L.frame.r.clone().applyAxisAngle(L.c, rand() * Math.PI * 2), Math.sqrt(rand()) * 0.3); };
  const scatter = (keys, n, test, scale, sink = 0.02, sampler = randomDir) => {
    let placed = 0, tries = 0;
    while (placed < n && tries++ < n * 60) {
      const d = sampler(); const h = heightAt(d);
      const r = test(d, h); if (!r) continue;
      push(keys[Math.floor(rand() * keys.length)], placeMatrix(d, typeof r === 'number' ? r : h, rand() * 6.28, rr(...scale) * VEG_SCALE, sink), d);
      placed++;
    }
  };
  scatter(['reeds'], 30, (d) => { const lk = lakeCoords(d); return lk.u > 0.88 && lk.u < 1.2 && Math.sin(lk.phi * 3 + 1.2) > 0.25 && clear(d, 0.02, 0.025); }, [0.6, 0.95], 0.03, nearLake);
  scatter(['reeds'], 40, (d, h) => h > -0.02 && h < 0.06 && clear(d, 0.03, 0.03), [0.6, 1.0], 0.03);
  scatter(['lily'], 26, (d) => { const u = lakeCoords(d).u; return u < 0.78 ? LAKE_LEVEL + 0.005 : false; }, [0.8, 1.3], 0, nearLake);
  scatter(['fern', 'bushPlain', 'flowersA', 'flowersC'], 36, (d) => { const u = lakeCoords(d).u; return u > 1.2 && u < 1.9 && clear(d, 0.02, 0.025) && !treeHash.nearest(d, 0.045).item && !understory.nearest(d, 0.047).item && (understory.add(d, true), true); }, [0.65, 1.1], 0.02, nearLake);


  const material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.82, metalness: 0, side: THREE.DoubleSide, envMapIntensity: 0.4 });
  const uTime = { value: 0 };
  material.onBeforeCompile = sh => {
    sh.uniforms.uTime = uTime;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nuniform float uTime;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
#ifdef USE_INSTANCING
  float ph = instanceMatrix[3].x*0.7 + instanceMatrix[3].z*0.53 + instanceMatrix[3].y*0.31;
  float k = max(position.y - 0.25, 0.0);
  transformed.x += sin(uTime*1.4 + ph) * 0.035 * k;
  transformed.z += cos(uTime*1.1 + ph*1.3) * 0.025 * k;
#endif`);
  };
  const group = new THREE.Group(); group.name = 'vegetation';
  let tris = 0;
  // Scenery is placed once. Depth testing hides the far side naturally; neither the camera
  // nor the avatar changes instance scales, counts or ordering during play.
  for (const [k, list] of Object.entries(items)) {
    if (!list.length) continue;
    const raw = SPECIES[k].geo();
    // Keep all triangles, normals and colours; reuse identical vertices in the index buffer.
    const geo = mergeVertices(raw, 1e-5); raw.dispose();
    const mesh = new THREE.InstancedMesh(geo, material, list.length);
    mesh.instanceMatrix.setUsage(THREE.StaticDrawUsage);
    list.forEach((item, i) => {
      mesh.setMatrixAt(i, item.m);
      mesh.setColorAt(i, new THREE.Color().setHSL(rr(0.06, 0.16), rr(0.02, 0.12), rr(0.88, 0.98)));
    });
    mesh.castShadow = SPECIES[k].tree || k.startsWith('rock') || k.startsWith('bush');
    mesh.receiveShadow = true;
    mesh.frustumCulled = false;
    mesh.name = 'veg-' + k;
    mesh.updateMatrix(); mesh.matrixAutoUpdate = false;
    tris += geo.index.count / 3 * list.length;
    group.add(mesh);
  }
  return { group, uTime, counts: Object.fromEntries(Object.entries(items).map(([k, v]) => [k, v.length])), tris };
}
