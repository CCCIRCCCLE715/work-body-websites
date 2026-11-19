// drama_lead — 短剧卷轴书案: a low jade-lacquer writing desk with an unrolled script scroll.
import * as THREE from 'three';
import { G, mat, gloss, glow, metal, mesh, group, canvasTexture, glowSprite, finalize } from './kit.js';

let M = null;
function materials() {
  if (M) return M;
  // ---- parchment with vertical calligraphy (canvas only) ----
  const paper = canvasTexture(420, 900, (g, w, h) => {
    let seed = 20240718;
    const rnd = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
    const grd = g.createLinearGradient(0, 0, w, h);
    grd.addColorStop(0, '#f8efd6'); grd.addColorStop(0.5, '#f3e7c9'); grd.addColorStop(1, '#f7edd4');
    g.fillStyle = grd; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 220; i++) {
      g.fillStyle = 'rgba(198,168,116,' + (0.015 + rnd() * 0.05).toFixed(3) + ')';
      g.beginPath(); g.arc(rnd() * w, rnd() * h, 4 + rnd() * 26, 0, 7); g.fill();
    }
    const cols = 9, pad = 26, step = (w - pad * 2) / (cols - 1);
    g.strokeStyle = 'rgba(196,168,124,0.30)'; g.lineWidth = 1.4;
    for (let c = 0; c < cols; c++) { const x = pad + c * step; g.beginPath(); g.moveTo(x, 18); g.lineTo(x, h - 18); g.stroke(); }
    const glyph = (cx, cy, s) => {
      g.strokeStyle = 'rgba(38,32,28,0.86)'; g.lineCap = 'round';
      const n = 3 + Math.floor(rnd() * 4);
      for (let i = 0; i < n; i++) {
        g.lineWidth = s * (0.07 + rnd() * 0.05);
        g.beginPath();
        if (rnd() < 0.55) { const yy = cy - s * 0.34 + rnd() * s * 0.68; g.moveTo(cx - s * (0.16 + rnd() * 0.2), yy); g.lineTo(cx + s * (0.16 + rnd() * 0.2), yy + (rnd() - 0.5) * s * 0.06); }
        else { const xx = cx - s * 0.34 + rnd() * s * 0.68; g.moveTo(xx, cy - s * (0.16 + rnd() * 0.2)); g.lineTo(xx + (rnd() - 0.5) * s * 0.06, cy + s * (0.16 + rnd() * 0.2)); }
        g.stroke();
      }
      if (rnd() < 0.5) { g.fillStyle = 'rgba(38,32,28,0.8)'; g.beginPath(); g.arc(cx + (rnd() - 0.5) * s * 0.4, cy + (rnd() - 0.5) * s * 0.4, s * 0.045, 0, 7); g.fill(); }
    };
    const cell = 46;
    for (let c = 0; c < cols; c++) for (let cY = 0; cY < Math.ceil(h / cell); cY++) {
      if (c > 6 && cY > 6) continue;
      glyph(pad + c * step, 44 + cY * cell, 34);
    }
    // red seal + a small signature block near the top
    g.fillStyle = '#c0402f'; g.beginPath();
    const sx = pad + step * (cols - 1) - 20, sy = 62;
    g.roundRect ? (g.beginPath(), g.roundRect(sx - 17, sy - 17, 34, 34, 5), g.fill()) : g.fillRect(sx - 17, sy - 17, 34, 34);
    g.strokeStyle = 'rgba(255,240,225,0.85)'; g.lineWidth = 2.2;
    g.beginPath(); g.moveTo(sx - 7, sy - 8); g.lineTo(sx + 7, sy - 8); g.moveTo(sx, sy - 8); g.lineTo(sx, sy + 9); g.moveTo(sx - 8, sy + 2); g.lineTo(sx + 8, sy + 2); g.stroke();
    // top roller shadow band
    const sh = g.createLinearGradient(0, 0, 0, 60); sh.addColorStop(0, 'rgba(120,95,60,0.34)'); sh.addColorStop(1, 'rgba(120,95,60,0)');
    g.fillStyle = sh; g.fillRect(0, 0, w, 60);
  });
  M = {
    jade: gloss(0x63b491, { roughness: 0.24, clearcoat: 0.9, clearcoatRoughness: 0.18 }),
    jadeD: gloss(0x38755c, { roughness: 0.3, clearcoat: 0.8 }),
    gold: metal(0xd9b25a, 0.28),
    wood: mat(0xa9764c, { roughness: 0.72 }),
    paper: mat(0xffffff, { map: paper, roughness: 0.94, side: THREE.DoubleSide }),
    ink: mat(0x2b2622, { roughness: 0.42 }),
    cream: gloss(0xf7efd9, { roughness: 0.3, clearcoat: 0.5 }),
    red: mat(0xc0402f, { roughness: 0.55 }),
  };
  return M;
}

