// director — 复古电影摄影机 on a short chunky tripod (prop for 《镜头之外》)
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { G, mat, gloss, glow, metal, mesh, group, canvasTexture, glowSprite, finalize } from './kit.js';

let M = null;
function materials() {
  if (M) return M;
  const decalTex = canvasTexture(256, 192, (g, w, h) => {
    g.fillStyle = '#f8ebca'; g.fillRect(0, 0, w, h);
    g.save(); g.beginPath(); g.rect(0, 0, w, 46); g.clip();
    const n = 6, bw = w / n;
    for (let i = -1; i <= n; i++) {
      g.fillStyle = '#5b3a2b';
      g.beginPath(); g.moveTo(i * bw, 0); g.lineTo(i * bw + bw * 0.52, 0); g.lineTo(i * bw + bw * 0.52 - 26, 46); g.lineTo(i * bw - 26, 46); g.closePath(); g.fill();
    }
    g.restore();
    g.fillStyle = '#ef8b3c'; g.fillRect(0, 46, w, 5);
    g.fillStyle = 'rgba(91,58,43,0.82)';
    g.fillRect(22, 74, 104, 9); g.fillRect(22, 94, 150, 7); g.fillRect(22, 112, 120, 7);
    g.fillStyle = '#ef8b3c'; g.beginPath(); g.arc(w - 40, 106, 17, 0, 7); g.fill();
    g.fillStyle = 'rgba(255,252,240,0.92)'; g.beginPath(); g.arc(w - 40, 106, 6.5, 0, 7); g.fill();
    g.strokeStyle = 'rgba(91,58,43,0.4)'; g.lineWidth = 6; g.strokeRect(3, 3, w - 6, h - 6);
  });
  M = {
    cream: gloss(0xf4dfb4, { roughness: 0.42, clearcoat: 0.45 }),
    butter: mat(0xfbf0d4, { roughness: 0.6 }),
    brown: mat(0x5b3a2b, { roughness: 0.5 }),
    brass: metal(0xd6a355, 0.3),
    dark: mat(0x332e2b, { roughness: 0.82 }),
    orange: mat(0xef8b3c, { roughness: 0.55 }),
    glass: glow(0xa6e6ff, 0.7, { roughness: 0.15, metalness: 0.25, transparent: true, opacity: 0.9 }),
    decal: mat(0xffffff, { map: decalTex, roughness: 0.62 }),
  };
  return M;
}

function prep(g) {
  g = g.index ? g.toNonIndexed() : g;
  if (!g.attributes.normal) g.computeVertexNormals();
  if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
  for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k);
  return g;
}

// one spoked film reel, axis +Z, as a single merged geometry
function reelGeometry(R, tube) {
  const parts = [];
  const add = g => parts.push(prep(g));
  add(G.torus(R, tube, 6, 24));
  add(G.torus(R * 0.60, 0.008, 4, 22));
  for (let i = 0; i < 6; i++) {
    const b = G.cyl(0.0105, 0.0105, R * 1.84, 8);
    b.rotateZ(i / 6 * Math.PI * 2);
    add(b);
  }
  const hub = G.cyl(0.046, 0.046, 0.07, 16); hub.rotateX(Math.PI / 2); add(hub);
  return mergeGeometries(parts, false);
}

