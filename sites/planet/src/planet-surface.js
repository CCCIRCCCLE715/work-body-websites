import * as THREE from 'three';
import { createNoise3D, fbm, smoothstep, clamp, mix } from './noise.js';
import { LANDMARKS } from './data.js';

export const R = 10;            // planet radius (sea level at h = 0)
export const OCEAN_FRACTION = 0.19; // one continuous sea, kept under 20%
export const SITE_LEVEL = 0.14;  // height of every landmark foundation
export const LAKE_LEVEL = 0.26;  // lake surface height (above sea)
const RELIEF = 0.72;             // hills scaled with the smaller landmarks so the planet reads larger

const nWarp = createNoise3D(11);
const nRange = createNoise3D(67);
const nHillMask = createNoise3D(83);
const nHill = createNoise3D(23);
const nDetail = createNoise3D(37);
const nLake = createNoise3D(51);

const WORLD_Y = new THREE.Vector3(0, 1, 0);
const WORLD_X = new THREE.Vector3(1, 0, 0);
export function tangentFrame(n, ref = WORLD_Y) {
  let f = ref.clone().addScaledVector(n, -ref.dot(n));
  if (f.lengthSq() < 1e-4) f = WORLD_X.clone().addScaledVector(n, -WORLD_X.dot(n));
  f.normalize();
  const r = new THREE.Vector3().crossVectors(n, f).normalize(); // right-handed basis: x=r, y=n, z=f
  return { n: n.clone(), f, r };
}
export function moveAlong(a, t, ang) { return a.clone().multiplyScalar(Math.cos(ang)).addScaledVector(t, Math.sin(ang)).normalize(); }
export const angleBetween = (a, b) => Math.acos(clamp(a.dot(b), -1, 1));
function arcDistance(p, a, b) {
  // angular distance from p to the great-circle arc a-b
  const n = new THREE.Vector3().crossVectors(a, b); const len = n.length();
  if (len < 1e-9) return angleBetween(p, a);
  n.divideScalar(len);
  const off = p.dot(n);
  const proj = p.clone().addScaledVector(n, -off);
  if (proj.lengthSq() > 1e-12) {
    proj.normalize();
    const ab = angleBetween(a, b);
    if (angleBetween(a, proj) <= ab + 1e-9 && angleBetween(proj, b) <= ab + 1e-9) return Math.asin(clamp(Math.abs(off), 0, 1));
  }
  return Math.min(angleBetween(p, a), angleBetween(p, b));
}

// ---------- icosahedron: 12 evenly spread landmarks ----------
const PHI = (1 + Math.sqrt(5)) / 2;
const ICO = [[-1,PHI,0],[1,PHI,0],[-1,-PHI,0],[1,-PHI,0],[0,-1,PHI],[0,1,PHI],[0,-1,-PHI],[0,1,-PHI],[PHI,0,-1],[PHI,0,1],[-PHI,0,-1],[-PHI,0,1]];
const tilt = new THREE.Quaternion().setFromEuler(new THREE.Euler(0.42, 0.31, 0.17));
const V = ICO.map(v => new THREE.Vector3(...v).normalize().applyQuaternion(tilt));
const ADJ = (i, j) => angleBetween(V[i], V[j]) < 1.2;
const ICO_EDGES = []; for (let i = 0; i < 12; i++) for (let j = i + 1; j < 12; j++) if (ADJ(i, j)) ICO_EDGES.push([i, j]);
const ICO_FACES = [];
for (const [i, j] of ICO_EDGES) for (let k = j + 1; k < 12; k++) if (ADJ(i, k) && ADJ(j, k))
  ICO_FACES.push({ ids: [i, j, k], c: V[i].clone().add(V[j]).add(V[k]).normalize() });

// ---------- one continuous sea: a winding channel through six faces of the equatorial strip ----------
const POLE = 0, ANTI = V.findIndex(v => v.dot(V[POLE]) < -0.99);
const poleFrame = tangentFrame(V[POLE]);
const strip = ICO_FACES.filter(f => !f.ids.includes(POLE) && !f.ids.includes(ANTI))
  .map(f => ({ ...f, az: Math.atan2(f.c.dot(poleFrame.f), f.c.dot(poleFrame.r)) }))
  .sort((a, b) => a.az - b.az);