// a ribbon following a (z,y) path, width across X, UV v from start to end
function ribbon(pts, width, rows = 70, cols = 5) {
  const curve = new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(0, p[1], p[0])));
  const pos = [], uv = [], ind = [];
  for (let i = 0; i <= rows; i++) {
    const v = i / rows, p = curve.getPointAt(v), half = width / 2;
    for (let j = 0; j <= cols; j++) { const u = j / cols; pos.push(-half + u * width, p.y, p.z); uv.push(u, v); }
  }
  for (let i = 0; i < rows; i++) for (let j = 0; j < cols; j++) {
    const a = i * (cols + 1) + j, b = a + 1, c = a + cols + 1, d = c + 1;
    ind.push(a, c, b, b, c, d);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(ind); g.computeVertexNormals();
  return g;
}

export function build() {
  const m = materials();
  const root = new THREE.Group();
  const anim = { tail: null, steam: [], seal: null };
  const TOP = 0.455;

  // ---------------- desk body ----------------
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const x = sx * 0.405, z = sz * 0.19;
    mesh(G.box(0.092, 0.34, 0.092, 0.022, 1), m.jade, { parent: root, pos: [x, 0.212, z] });
    mesh(G.box(0.098, 0.012, 0.098, 0.004, 1), m.gold, { parent: root, pos: [x, 0.30, z] });
    mesh(G.box(0.098, 0.012, 0.098, 0.004, 1), m.gold, { parent: root, pos: [x, 0.135, z] });
    mesh(G.cyl(0.058, 0.064, 0.028, 14), m.gold, { parent: root, pos: [x, 0.018, z] });
    mesh(G.box(0.10, 0.014, 0.10, 0.005, 1), m.gold, { parent: root, pos: [x, 0.098, z] });
  }
  for (const sz of [-1, 1]) mesh(G.box(0.80, 0.026, 0.028, 0.008, 1), m.jadeD, { parent: root, pos: [0, 0.098, sz * 0.19] });
  for (const sx of [-1, 1]) mesh(G.box(0.028, 0.026, 0.36, 0.008, 1), m.jadeD, { parent: root, pos: [sx * 0.405, 0.098, 0] });
  // apron + waist, with carved gold motifs
  mesh(G.box(0.86, 0.042, 0.44, 0.012, 2), m.jadeD, { parent: root, pos: [0, 0.383, 0] });
  mesh(G.box(0.80, 0.05, 0.38, 0.014, 2), m.jadeD, { parent: root, pos: [0, 0.348, 0] });
  for (const sz of [-1, 1]) mesh(G.box(0.80, 0.01, 0.012, 0.004, 1), m.gold, { parent: root, pos: [0, 0.363, sz * 0.19] });
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    mesh(G.torus(0.026, 0.007, 4, 12, Math.PI * 1.4), m.gold, { parent: root, pos: [sx * 0.33, 0.348, sz * 0.192], rot: [0, sz > 0 ? 0 : Math.PI, sz > 0 ? 0 : 0] });
  }
  // top slab + gold edge line
  mesh(G.box(0.98, 0.05, 0.54, 0.02, 3), m.jade, { parent: root, pos: [0, 0.43, 0] });
  mesh(G.box(0.965, 0.009, 0.525, 0.004, 1), m.gold, { parent: root, pos: [0, 0.407, 0] });
  mesh(G.box(0.93, 0.012, 0.50, 0.005, 1), m.jadeD, { parent: root, pos: [0, 0.462, 0] });

  // two carved drawers with gold ring handles on the front
  for (const sx of [-1, 1]) {
    mesh(G.box(0.30, 0.07, 0.018, 0.009, 2), m.jade, { parent: root, pos: [sx * 0.21, 0.356, 0.222] });
    mesh(G.box(0.31, 0.008, 0.008, 0.003, 1), m.gold, { parent: root, pos: [sx * 0.21, 0.392, 0.224] });
    mesh(G.box(0.27, 0.012, 0.006, 0.004, 1), m.jadeD, { parent: root, pos: [sx * 0.21, 0.338, 0.232] });
    mesh(G.torus(0.026, 0.007, 4, 16), m.gold, { parent: root, pos: [sx * 0.21, 0.351, 0.242], rot: [Math.PI / 2, 0, 0] });
    mesh(G.sphere(0.012, 10, 8), m.gold, { parent: root, pos: [sx * 0.21, 0.373, 0.236], scale: [1.5, 1, 0.7] });
  }

  // ---------------- scroll: wooden roller on two carved posts, paper peeling off ----------------
  const RZ = -0.215, RY = 0.622, RR = 0.062;
  for (const sx of [-1, 1]) {
    mesh(G.box(0.058, 0.17, 0.072, 0.012, 2), m.jade, { parent: root, pos: [sx * 0.30, 0.548, RZ] });
    mesh(G.box(0.07, 0.022, 0.086, 0.006, 1), m.jadeD, { parent: root, pos: [sx * 0.30, 0.638, RZ] });
    mesh(G.box(0.076, 0.016, 0.092, 0.005, 1), m.gold, { parent: root, pos: [sx * 0.30, 0.47, RZ] });
  }
  const axle = mesh(G.cyl(0.03, 0.03, 0.63, 14), m.wood, { parent: root, pos: [0, RY, RZ], rot: [0, 0, Math.PI / 2] });
  for (const sx of [-1, 1]) {
    mesh(G.cyl(0.038, 0.038, 0.03, 14), m.gold, { parent: root, pos: [sx * 0.322, RY, RZ], rot: [0, 0, Math.PI / 2] });
    mesh(G.sphere(0.026, 12, 10), m.wood, { parent: root, pos: [sx * 0.342, RY, RZ] });
  }
  // the sheet: wraps the roller from the back-top, down its front, then sweeps onto the desk and over the front edge
  const W = 0.46;
  const path = [];
  const arc = (deg) => { const a = deg * Math.PI / 180; path.push([RZ + RR * Math.cos(a), RY + RR * Math.sin(a)]); };
  [200, 175, 150, 125, 100, 78, 56, 34, 12, -8].forEach(arc);
  [[-0.152, 0.578], [-0.138, 0.532], [-0.108, 0.496], [-0.052, 0.471], [0.022, 0.4615], [0.108, 0.4578], [0.190, 0.4566], [0.246, 0.4558], [0.268, 0.446]]
    .forEach(p => path.push(p));
  mesh(ribbon(path, W, 58, 5), m.paper, { parent: root });
  // silk tie + hanging cord on the rolled end
  mesh(G.torus(RR + 0.012, 0.0075, 4, 16), m.red, { parent: root, pos: [0.213, RY, RZ], rot: [0, Math.PI / 2, 0] });
  mesh(G.cyl(0.006, 0.006, 0.05, 6), m.red, { parent: root, pos: [0.213, RY - 0.06, RZ + 0.012] });
  mesh(G.sphere(0.011, 10, 8), m.red, { parent: root, pos: [0.213, RY - 0.088, RZ + 0.012] });

  // fluttering tip of the scroll, hanging over the desk edge
  const tailGeo = ribbon([[0, 0], [0.014, -0.032], [0.035, -0.058], [0.058, -0.076], [0.076, -0.088]], 0.30, 16, 4);
  anim.tail = mesh(tailGeo, m.paper, { parent: root, pos: [0.028, 0.448, 0.250], dynamic: true });

  // ---------------- brush holder with brushes ----------------
  const BH = [-0.35, TOP, -0.10];
  mesh(G.cyl(0.05, 0.054, 0.115, 16), m.jade, { parent: root, pos: [BH[0], TOP + 0.058, BH[2]] });
  mesh(G.torus(0.05, 0.008, 4, 16), m.gold, { parent: root, pos: [BH[0], TOP + 0.114, BH[2]], rot: [Math.PI / 2, 0, 0] });
  mesh(G.cyl(0.03, 0.03, 0.012, 12), m.ink, { parent: root, pos: [BH[0], TOP + 0.112, BH[2]] });
  for (let i = 0; i < 4; i++) {
    const a = i * 1.9 + 0.4, tilt = 0.12 + (i % 2) * 0.08, hh = 0.118 - (i % 3) * 0.014;
    const bx = BH[0] + Math.cos(a) * 0.024, bz = BH[2] + Math.sin(a) * 0.024;
    const rot = [Math.sin(a) * tilt, 0, -Math.cos(a) * tilt];
    // bamboo handle band
    mesh(G.cyl(0.0135, 0.0145, hh, 8), m.wood, { parent: root, pos: [bx + Math.cos(a) * tilt * hh * 0.5, TOP + 0.108 + hh * 0.45, bz + Math.sin(a) * tilt * hh * 0.5], rot });
    mesh(G.cyl(0.0155, 0.0155, 0.012, 8), m.gold, { parent: root, pos: [bx + Math.cos(a) * tilt * hh * 0.62, TOP + 0.108 + hh * 0.62, bz + Math.sin(a) * tilt * hh * 0.62], rot });
    mesh(G.cyl(0.0125, 0.0145, 0.018, 8), m.cream, { parent: root, pos: [bx + Math.cos(a) * tilt * hh * 1.02, TOP + 0.108 + hh * 1.0, bz + Math.sin(a) * tilt * hh * 1.02], rot });
    const tip = mesh(G.cone(0.0115, 0.05, 8), m.ink, { parent: root, pos: [bx + Math.cos(a) * tilt * hh * 1.16, TOP + 0.108 + hh * 1.12, bz + Math.sin(a) * tilt * hh * 1.16], rot: [Math.PI + Math.sin(a) * tilt, 0, -Math.cos(a) * tilt] });
  }

  // ---------------- ink stone + ink stick ----------------
  const I = [0.335, TOP, -0.115];
  mesh(G.box(0.145, 0.03, 0.105, 0.012, 2), m.ink, { parent: root, pos: [I[0], TOP + 0.015, I[2]] });
  mesh(G.cyl(0.036, 0.036, 0.012, 16), m.ink, { parent: root, pos: [I[0] - 0.02, TOP + 0.026, I[2]], scale: [1.15, 1, 0.85] });
  mesh(G.torus(0.037, 0.004, 4, 16), m.gold, { parent: root, pos: [I[0] - 0.02, TOP + 0.032, I[2]], rot: [Math.PI / 2, 0, 0], scale: [1.15, 0.85, 1] });
  const stick = mesh(G.box(0.05, 0.018, 0.014, 0.004, 1), m.ink, { parent: root, pos: [I[0] + 0.045, TOP + 0.045, I[2] + 0.02] });
  stick.rotation.set(0.1, 0.5, -0.55);

  // ---------------- stack of thread-bound books ----------------
  const B = [0.335, TOP, 0.115];
  for (let i = 0; i < 3; i++) {
    const y = TOP + 0.011 + i * 0.023, rot = (i - 1) * 0.07;
    const b = group(root, { pos: [B[0], y, B[2]], rot: [0, rot, 0] });
    mesh(G.box(0.17, 0.019, 0.125, 0.004, 1), m.cream, { parent: b });
    mesh(G.box(0.174, 0.007, 0.129, 0.003, 1), m.jade, { parent: b, pos: [0, 0.011, 0] });
    for (let k = 0; k < 3; k++) mesh(G.sphere(0.006, 6, 4), m.gold, { parent: b, pos: [-0.079, 0.008, -0.038 + k * 0.038] });
  }

  // ---------------- teacup on a saucer ----------------
  const C = [-0.375, TOP, 0.20];
  mesh(G.cyl(0.072, 0.066, 0.01, 18), m.jade, { parent: root, pos: [C[0], TOP + 0.005, C[2]] });
  mesh(G.cyl(0.021, 0.05, 0.062, 18), m.cream, { parent: root, pos: [C[0], TOP + 0.04, C[2]] });
  mesh(G.torus(0.05, 0.007, 4, 18), m.cream, { parent: root, pos: [C[0], TOP + 0.07, C[2]], rot: [Math.PI / 2, 0, 0] });
  mesh(G.cyl(0.044, 0.044, 0.005, 16), m.jadeD, { parent: root, pos: [C[0], TOP + 0.064, C[2]] });
  mesh(G.torus(0.016, 0.005, 4, 10, Math.PI), m.cream, { parent: root, pos: [C[0] + 0.056, TOP + 0.042, C[2]], rot: [0, 0, -0.5] });
  mesh(G.torus(0.048, 0.0035, 4, 18), m.gold, { parent: root, pos: [C[0], TOP + 0.062, C[2]], rot: [Math.PI / 2, 0, 0] });
  for (let i = 0; i < 3; i++) { const s = glowSprite(0xfff4e2, 0.055, 0.22); s.position.set(C[0], TOP + 0.1 + i * 0.03, C[2]); root.add(s); anim.steam.push({ s, i, x: C[0], z: C[2] }); }

  // ---------------- tiny clapboard: the short-drama hint ----------------
  const CL = group(root, { pos: [0.30, TOP, 0.247], rot: [-0.24, -0.34, 0] });
  mesh(G.box(0.135, 0.10, 0.014, 0.008, 2), m.cream, { parent: CL, pos: [0, 0.055, 0] });
  mesh(G.box(0.135, 0.026, 0.016, 0.005, 1), m.ink, { parent: CL, pos: [0, 0.118, 0], rot: [0, 0, 0.06] });
  for (let i = 0; i < 4; i++) mesh(G.box(0.021, 0.03, 0.018, 0.004, 1), m.cream, { parent: CL, pos: [-0.048 + i * 0.032, 0.118, 0.002], rot: [0, 0, 0.06] });
  mesh(G.box(0.10, 0.012, 0.018, 0.004, 1), m.ink, { parent: CL, pos: [0, 0.082, 0.002] });
  mesh(G.box(0.056, 0.008, 0.017, 0.003, 1), m.red, { parent: CL, pos: [-0.03, 0.048, 0.002] });
  mesh(G.cyl(0.008, 0.008, 0.02, 8), m.gold, { parent: CL, pos: [0.062, 0.104, 0], rot: [Math.PI / 2, 0, 0] });

  finalize(root);
  return {
    group: root,
    update(t) {
      if (anim.tail) {
        anim.tail.rotation.x = Math.sin(t * 1.35) * 0.055 + Math.sin(t * 2.9) * 0.012;
        anim.tail.rotation.z = Math.sin(t * 0.9 + 1) * 0.03;
      }
      anim.steam.forEach(({ s, i, x, z }) => {
        const p = ((t * 0.24 + i / 3) % 1);
        s.position.set(x + Math.sin(t * 1.3 + i * 2) * 0.012, TOP + 0.095 + p * 0.115, z);
        s.scale.setScalar(0.028 + p * 0.06); s.material.opacity = 0.24 * (1 - p);
      });
    },
  };
}