export function build() {
  const m = materials();
  const root = new THREE.Group();
  const anim = { reels: [], glass: null, halo: null };

  // ---------------- chunky tripod ----------------
  const HUB_Y = 0.40, FOOT_R = 0.214;
  mesh(G.cyl(0.062, 0.078, 0.056, 20), m.brass, { parent: root, pos: [0, HUB_Y - 0.018, 0] });
  mesh(G.sphere(0.062, 18, 12), m.brass, { parent: root, pos: [0, HUB_Y + 0.02, 0], scale: [1, 0.6, 1] });
  mesh(G.torus(0.064, 0.008, 4, 20), m.orange, { parent: root, pos: [0, HUB_Y - 0.046, 0], rot: [Math.PI / 2, 0, 0] });
  for (const deg of [30, 150, 270]) {
    const a = deg * Math.PI / 180;
    const top = new THREE.Vector3(Math.cos(a) * 0.04, HUB_Y - 0.02, Math.sin(a) * 0.04);
    const foot = new THREE.Vector3(Math.cos(a) * FOOT_R, 0.062, Math.sin(a) * FOOT_R);
    const v = foot.clone().sub(top); const L = v.length();
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), v.clone().normalize());
    const leg = mesh(G.cyl(0.036, 0.026, L, 14), m.brown, { parent: root });
    leg.position.copy(top).add(foot).multiplyScalar(0.5); leg.quaternion.copy(q);
    for (const [f, rr, hh] of [[0.13, 0.043, 0.058], [0.60, 0.038, 0.03]]) {
      const c = top.clone().add(v.clone().multiplyScalar(f));
      const k = mesh(G.cyl(rr, rr, hh, 14), m.brass, { parent: root, pos: [c.x, c.y, c.z] });
      k.quaternion.copy(q);
    }
    mesh(G.cyl(0.043, 0.04, 0.024, 14), m.brass, { parent: root, pos: [foot.x, 0.05, foot.z] });
    mesh(G.cyl(0.046, 0.043, 0.018, 14), m.dark, { parent: root, pos: [foot.x, 0.029, foot.z] });
    mesh(G.sphere(0.038, 14, 10), m.dark, { parent: root, pos: [foot.x, 0.02, foot.z], scale: [1, 0.52, 1] });
    mesh(G.cyl(0.011, 0.011, 0.12, 6), m.brass, { parent: root, pos: [Math.cos(a) * 0.085, HUB_Y - 0.055, Math.sin(a) * 0.085], rot: [Math.sin(a) * 0.9, 0, -Math.cos(a) * 0.9] });
  }

  // ---------------- camera body ----------------
  const BODY_Y = 0.50;
  mesh(G.cyl(0.112, 0.122, 0.026, 22), m.brass, { parent: root, pos: [0, 0.434, 0] });
  mesh(G.box(0.36, 0.155, 0.245, 0.052, 3), m.cream, { parent: root, pos: [0, BODY_Y, 0] });
  mesh(G.box(0.32, 0.128, 0.024, 0.044, 2), m.butter, { parent: root, pos: [0, BODY_Y - 0.004, 0.122] });
  mesh(G.box(0.33, 0.044, 0.232, 0.016, 2), m.butter, { parent: root, pos: [0, 0.574, 0] });
  mesh(G.box(0.40, 0.026, 0.15, 0.011, 2), m.cream, { parent: root, pos: [0, 0.598, 0.01] });
  for (const s of [-1, 1]) mesh(G.box(0.012, 0.10, 0.185, 0.005), m.butter, { parent: root, pos: [s * 0.178, BODY_Y, -0.005] });
  for (const s of [-1, 1]) mesh(G.box(0.362, 0.011, 0.006, 0.004), m.brass, { parent: root, pos: [0, 0.439, s * 0.120] });

  // ---------------- two big dark-brown film reels (face +Z, slowly turning) ----------------
  const R = 0.178, reelGeo = reelGeometry(R, 0.0145);
  for (const s of [-1, 1]) {
    const x = s * 0.155;
    mesh(G.cyl(0.02, 0.024, 0.06, 12), m.brass, { parent: root, pos: [x, 0.628, -0.01] });
    const wheel = mesh(reelGeo, m.brown, { parent: root, pos: [x, 0.788, 0.0], dynamic: true });
    anim.reels.push({ wheel, dir: s });
    mesh(G.cyl(0.028, 0.028, 0.024, 14), m.brass, { parent: root, pos: [x, 0.788, 0.032], rot: [Math.PI / 2, 0, 0] });
    mesh(G.sphere(0.014, 12, 10), m.orange, { parent: root, pos: [x, 0.788, 0.045] });
  }

  // ---------------- brass lens barrel (+Z) with glass ----------------
  const LY = 0.492;
  mesh(G.cyl(0.098, 0.106, 0.026, 24), m.brass, { parent: root, pos: [0, LY, 0.118] });   // mount flange
  mesh(G.cyl(0.088, 0.094, 0.02, 24), m.brass, { parent: root, pos: [0, LY, 0.146] });
  mesh(G.cyl(0.078, 0.088, 0.062, 26), m.brass, { parent: root, pos: [0, LY, 0.178] });        // barrel
  mesh(G.cyl(0.089, 0.089, 0.014, 26), m.orange, { parent: root, pos: [0, LY, 0.172] });       // focus ring
  mesh(G.cyl(0.084, 0.088, 0.02, 26), m.brass, { parent: root, pos: [0, LY, 0.212] });         // front hood
  mesh(G.cyl(0.072, 0.072, 0.008, 24), m.dark, { parent: root, pos: [0, LY, 0.224] });
  anim.glass = mesh(G.sphere(0.062, 22, 14), m.glass, { parent: root, pos: [0, LY, 0.220], scale: [1, 1, 0.42] });
  anim.halo = glowSprite(0xffd9a8, 0.06, 0.55); anim.halo.position.set(0, LY, 0.232); root.add(anim.halo);

  // ---------------- clapperboard side decal ----------------
  mesh(G.box(0.008, 0.14, 0.212, 0.004), m.butter, { parent: root, pos: [0.1835, 0.505, -0.012] });
  mesh(new THREE.PlaneGeometry(0.20, 0.124), m.decal, { parent: root, pos: [0.1878, 0.505, -0.012], rot: [0, Math.PI / 2, 0] });

  // ---------------- knobs + orange accents ----------------
  for (const [z, r] of [[-0.072, 0.025], [0.052, 0.02]]) {
    mesh(G.cyl(r, r, 0.034, 16), m.brass, { parent: root, pos: [-0.194, 0.523, z], rot: [0, 0, Math.PI / 2] });
    mesh(G.cyl(r * 0.5, r * 0.5, 0.012, 12), m.orange, { parent: root, pos: [-0.212, 0.523, z], rot: [0, 0, Math.PI / 2] });
  }
  mesh(G.cyl(0.018, 0.018, 0.014, 14), m.orange, { parent: root, pos: [-0.095, 0.588, 0.062] });
  mesh(G.cyl(0.028, 0.026, 0.013, 16), m.brass, { parent: root, pos: [0.112, 0.588, -0.05] });
  mesh(G.cyl(0.034, 0.034, 0.02, 18), m.brass, { parent: root, pos: [-0.152, 0.578, -0.105] });

  // ---------------- viewfinder at the back ----------------
  mesh(G.box(0.10, 0.086, 0.094, 0.02, 2), m.brown, { parent: root, pos: [0.09, 0.632, -0.150] });
  mesh(G.sphere(0.026, 16, 12), m.glass, { parent: root, pos: [0.09, 0.637, -0.100], scale: [1, 1, 0.4] });
  mesh(G.cyl(0.026, 0.03, 0.066, 16), m.brown, { parent: root, pos: [0.09, 0.632, -0.220], rot: [Math.PI / 2, 0, 0] });
  mesh(G.torus(0.031, 0.009, 6, 16), m.dark, { parent: root, pos: [0.09, 0.632, -0.250] });
  mesh(G.box(0.028, 0.046, 0.018, 0.007), m.brass, { parent: root, pos: [0.09, 0.596, -0.122] });
  mesh(G.box(0.115, 0.036, 0.007, 0.004), m.brass, { parent: root, pos: [-0.055, 0.488, -0.125] });
  mesh(G.cyl(0.026, 0.024, 0.012, 14), m.orange, { parent: root, pos: [0.145, 0.545, 0.108] });

  finalize(root);
  return {
    group: root,
    update(t) {
      anim.reels.forEach(({ wheel, dir }, i) => { wheel.rotation.z = dir * t * (0.6 + i * 0.1); });
      if (anim.glass) anim.glass.material.emissiveIntensity = 0.62 + Math.sin(t * 1.7) * 0.1;
      if (anim.halo) anim.halo.material.opacity = 0.4 + Math.sin(t * 1.7) * 0.07;
    },
  };
}