const SEA_FACES = strip.slice(2, 7);
export const SEA_LINE = SEA_FACES.map(f => f.c.clone());
const SEA_HALF_WIDTH = 0.27;
// the sea swells toward its middle into a broad bay instead of an even, river-like channel
const SEG_LEN = SEA_LINE.slice(1).map((p, i) => angleBetween(SEA_LINE[i], p));
const TOTAL_LEN = SEG_LEN.reduce((a, b) => a + b, 0);
function seaDistance(d) {
  let m = Infinity, acc = 0;
  for (let i = 0; i < SEA_LINE.length - 1; i++) {
    const a = SEA_LINE[i], b = SEA_LINE[i + 1];
    const dist = arcDistance(d, a, b);
    const along = clamp(angleBetween(a, d) * Math.cos(dist) / Math.max(1e-6, SEG_LEN[i]), 0, 1);
    const T = (acc + along * SEG_LEN[i]) / TOTAL_LEN;
    const widen = SEA_HALF_WIDTH * (0.45 * Math.sin(Math.PI * T));
    m = Math.min(m, dist - widen);
    acc += SEG_LEN[i];
  }
  return m;
}

// buildings go on the three vertices farthest from the sea (and not neighbours of each other)
const vDist = V.map((v, i) => ({ i, d: seaDistance(v) })).sort((a, b) => b.d - a.d);
const buildingVerts = [];
for (const { i } of vDist) { if (buildingVerts.length < 3 && buildingVerts.every(j => !ADJ(i, j))) buildingVerts.push(i); }
const buildingIds = LANDMARKS.filter(l => l.kind === 'building').map(l => l.id);
const propIds = LANDMARKS.filter(l => l.kind !== 'building').map(l => l.id);
const ORDER = {};
buildingIds.forEach((id, k) => ORDER[id] = buildingVerts[k]);
const freeVerts = V.map((_, i) => i).filter(i => !buildingVerts.includes(i));
propIds.forEach((id, k) => ORDER[id] = freeVerts[k]);

export const SITES = LANDMARKS.map(lm => {
  const n = V[ORDER[lm.id]].clone();
  const frame = tangentFrame(n);
  // Rotate the complete site once, including its entrance, arrival point and connected path.
  frame.f.applyAxisAngle(n, THREE.MathUtils.degToRad(lm.heading));
  frame.r.crossVectors(n, frame.f).normalize();
  const [bx, , bz] = lm.bounds;
  const halfDiag = Math.hypot(bx, bz) * lm.scale / R;
  const halfDepth = bz * lm.scale / R;
  const core = lm.kind === 'building' ? halfDiag * 0.97 : halfDiag + 0.03;
  const standAng = (lm.kind === 'building' ? Math.max(core, halfDepth + 0.04) : halfDepth + 0.06) + 0.035;
  // the avatar waits at a front-side diagonal so both it and the landmark face the viewer
  const standDir = frame.f.clone().applyAxisAngle(n, lm.kind === 'building' ? 0.62 : 0.85);
  const stand = moveAlong(n, standDir, standAng);
  const clearR = lm.kind === 'building' ? Math.max(bx, bz) * lm.scale / R + 0.02 : core;
  return { ...lm, vertex: ORDER[lm.id], n, frame, core, clearR, standAng, standDir, stand, footprint: (2 * bx * lm.scale) * (2 * bz * lm.scale) };
});
export const SITE_BY_ID = Object.fromEntries(SITES.map(s => [s.id, s]));
const siteAtVertex = Object.fromEntries(SITES.map((s, k) => [s.vertex, k]));

// ---------- lakes: two small ponds on faces far from the sea and away from the buildings ----------
const lakeFaces = ICO_FACES
  .filter(f => f.ids.every(i => !buildingVerts.includes(i)))
  .map(f => ({ ...f, sd: seaDistance(f.c) }))
  .filter(f => f.sd > 0.5)
  .sort((a, b) => b.sd - a.sd);
const pickedLakes = [lakeFaces[0]];
const second = lakeFaces.find(f => angleBetween(f.c, lakeFaces[0].c) > 1.0 && f.sd > 0.55);
if (second) pickedLakes.push(second);
export const LAKES = pickedLakes.map((f, k) => ({ c: f.c.clone(), frame: tangentFrame(f.c), base: k === 0 ? 0.125 : 0.1, seed: k * 1.7 }));
export const LAKE = LAKES[0];
function lakeRadiusAt(lake, phi) {
  const s = lake.seed;
  return lake.base * (1 + 0.2 * Math.sin(3 * phi + 0.7 + s) + 0.11 * Math.sin(5 * phi + 2.1 + s * 2) + 0.06 * Math.sin(8 * phi + 0.3 + s));
}
const COS_LAKE = Math.cos(0.45);
// coordinates relative to the nearest lake; u < 1 is water
export function lakeCoords(d) {
  let best = { u: 99, phi: 0, a: 9, lake: null };
  for (const lake of LAKES) {
    if (d.dot(lake.c) < COS_LAKE) continue;
    const a = angleBetween(d, lake.c);
    const phi = Math.atan2(d.dot(lake.frame.f), d.dot(lake.frame.r));
    const wobble = 1 + 0.04 * nLake(d.x * 9, d.y * 9, d.z * 9);
    const u = a / (lakeRadiusAt(lake, phi) * wobble);
    if (u < best.u) best = { u, phi, a, lake };
  }
  return best;
}

