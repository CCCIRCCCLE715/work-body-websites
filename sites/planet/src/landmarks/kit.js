// Shared modelling kit for code-built landmarks (no external GLB).
// Conventions: model units, base at y = 0, front faces +Z, the landmark's half extents are given in data.js "bounds".
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

// ---------- materials ----------
const matCache = new Map();
/** Clay / soft-vinyl look by default. Same arguments return the same shared material. */
export function mat(color, o = {}) {
  const key = String(color) + JSON.stringify(o, (k, v) => (v && v.isTexture ? v.uuid : v));
  if (!matCache.has(key)) matCache.set(key, new THREE.MeshStandardMaterial({ color, roughness: 0.6, metalness: 0, ...o }));
  return matCache.get(key);
}
/** Glossy lacquer / glaze (uses clearcoat). */
export function gloss(color, o = {}) {
  const key = 'gloss' + String(color) + JSON.stringify(o, (k, v) => (v && v.isTexture ? v.uuid : v));
  if (!matCache.has(key)) matCache.set(key, new THREE.MeshPhysicalMaterial({ color, roughness: 0.32, metalness: 0, clearcoat: 0.8, clearcoatRoughness: 0.25, ...o }));
  return matCache.get(key);
}
/** Self-lit parts: bulbs, screens, lanterns, crystal cores. */
export function glow(color, intensity = 1.6, o = {}) { return mat(color, { emissive: color, emissiveIntensity: intensity, roughness: 0.4, ...o }); }
/** Metal trim (gold, brass, steel). */
export function metal(color, rough = 0.32) { return mat(color, { metalness: 0.85, roughness: rough }); }

// ---------- geometry ----------
export const G = {
  box: (w, h, d, r = 0.01, seg = 3) => new RoundedBoxGeometry(w, h, d, seg, Math.min(r, Math.min(w, h, d) / 2 - 1e-4)),
  cyl: (rTop, rBot, h, seg = 24, open = false) => new THREE.CylinderGeometry(rTop, rBot, h, seg, 1, open),
  sphere: (r, ws = 24, hs = 16) => new THREE.SphereGeometry(r, ws, hs),
  capsule: (r, len, cap = 6, radial = 16) => new THREE.CapsuleGeometry(r, len, cap, radial),
  torus: (r, tube, rs = 10, ts = 32, arc = Math.PI * 2) => new THREE.TorusGeometry(r, tube, rs, ts, arc),
  cone: (r, h, seg = 24) => new THREE.ConeGeometry(r, h, seg),
  /** points: [[radius, y], ...] from bottom to top */
  lathe: (points, seg = 32) => new THREE.LatheGeometry(points.map(([x, y]) => new THREE.Vector2(x, y)), seg),
  /** rounded extrusion of a 2D shape (THREE.Shape) */
  extrude: (shape, depth, bevel = 0.006, seg = 3) => new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: bevel > 0, bevelSize: bevel, bevelThickness: bevel, bevelSegments: seg, curveSegments: 16 }),
  tube: (points, r, seg = 48, radial = 8, closed = false) => new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p => Array.isArray(p) ? new THREE.Vector3(...p) : p), closed), seg, r, radial, closed),
};
/** Rounded rectangle 2D shape centred at the origin. */
export function roundRect(w, h, r) {
  const s = new THREE.Shape(); const x = -w / 2, y = -h / 2;
  s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r); s.lineTo(x + w, y + h - r);
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h); s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
  return s;
}

/** Create a mesh and optionally parent it. pos/rot/scale are arrays. */
export function mesh(geometry, material, { pos, rot, scale, parent, name, dynamic } = {}) {
  const m = new THREE.Mesh(geometry, material);
  if (pos) m.position.set(...pos);
  if (rot) m.rotation.set(...rot);
  if (scale) Array.isArray(scale) ? m.scale.set(...scale) : m.scale.setScalar(scale);
  if (name) m.name = name;
  if (dynamic) m.userData.dynamic = true;
  if (parent) parent.add(m);
  return m;
}
export function group(parent, { pos, rot, scale, name, dynamic } = {}) {
  const g = new THREE.Group();
  if (pos) g.position.set(...pos);
  if (rot) g.rotation.set(...rot);
  if (scale) Array.isArray(scale) ? g.scale.set(...scale) : g.scale.setScalar(scale);
  if (name) g.name = name;
  if (dynamic) g.userData.dynamic = true;
  if (parent) parent.add(g);
  return g;
}

// ---------- textures ----------
/** Canvas texture: draw(ctx, w, h). Colour textures are sRGB, wrapping repeat, anisotropic. */
export function canvasTexture(w, h, draw, { repeat = [1, 1], srgb = true } = {}) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d'); draw(g, w, h);
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...repeat); t.anisotropy = 8;
  return t;
}
let glowTex = null;
/** Soft additive halo sprite (for bulbs, lanterns, screens). */
export function glowSprite(color = 0xffc070, size = 0.08, opacity = 0.9) {
  if (!glowTex) glowTex = canvasTexture(64, 64, (g) => {
    const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    grd.addColorStop(0, 'rgba(255,255,255,1)'); grd.addColorStop(0.25, 'rgba(255,255,255,0.55)'); grd.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grd; g.fillRect(0, 0, 64, 64);
  });
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity }));
  s.scale.setScalar(size); s.userData.dynamic = true;
  return s;
}

// ---------- finishing ----------
function prepGeometry(g) {
  g = g.clone();
  for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k);
  if (!g.attributes.normal) g.computeVertexNormals();
  if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
  if (!g.index) { const n = g.attributes.position.count; const idx = new (n > 65535 ? Uint32Array : Uint16Array)(n); for (let i = 0; i < n; i++) idx[i] = i; g.setIndex(new THREE.BufferAttribute(idx, 1)); }
  g.morphAttributes = {};
  return g;
}
const isDynamic = o => { for (let p = o; p; p = p.parent) if (p.userData && p.userData.dynamic) return true; return false; };
/**
 * Merge every static mesh that shares a material into one mesh (few draw calls), enable shadows.
 * Objects flagged userData.dynamic (or inside a dynamic group), sprites, lights and instanced meshes are kept as-is.
 */
export function finalize(root, { castShadow = true } = {}) {
  root.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(root.matrixWorld).invert();
  const buckets = new Map(); const remove = [];
  root.traverse(o => {
    if (!o.isMesh || o.isInstancedMesh || isDynamic(o) || Array.isArray(o.material)) return;
    const m = o.material;
    if (!buckets.has(m)) buckets.set(m, []);
    const g = prepGeometry(o.geometry);
    g.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld));
    buckets.get(m).push(g); remove.push(o);
  });
  for (const o of remove) o.parent.remove(o);
  for (const [m, list] of buckets) {
    const merged = mergeGeometries(list, false);
    const mm = new THREE.Mesh(merged, m); mm.name = 'merged';
    root.add(mm);
  }
  root.traverse(o => { if (o.isMesh) { o.castShadow = castShadow && !(o.material && o.material.transparent); o.receiveShadow = true; } });
  return root;
}
export function stats(root) {
  let tris = 0, meshes = 0; const mats = new Set();
  root.traverse(o => { if (o.isMesh) { meshes++; mats.add(o.material); const g = o.geometry; tris += (g.index ? g.index.count : g.attributes.position.count) / 3 * (o.isInstancedMesh ? o.count : 1); } });
  return { tris: Math.round(tris), meshes, materials: mats.size };
}