// ---------- land mask with an exact sea quantile ----------
export function fibonacciSphere(count) {
  const pts = []; const ga = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < count; i++) {
    const y = 1 - (i + 0.5) * 2 / count; const r = Math.sqrt(1 - y * y); const th = i * ga;
    pts.push(new THREE.Vector3(Math.cos(th) * r, y, Math.sin(th) * r));
  }
  return pts;
}
const COS_SITE = Math.cos(0.5);
function rawMask(d) {
  // positive = land. Distance from the winding sea line, with a softly warped coastline.
  const warp = 0.075 * fbm(nWarp, d.x * 2.2 + 3.1, d.y * 2.2 - 1.7, d.z * 2.2 + 0.4, 3) + 0.018 * fbm(nDetail, d.x * 6, d.y * 6, d.z * 6, 2);
  let m = seaDistance(d) - SEA_HALF_WIDTH + warp;
  for (const s of SITES) { const c = d.dot(s.n); if (c > COS_SITE) m += 0.25 * smoothstep(0.5, 0.2, Math.acos(Math.min(1, c))); }
  return m;
}
const MASK_T = (() => {
  const vals = fibonacciSphere(24000).map(rawMask).sort((a, b) => a - b);
  return vals[Math.floor(vals.length * OCEAN_FRACTION)];
})();

// ---------- height field ----------
// Terrain character: wide flat plains (with very soft undulation) plus a few concentrated hill
// ranges. The mountains cluster into ~4 ranges instead of covering the whole sphere, so flat and
// hilly ground alternate and nothing looks uniformly bumpy.
const RANGE_CENTRES = [0, 1, 2, 3, 4].map(i => {
  // spread the ranges over the land, away from the waters' middle line
  const a = i / 5 * Math.PI * 2 + 0.4;
  const centre = new THREE.Vector3(Math.cos(a) * 0.62, (i % 2 ? 0.72 : -0.66), Math.sin(a) * 0.62).normalize();
  return { centre, frame: tangentFrame(centre), width: [0.57, 0.64, 0.60, 0.69, 0.55][i], stretch: [1.20, 0.85, 1.35, 1.0, 1.10][i], height: [1.0, 0.90, 1.12, 0.92, 1.04][i] };
});
function rangeMask(d) {
  let best = 0;
  for (const { centre, frame, width, stretch, height } of RANGE_CENTRES) {
    const along = Math.atan2(d.dot(frame.r), d.dot(centre));
    const across = Math.atan2(d.dot(frame.f), d.dot(centre));
    const w = Math.max(0, 1 - Math.hypot(along / (width * stretch), across / width));
    best = Math.max(best, height * w * w * (3 - 2 * w));
  }
  // Broad modulation separates the main summits without fragmenting their slopes.
  const gate = fbm(nRange, d.x * 1.4, d.y * 1.4, d.z * 1.4, 1);
  return clamp(best * (0.35 + 1.25 * smoothstep(-0.25, 0.35, gate)), 0, 1.35);
}
function naturalHeight(d, m) {
  const s = m - MASK_T;
  if (s < 0) return -1.2 * (1 - Math.exp(s / 0.07));
  const beach = 0.085 * smoothstep(0, 0.045, s);
  // plains: gentle rolling, very low relief
  const plain = 0.03 * fbm(nHillMask, d.x * 1.1 + 2, d.y * 1.1, d.z * 1.1 - 1, 2) * smoothstep(0.02, 0.2, s);
  // ranges: taller, sharper, only where rangeMask says so
  const rk = rangeMask(d) * smoothstep(0.02, 0.2, s);
  const ridge = fbm(nHill, d.x * 1.65 + 7, d.y * 1.65, d.z * 1.65 - 4, 2);
  const peaks = RELIEF * rk * (0.60 + 0.65 * clamp(ridge + 0.45, 0, 1));
  // Broad summits and continuous shoulders; no fine height noise between them.
  return beach + plain + peaks;
}

// Ground height under direction d (unit vector).
export function heightAt(d) {
  const m = rawMask(d);
  let h = naturalHeight(d, m);
  // lake basins: shallow, gentle banks, rims held above the lake surface so they never spill
  const lk = lakeCoords(d);
  if (lk.u < 2.2) {
    const rim = Math.max(h, LAKE_LEVEL + 0.05 + 0.04 * smoothstep(1.0, 2.0, lk.u));
    const basin = LAKE_LEVEL - 0.2 * Math.pow(clamp(1 - lk.u * lk.u, 0, 1), 0.8) + 0.025 * smoothstep(0.75, 1.0, lk.u);
    const bank = lk.u < 1 ? basin : mix(LAKE_LEVEL + 0.025, rim, smoothstep(1.0, 1.55, lk.u));
    h = mix(bank, h, smoothstep(1.6, 2.2, lk.u));
  }
  // landmark foundations follow each landmark's tangent plane, then blend into the hills
  for (const s of SITES) {
    const blend = s.kind === 'building' ? 0.19 : 0.15;
    if (d.dot(s.n) < Math.cos(s.core + blend)) continue;
    const a = angleBetween(d, s.n);
    const plane = (R + SITE_LEVEL) / Math.cos(Math.min(a, s.core)) - R;
    h = mix(plane, h, smoothstep(s.core, s.core + blend, a));
  }
  return h;
}
export function reliefAt(d) { return rangeMask(d); }
// distance above the shoreline (negative = under water), independent of the terrain's absolute height
export function shoreMargin(d) { return rawMask(d) - MASK_T; }

export const surfaceRadius = d => R + heightAt(d);
export function surfacePoint(d, lift = 0) { return d.clone().multiplyScalar(R + heightAt(d) + lift); }

// ---------- one trail: a loop along icosahedron edges that stays on land and visits every landmark ----------
function edgeOk(i, j) {
  // reject edges that would cross the sea or a lake
  for (let t = 0.12; t < 0.9; t += 0.04) {
    const p = V[i].clone().lerp(V[j], t).normalize();
    if (rawMask(p) - MASK_T < 0.05) return false;
    if (lakeCoords(p).u < 1.9) return false;
  }
  return true;
}
const OK_EDGES = ICO_EDGES.filter(([i, j]) => edgeOk(i, j));
// A spanning tree over land-only edges: every landmark is reachable by footpath, none of it crosses water.
// Among equal-length edges prefer the ones farthest from the coast, and keep junctions to at most three ways.
function spanningTrail() {
  const margin = ([i, j]) => { let m = Infinity; for (let t = 0.15; t < 0.9; t += 0.1) m = Math.min(m, rawMask(V[i].clone().lerp(V[j], t).normalize()) - MASK_T); return m; };
  const sorted = OK_EDGES.map(e => ({ e, m: margin(e) })).sort((a, b) => b.m - a.m);
  const parent = V.map((_, i) => i); const find = x => parent[x] === x ? x : (parent[x] = find(parent[x]));
  const deg = V.map(() => 0); const tree = [];
  for (const maxDeg of [2, 3, 5]) for (const { e: [i, j] } of sorted) {
    if (tree.length === 11) break;
    if (deg[i] >= maxDeg || deg[j] >= maxDeg || find(i) === find(j)) continue;
    parent[find(i)] = find(j); deg[i]++; deg[j]++; tree.push([i, j]);
  }
  return tree;
}
const TREE = spanningTrail();
export const TRAIL = { edges: TREE.length, connected: TREE.length === 11 };
export const EDGES = TREE.map(([i, j]) => [siteAtVertex[i], siteAtVertex[j]]);

function pushOutOfSites(p) {
  for (const s of SITES) {
    const lim = s.core + 0.025;
    const a = angleBetween(p, s.n);
    if (a < lim) {
      let t = p.clone().addScaledVector(s.n, -p.dot(s.n));
      if (t.lengthSq() < 1e-8) t = s.frame.r.clone();
      t.normalize();
      p.copy(moveAlong(s.n, t, lim));
    }
  }
  return p;
}
export function arcPoints(a, b, step = 0.02) {
  const ang = angleBetween(a, b); const n = Math.max(2, Math.ceil(ang / step));
  const out = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n; const sa = Math.sin(ang) || 1e-6;
    out.push(a.clone().multiplyScalar(Math.sin((1 - t) * ang) / sa).add(b.clone().multiplyScalar(Math.sin(t * ang) / sa)).normalize());
  }
  return out;
}
export function relaxPath(pts) {
  for (let it = 0; it < 6; it++) {
    for (let i = 1; i < pts.length - 1; i++) {
      const avg = pts[i - 1].clone().add(pts[i + 1]).multiplyScalar(0.5).normalize();
      pts[i].lerp(avg, 0.5).normalize();
      pushOutOfSites(pts[i]);
    }
  }
  return pts;
}
// a gentle meander keeps the trail from looking ruler-straight
function meander(pts, seed) {
  const n = pts.length;
  return pts.map((p, k) => {
    if (k === 0 || k === n - 1) return p;
    const t = k / (n - 1);
    const next = pts[Math.min(n - 1, k + 1)], prev = pts[Math.max(0, k - 1)];
    const dir = next.clone().sub(prev); const side = new THREE.Vector3().crossVectors(p, dir).normalize();
    const amp = 0.03 * Math.sin(t * Math.PI) * Math.sin(t * Math.PI * 2 + seed);
    return pushOutOfSites(p.clone().addScaledVector(side, amp).normalize());
  });
}
export const EDGE_PATHS = EDGES.map(([i, j], k) => {
  const pts = arcPoints(SITES[i].stand, SITES[j].stand).map((p, q, arr) => (q === 0 || q === arr.length - 1) ? p : pushOutOfSites(p));
  return { i, j, pts: meander(relaxPath(pts), k * 1.3) };
});

export function findRoute(fromIdx, toIdx) {
  const dist = SITES.map(() => Infinity), prev = SITES.map(() => -1), done = SITES.map(() => false);
  dist[fromIdx] = 0;
  for (;;) {
    let u = -1;
    for (let k = 0; k < SITES.length; k++) if (!done[k] && (u < 0 || dist[k] < dist[u])) u = k;
    if (u < 0 || dist[u] === Infinity) break;
    done[u] = true; if (u === toIdx) break;
    for (const e of EDGE_PATHS) {
      const v = e.i === u ? e.j : e.j === u ? e.i : -1; if (v < 0) continue;
      const len = e.pts.length;
      if (dist[u] + len < dist[v]) { dist[v] = dist[u] + len; prev[v] = u; }
    }
  }
  const chain = []; for (let v = toIdx; v >= 0; v = prev[v]) chain.unshift(v);
  const pts = [];
  for (let k = 0; k < chain.length - 1; k++) {
    const a = chain[k], b = chain[k + 1];
    const e = EDGE_PATHS.find(e => (e.i === a && e.j === b) || (e.i === b && e.j === a));
    const seg = e.i === a ? e.pts : [...e.pts].reverse();
    pts.push(...(k ? seg.slice(1) : seg));
  }
  return pts;
}

// ---------- spatial helpers ----------
export class DirectionHash {
  constructor(cell = 0.06) { this.cell = cell; this.map = new Map(); }
  key(x, y, z) { return Math.floor(x / this.cell) + ',' + Math.floor(y / this.cell) + ',' + Math.floor(z / this.cell); }
  add(p, data) { const k = this.key(p.x, p.y, p.z); if (!this.map.has(k)) this.map.set(k, []); this.map.get(k).push({ p, data }); }
  nearest(p, maxDist) {
    const c = this.cell, r = Math.ceil(maxDist / c);
    const cx = Math.floor(p.x / c), cy = Math.floor(p.y / c), cz = Math.floor(p.z / c);
    let best = maxDist, item = null;
    for (let x = cx - r; x <= cx + r; x++) for (let y = cy - r; y <= cy + r; y++) for (let z = cz - r; z <= cz + r; z++) {
      const list = this.map.get(x + ',' + y + ',' + z); if (!list) continue;
      for (const it of list) { const dd = it.p.distanceTo(p); if (dd < best) { best = dd; item = it; } }
    }
    return { dist: best, item };
  }
}
export const PATH_HASH = new DirectionHash(0.05);
for (const e of EDGE_PATHS) for (const p of e.pts) PATH_HASH.add(p, e);

export function nearestSiteAngle(d, small = false) {
  let best = Infinity, site = null;
  for (const s of SITES) { const a = angleBetween(d, s.n) - (small ? s.clearR : s.core); if (a < best) { best = a; site = s; } }
  return { gap: best, site };
}

export function stats(samples = 20000) {
  let ocean = 0, lake = 0;
  for (const d of fibonacciSphere(samples)) {
    const h = heightAt(d);
    const lk = lakeCoords(d);
    if (lk.u < 2.2 && h < LAKE_LEVEL) lake++; else if (h < 0) ocean++;
  }
  const area = 4 * Math.PI * R * R;
  const buildings = SITES.filter(s => s.kind === 'building').reduce((a, s) => a + s.footprint, 0);
  return { ocean: ocean / samples, lake: lake / samples, buildingShare: buildings / area, trailEdges: EDGES.length };
}