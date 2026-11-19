// 听雨亭 — 古代凉亭：hexagonal Chinese garden pavilion, sage glazed roof, vermilion columns.
import * as THREE from 'three';
import { G, mat, gloss, glow, metal, mesh, group, canvasTexture, glowSprite, finalize } from './kit.js';

const C30 = Math.cos(Math.PI / 6);
const H = Math.PI / 3;
const colAng = (k) => H * k + Math.PI / 6;      // hexagon vertices = columns = roof corners

// ---- key dimensions (model units, base y = 0) ----
const FLOOR = 0.077;
const R_COL = 0.365, AP_COL = R_COL * C30;      // 0.316
const R_PLAT = 0.420, AP_PLAT = R_PLAT * C30;   // 0.364
const BEAM_Y = 0.555, BEAM_H = 0.044;           // 0.555 .. 0.599
const BRK_TOP = 0.652;
const ROOF_AP = 0.395, ROOF_DROP = 0.20, ROOF_LIFT = 0.068, ROOF_FLARE = 0.032;
const APEX_Y = 0.848;
const STEP_Z = 0.4285;

/** cheap rounded box: bevel only where it actually reads at this scale */
const plainBox = (w, h, d) => new THREE.BoxGeometry(w, h, d);
function bx(w, h, d, r = 0.006) {
  const md = Math.min(w, h, d);
  return md > 0.055 ? G.box(w, h, d, r, 1) : plainBox(w, h, d);
}
const sph = (r, a = 10, b = 7) => G.sphere(r, a, b);

// ================= materials =================
let M = null;
function materials() {
  if (M) return M;
  const tile = canvasTexture(512, 512, (g, w, h) => {
    const base = g.createLinearGradient(0, 0, 0, h);
    base.addColorStop(0, '#93d7b4'); base.addColorStop(0.55, '#7cc9a5'); base.addColorStop(1, '#6dbd97');
    g.fillStyle = base; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 8; i++) {                       // 瓦垄: rounded tile rolls running down-slope
      const x = i * 64 + 32;
      const sh = g.createLinearGradient(x - 20, 0, x + 20, 0);
      sh.addColorStop(0, 'rgba(40,96,74,0.05)'); sh.addColorStop(0.42, 'rgba(38,92,70,0.34)');
      sh.addColorStop(0.62, 'rgba(255,255,255,0.30)'); sh.addColorStop(1, 'rgba(40,96,74,0.05)');
      g.fillStyle = sh; g.fillRect(x - 20, 0, 40, h);
      g.fillStyle = 'rgba(226,255,242,0.55)'; g.fillRect(x + 3, 0, 3.5, h);
      g.fillStyle = 'rgba(32,80,60,0.30)'; g.fillRect(x - 5, 0, 4, h);
    }
    for (let j = 0; j < 16; j++) {                      // tile courses
      const y = j * 32 + 6;
      g.fillStyle = 'rgba(36,86,66,0.30)'; g.fillRect(0, y, w, 4.5);
      g.fillStyle = 'rgba(228,255,244,0.42)'; g.fillRect(0, y + 4.5, w, 3);
      g.fillStyle = 'rgba(255,255,255,0.10)'; g.fillRect(0, y + 7.5, w, 6);
    }
  });
  const plaque = canvasTexture(512, 180, (g, w, h) => {
    const bg = g.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0, '#2c2620'); bg.addColorStop(0.5, '#3b3128'); bg.addColorStop(1, '#241e18');
    g.fillStyle = bg; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#e9c46a'; g.lineWidth = 12; g.strokeRect(8, 8, w - 16, h - 16);
    g.strokeStyle = '#a97f33'; g.lineWidth = 3; g.strokeRect(26, 26, w - 52, h - 52);
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = 'bold 108px "Songti SC","STSong","Hiragino Mincho ProN",serif';
    g.fillStyle = 'rgba(90,50,10,0.85)'; g.fillText('听雨亭', w / 2 - 8, h / 2 + 8);
    g.fillStyle = '#ffd977'; g.fillText('听雨亭', w / 2 - 10, h / 2 + 4);
    g.fillStyle = 'rgba(255,255,235,0.42)'; g.fillText('听雨亭', w / 2 - 10, h / 2 - 2);
  });
  const paper = canvasTexture(256, 256, (g, w, h) => {
    const base = g.createLinearGradient(0, 0, 0, h);
    base.addColorStop(0, '#d13c22'); base.addColorStop(0.45, '#e64a25'); base.addColorStop(1, '#c0331d');
    g.fillStyle = base; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 12; i++) {                     // gold ribs
      const x = i * (w / 12);
      const sh = g.createLinearGradient(x - 10, 0, x + 10, 0);
      sh.addColorStop(0, 'rgba(255,190,120,0.06)'); sh.addColorStop(0.5, 'rgba(255,206,140,0.42)'); sh.addColorStop(1, 'rgba(255,190,120,0.06)');
      g.fillStyle = sh; g.fillRect(x - 10, 0, 20, h);
    }
    g.fillStyle = '#e8b957'; g.fillRect(0, 0, w, 0.20 * h);   // top cap band
    g.fillStyle = '#e8b957'; g.fillRect(0, 0.80 * h, w, 0.20 * h); // bottom cap band
    g.fillStyle = '#c8983f'; g.fillRect(0, 0.20 * h, w, 5); g.fillRect(0, 0.80 * h - 5, w, 5);
  });
  M = {
    tile: gloss(0xffffff, { map: tile, roughness: 0.46, clearcoat: 0.35, clearcoatRoughness: 0.45 }),
    jade: gloss(0x5e9d84, { roughness: 0.28, clearcoat: 0.8, clearcoatRoughness: 0.24 }),
    red: gloss(0xc84a3b, { roughness: 0.42, clearcoat: 0.5 }),
    gold: metal(0xd8a942, 0.3),
    stone: mat(0xf2e7cd, { roughness: 0.86 }),
    stoneD: mat(0xdccfb0, { roughness: 0.9 }),
    plaque: mat(0xffffff, { map: plaque, roughness: 0.45 }),
    paper: mat(0xffffff, { map: paper, emissive: 0xff7a3a, emissiveMap: paper, emissiveIntensity: 0.85, roughness: 0.6 }),
  };
  return M;
}

// ================= roof surface =================
function roofP(phi, t, v, radOff = 0, yOff = 0) {
  const w = t * t;
  const rr = ROOF_AP / Math.cos(t * Math.PI / 6);
  const r = rr * v * (1 + ROOF_FLARE * w * v * v * v) + radOff;
  const y = APEX_Y - ROOF_DROP * Math.pow(v, 0.58) + ROOF_LIFT * w * Math.pow(v, 3.2) + yOff;
  return [Math.sin(phi) * r, y, Math.cos(phi) * r];
}
function flipIndex(g) {
  const a = g.index.array;
  for (let i = 0; i < a.length; i += 3) { const t = a[i + 1]; a[i + 1] = a[i + 2]; a[i + 2] = t; }
  g.index.needsUpdate = true;
}
function orient(g, mode) {
  g.computeVertexNormals();
  const p = g.attributes.position, n = g.attributes.normal; let s = 0;
  for (let i = 0; i < n.count; i++) {
    if (mode === 'down') s -= n.getY(i); else s += n.getY(i);
  }
  if (s < 0) flipIndex(g);
  g.computeVertexNormals();
  return g;
}
/** the six curved tiled panels (concave sweep, upturned corners) */
function panelGeos(NU, NV, v0, v1, radOff, yOff) {
  const out = [];
  for (let k = 0; k < 6; k++) {
    const a0 = colAng(k), pos = [], uv = [], idx = [];
    for (let i = 0; i <= NU; i++) {
      const u = i / NU, t = -1 + 2 * u;
      for (let j = 0; j <= NV; j++) {
        const v = v0 + (v1 - v0) * (j / NV);
        const q = roofP(a0 + H * u, t, v, radOff, yOff);
        pos.push(q[0], q[1], q[2]); uv.push(u, (v - v0) / (v1 - v0));
      }
    }
    for (let i = 0; i < NU; i++) for (let j = 0; j < NV; j++) {
      const a = i * (NV + 1) + j, b = a + NV + 1;
      idx.push(a, b, a + 1, b, b + 1, a + 1);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(idx);
    out.push(orient(g, 'up'));
  }
  return out;
}
function hexRing(NU, v, radOff = 0, yOff = 0) {
  const pts = [];
  for (let k = 0; k < 6; k++) {
    const a0 = colAng(k);
    for (let i = 0; i < NU; i++) {
      const u = i / NU, t = -1 + 2 * u;
      pts.push(roofP(a0 + H * u, t, v, radOff, yOff));
    }
  }
  return pts;
}
function stripGeo(A, B, mode) {
  const n = A.length, pos = [], idx = [];
  for (const q of A) pos.push(q[0], q[1], q[2]);
  for (const q of B) pos.push(q[0], q[1], q[2]);
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    idx.push(i, j, n + i, j, n + j, n + i);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  return orient(g, mode);
}
/** hexagon-fan disc at height y */
function hexDisc(r, y, N = 42, up = true) {
  const pos = [0, y, 0], idx = [];
  for (let i = 0; i < N; i++) {
    const phi = (i / N) * Math.PI * 2;
    const t = ((phi - Math.PI / 6) % H + H + H / 2) % H - H / 2;
    const rr = r / Math.cos(t);
    pos.push(Math.sin(phi) * rr, y, Math.cos(phi) * rr);
  }
  for (let i = 0; i < N; i++) idx.push(0, 1 + i, 1 + (i + 1) % N);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  return orient(g, up ? 'up' : 'down');
}

// ================= build =================
export function build() {
  const m = materials();
  const root = new THREE.Group();
  const anim = { swing: [], halos: [] };

  // ---------- cream stone base: plinth + tier ----------
  mesh(G.cyl(0.404, R_PLAT, 0.034, 6), m.stoneD, { parent: root, pos: [0, 0.017, 0], rot: [0, Math.PI / 6, 0] });
  mesh(G.cyl(0.412, 0.412, 0.010, 6), m.stone, { parent: root, pos: [0, 0.037, 0], rot: [0, Math.PI / 6, 0] });
  mesh(G.cyl(0.400, 0.408, 0.040, 6), m.stone, { parent: root, pos: [0, 0.056, 0], rot: [0, Math.PI / 6, 0] });
  mesh(G.cyl(0.404, 0.404, 0.006, 6), m.gold, { parent: root, pos: [0, 0.072, 0], rot: [0, Math.PI / 6, 0] });
  mesh(G.cyl(0.394, 0.394, 0.008, 6), m.stone, { parent: root, pos: [0, FLOOR - 0.003, 0], rot: [0, Math.PI / 6, 0] });
  for (let k = 0; k < 6; k++) {                         // carved medallions on the skirt
    const a = k * H;
    const p = [Math.sin(a) * (AP_PLAT + 0.001), 0.05, Math.cos(a) * (AP_PLAT + 0.001)];
    mesh(G.cyl(0.020, 0.020, 0.005, 12), m.stoneD, { parent: root, pos: p, rot: [Math.PI / 2, 0, 0] });
    mesh(G.torus(0.021, 0.0024, 4, 14), m.gold, { parent: root, pos: [p[0], p[1], p[2] + 0.0015], rot: [0, a, 0] });
  }

  // interior floor: six radiating slab joints for a paved look
  for (let k = 0; k < 6; k++) {
    const a = colAng(k);
    mesh(plainBox(0.006, 0.003, 0.30), m.stoneD, { parent: root, pos: [Math.sin(a) * 0.152, FLOOR + 0.0015, Math.cos(a) * 0.152], rot: [0, a, 0] });
  }
  mesh(G.torus(0.075, 0.0028, 4, 24), m.stoneD, { parent: root, pos: [0, FLOOR + 0.002, 0], rot: [Math.PI / 2, 0, 0] });

  // ---------- three stone steps at the front ----------
  const N = 3, zIn = AP_PLAT + 0.001, sd = (STEP_Z - zIn) / N;
  for (let i = 0; i < N; i++) {
    const hh = 0.0595 - i * 0.0195, z = zIn + sd * (i + 0.5);
    mesh(bx(0.216, hh, sd + 0.006, 0.008), i === 0 ? m.stone : m.stoneD, { parent: root, pos: [0, hh / 2, z] });
    mesh(plainBox(0.216, 0.006, sd * 0.5), m.stone, { parent: root, pos: [0, hh - 0.001, z - sd * 0.16] });
  }
  for (const s of [-1, 1]) {                             // step cheeks
    mesh(bx(0.026, 0.062, sd * N + 0.012, 0.01), m.stoneD, { parent: root, pos: [s * 0.123, 0.031, zIn + sd * N / 2 - 0.004] });
    mesh(sph(0.016, 12, 9), m.gold, { parent: root, pos: [s * 0.123, 0.067, STEP_Z - 0.016] });
  }

  // ---------- six vermilion columns ----------
  for (let k = 0; k < 6; k++) {
    const a = colAng(k);
    const C = group(root, { pos: [Math.sin(a) * R_COL, 0, Math.cos(a) * R_COL], rot: [0, a, 0] });
    const shaftH = BEAM_Y - FLOOR - 0.030;
    mesh(G.cyl(0.043, 0.048, 0.030, 14), m.stoneD, { parent: C, pos: [0, FLOOR + 0.015, 0] });
    mesh(G.cyl(0.049, 0.049, 0.006, 14), m.stone, { parent: C, pos: [0, FLOOR + 0.032, 0] });
    mesh(G.cyl(0.029, 0.032, shaftH, 14), m.red, { parent: C, pos: [0, FLOOR + 0.031 + shaftH / 2, 0] });
    mesh(G.torus(0.0305, 0.0045, 5, 14), m.gold, { parent: C, pos: [0, FLOOR + 0.062, 0], rot: [Math.PI / 2, 0, 0] });
    mesh(G.torus(0.0305, 0.0045, 5, 14), m.gold, { parent: C, pos: [0, BEAM_Y - 0.018, 0], rot: [Math.PI / 2, 0, 0] });
  }

  // ---------- lintel beams (額枋) with jade cap ----------
  for (let k = 0; k < 6; k++) {
    const am = colAng(k) + H / 2;
    const g = group(root, { pos: [Math.sin(am) * AP_COL, 0, Math.cos(am) * AP_COL], rot: [0, am, 0] });
    mesh(bx(R_COL + 0.01, BEAM_H, 0.036, 0.008), m.red, { parent: g, pos: [0, BEAM_Y + BEAM_H / 2, 0] });
    mesh(plainBox(R_COL, 0.008, 0.042), m.gold, { parent: g, pos: [0, BEAM_Y + 0.005, 0] });
    mesh(plainBox(R_COL, 0.008, 0.042), m.gold, { parent: g, pos: [0, BEAM_Y + BEAM_H - 0.005, 0] });
    for (const s of [-1, 1]) mesh(plainBox(0.012, BEAM_H * 0.7, 0.044), m.gold, { parent: g, pos: [s * R_COL * 0.34, BEAM_Y + BEAM_H / 2, 0] });
  }

  // ---------- dougong bracket sets under the eaves ----------
  for (let k = 0; k < 6; k++) {
    const a = colAng(k);
    const g = group(root, { pos: [Math.sin(a) * R_COL, 0, Math.cos(a) * R_COL], rot: [0, a, 0] });
    const y0 = BEAM_Y + BEAM_H;                          // 0.599
    mesh(plainBox(0.064, 0.016, 0.064), m.jade, { parent: g, pos: [0, y0 + 0.008, 0] });
    mesh(plainBox(0.132, 0.014, 0.030), m.jade, { parent: g, pos: [0, y0 + 0.023, 0] });
    for (const s of [-1, 1]) {
      mesh(plainBox(0.026, 0.030, 0.026), m.jade, { parent: g, pos: [s * 0.055, y0 + 0.040, 0] });
      mesh(plainBox(0.020, 0.008, 0.032), m.gold, { parent: g, pos: [s * 0.055, y0 + 0.056, 0] });
    }
    mesh(plainBox(0.036, 0.026, 0.092), m.jade, { parent: g, pos: [0, y0 + 0.040, 0] });
    for (const s of [-1, 1]) mesh(plainBox(0.028, 0.022, 0.026), m.jade, { parent: g, pos: [0, y0 + 0.040, s * 0.062] });
    mesh(plainBox(0.104, 0.013, 0.032), m.jade, { parent: g, pos: [0, y0 + 0.055, 0] });
    mesh(sph(0.010, 8, 6), m.gold, { parent: g, pos: [0, y0 + 0.066, 0] });
  }

  // ---------- carved railings (all bays but the open front bay at 0 deg) ----------
  for (let k = 1; k < 6; k++) {
    const am = H * k;                                   // 60,120,180,240,300 — front bay (0) stays open
    const g = group(root, { pos: [Math.sin(am) * AP_COL, 0, Math.cos(am) * AP_COL], rot: [0, am, 0] });
    const L = R_COL - 0.058, F = FLOOR;
    mesh(bx(L, 0.030, 0.032, 0.008), m.red, { parent: g, pos: [0, F + 0.016, 0] });        // 地栿
    mesh(plainBox(L, 0.007, 0.036), m.gold, { parent: g, pos: [0, F + 0.033, 0] });
    for (let i = 0; i < 5; i++) {                                                          // openwork panel
      const x = -L / 2 + 0.026 + i * ((L - 0.052) / 4);
      mesh(plainBox(0.015, 0.048, 0.020), m.red, { parent: g, pos: [x, F + 0.060, 0] });
    }
    mesh(plainBox(L * 0.99, 0.011, 0.026), m.red, { parent: g, pos: [0, F + 0.088, 0] });
    mesh(bx(L * 0.9, 0.014, 0.074, 0.006), m.red, { parent: g, pos: [0, F + 0.100, 0.017] }); // 美人靠 seat
    mesh(plainBox(L * 0.9, 0.005, 0.078), m.gold, { parent: g, pos: [0, F + 0.109, 0.017] });
    for (let i = 0; i < 7; i++) {                                                          // balusters
      const x = -L / 2 + 0.020 + i * ((L - 0.040) / 6);
      mesh(plainBox(0.012, 0.155, 0.012), m.red, { parent: g, pos: [x, F + 0.188, 0.004] });
      mesh(plainBox(0.018, 0.011, 0.018), m.gold, { parent: g, pos: [x, F + 0.126, 0.004] });
    }
    mesh(bx(L, 0.026, 0.034, 0.009), m.red, { parent: g, pos: [0, F + 0.281, 0.004] });    // 尋杖
    mesh(plainBox(L, 0.007, 0.038), m.gold, { parent: g, pos: [0, F + 0.298, 0.004] });
    for (const s of [-1, 1]) mesh(sph(0.013, 8, 6), m.gold, { parent: g, pos: [s * L / 2, F + 0.281, 0.004] });
  }

  // ---------- plaque above the entrance ----------
  mesh(bx(0.222, 0.090, 0.016, 0.005), m.gold, { parent: root, pos: [0, BEAM_Y + 0.034, AP_COL + 0.028] });
  mesh(plainBox(0.204, 0.070, 0.010), m.plaque, { parent: root, pos: [0, BEAM_Y + 0.034, AP_COL + 0.036] });

  // ---------- roof ----------
  const roof = group(root, { name: 'roof' });
  for (const gp of panelGeos(10, 8, 0, 1, 0, 0)) mesh(gp, m.tile, { parent: roof });
  const NU = 12;
  mesh(stripGeo(hexRing(NU, 1, 0.005, 0.001), hexRing(NU, 1, -0.005, -0.030), 'down'), m.jade, { parent: roof }); // eave fascia
  // eave soffit rising to the interior ceiling
  const inner = [];
  for (let k = 0; k < 6; k++) {
    const a0 = colAng(k);
    for (let i = 0; i < NU; i++) { const phi = a0 + H * (i / NU); inner.push([Math.sin(phi) * 0.302, 0.664, Math.cos(phi) * 0.302]); }
  }
  mesh(stripGeo(hexRing(NU, 1, -0.008, -0.034), inner, 'down'), m.stone, { parent: roof });
  mesh(hexDisc(0.302, 0.666, 42, false), m.stone, { parent: roof });
  mesh(G.torus(0.10, 0.008, 4, 20), m.gold, { parent: roof, pos: [0, 0.662, 0], rot: [Math.PI / 2, 0, 0] });
  mesh(hexDisc(0.095, 0.660, 24, false), m.jade, { parent: roof });
  mesh(sph(0.030, 12, 9), m.gold, { parent: roof, pos: [0, 0.650, 0] });
  // raised tile course near the eaves
  for (const v of [0.60, 0.84]) mesh(stripGeo(hexRing(24, v - 0.02, 0, 0.004), hexRing(24, v + 0.02, 0, 0.004), 'up'), m.jade, { parent: roof });
  // 瓦当 eave tile caps
  for (let k = 0; k < 6; k++) {
    const a0 = colAng(k);
    for (let i = 0; i < 6; i++) {
      const u = (i + 0.5) / 6, phi = a0 + H * u, t = -1 + 2 * u;
      const p = roofP(phi, t, 1, -0.001, -0.016);
      mesh(G.cyl(0.014, 0.014, 0.012, 8), m.jade, { parent: roof, pos: [p[0], p[1], p[2]], rot: [Math.PI / 2, phi, 0] });
      const q = roofP(phi, t, 1, -0.001, -0.010);
      mesh(sph(0.006, 6, 4), m.gold, { parent: roof, pos: [q[0] * 1.012, q[1], q[2] * 1.012] });
    }
  }
  // hip ridges (垂脊) up to the apex with upturned corner tips
  for (let k = 0; k < 6; k++) {
    const phi = colAng(k), dx = Math.sin(phi), dz = Math.cos(phi);
    const pts = [0.14, 0.32, 0.50, 0.68, 0.85, 1.0].map(v => roofP(phi, 1, v, 0.001, 0.010));
    const tip = pts[pts.length - 1];
    pts.push([tip[0] + dx * 0.006, tip[1] + 0.020, tip[2] + dz * 0.006]);
    pts.push([tip[0] + dx * 0.013, tip[1] + 0.036, tip[2] + dz * 0.013]);
    pts.push([tip[0] + dx * 0.021, tip[1] + 0.042, tip[2] + dz * 0.021]);
    mesh(G.tube(pts, 0.012, 22, 5), m.jade, { parent: roof });
    mesh(sph(0.015, 8, 6), m.gold, { parent: roof, pos: [tip[0] + dx * 0.026, tip[1] + 0.048, tip[2] + dz * 0.026] });
  }
  // gourd finial (葫芦宝顶)
  mesh(G.lathe([[0, 0], [0.048, 0.004], [0.052, 0.014], [0.037, 0.024], [0.020, 0.032], [0.033, 0.045],
    [0.044, 0.062], [0.039, 0.078], [0.023, 0.090], [0.016, 0.098], [0.023, 0.108],
    [0.028, 0.120], [0.020, 0.132], [0.008, 0.140], [0, 0.143]], 20), m.gold, { parent: roof, pos: [0, 0.838, 0] });
  mesh(G.torus(0.018, 0.006, 4, 14), m.red, { parent: roof, pos: [0, 0.933, 0], rot: [Math.PI / 2, 0, 0] });

  // ---------- interior: round stone table + two drum stools ----------
  const T = group(root, { pos: [0, FLOOR, -0.018] });
  mesh(G.cyl(0.046, 0.050, 0.012, 18), m.stoneD, { parent: T, pos: [0, 0.006, 0] });
  mesh(G.cyl(0.019, 0.028, 0.056, 12), m.stoneD, { parent: T, pos: [0, 0.040, 0] });
  mesh(G.cyl(0.066, 0.066, 0.014, 22), m.stone, { parent: T, pos: [0, 0.075, 0] });
  mesh(G.torus(0.066, 0.006, 4, 20), m.stoneD, { parent: T, pos: [0, 0.072, 0], rot: [Math.PI / 2, 0, 0] });
  mesh(G.cyl(0.037, 0.037, 0.004, 16), m.stone, { parent: T, pos: [0, 0.084, 0] });
  mesh(G.cyl(0.010, 0.010, 0.085, 8), m.stone, { parent: T, pos: [-0.014, 0.091, 0.006], rot: [0, 0.4, Math.PI / 2] });
  mesh(plainBox(0.046, 0.005, 0.034), m.stone, { parent: T, pos: [0.014, 0.088, -0.008], rot: [0, -0.3, 0] });
  mesh(G.cyl(0.0035, 0.0045, 0.062, 6), m.red, { parent: T, pos: [0.023, 0.094, 0.016], rot: [0, 0.9, Math.PI / 2] });
  for (const s of [-1, 1]) {
    const a = s * 0.72;
    const S = group(root, { pos: [Math.sin(a) * 0.128, FLOOR, Math.cos(a) * 0.128 - 0.018] });
    mesh(G.cyl(0.034, 0.034, 0.046, 14), m.stoneD, { parent: S, pos: [0, 0.025, 0] });
    mesh(G.cyl(0.037, 0.037, 0.008, 14), m.stone, { parent: S, pos: [0, 0.011, 0] });
    mesh(G.cyl(0.033, 0.033, 0.008, 14), m.stone, { parent: S, pos: [0, 0.044, 0] });
    for (let i = 0; i < 6; i++) {
      const b = i / 6 * Math.PI * 2;
      mesh(sph(0.005, 6, 4), m.stone, { parent: S, pos: [Math.cos(b) * 0.034, 0.026, Math.sin(b) * 0.034] });
    }
    mesh(G.torus(0.035, 0.004, 4, 14), m.gold, { parent: S, pos: [0, 0.041, 0], rot: [Math.PI / 2, 0, 0] });
  }

  // ---------- two red paper lanterns under the front eaves ----------
  const lanternGeo = G.lathe([[0, 0.000], [0.011, 0.004], [0.015, 0.012], [0.012, 0.020],
    [0.029, 0.023], [0.033, 0.030], [0.031, 0.036],
    [0.045, 0.050], [0.054, 0.072], [0.057, 0.098], [0.054, 0.124], [0.045, 0.146],
    [0.031, 0.158], [0.030, 0.166], [0.025, 0.172],
    [0.013, 0.178], [0.010, 0.186], [0, 0.190]], 16);
  for (const s of [-1, 1]) {
    const pivot = group(root, { pos: [s * 0.158, 0.598, 0.310], dynamic: true });
    pivot.scale.setScalar(1.12);
    mesh(G.cyl(0.0035, 0.0035, 0.050, 5), m.gold, { parent: pivot, pos: [0, 0.023, 0] });
    mesh(G.cyl(0.021, 0.027, 0.010, 10), m.gold, { parent: pivot, pos: [0, 0.002, 0] });
    mesh(lanternGeo, m.paper, { parent: pivot, pos: [0, -0.212, 0] });
    mesh(G.cyl(0.0035, 0.0035, 0.032, 5), m.red, { parent: pivot, pos: [0, -0.229, 0] });
    mesh(sph(0.012, 8, 6), m.gold, { parent: pivot, pos: [0, -0.246, 0] });
    const halo = glowSprite(0xffa957, 0.44, 0.72); halo.position.set(0, -0.118, 0); pivot.add(halo);
    const core = glowSprite(0xff8a3c, 0.20, 0.88); core.position.set(0, -0.118, 0); pivot.add(core);
    anim.swing.push({ g: pivot, s, ph: s > 0 ? 0 : 1.9 });
    anim.halos.push(halo, core);
  }

  const lamp = new THREE.PointLight(0xffa24d, 2.6, 1.6, 1.6);
  lamp.position.set(0, 0.47, 0.26);
  root.add(lamp);

  // Keep the roof independently hideable while retaining material batching.
  finalize(roof);
  roof.userData.dynamic = true;
  finalize(root);

  // exact fit to spec: 0.932 W x 0.979 H x 0.856 D
  const box = new THREE.Box3().setFromObject(root);
  const size = box.getSize(new THREE.Vector3());
  const ctr = box.getCenter(new THREE.Vector3());
  const sx = 0.932 / size.x, sy = 0.979 / size.y, sz = 0.856 / size.z;
  root.scale.set(sx, sy, sz);
  root.position.set(-ctr.x * sx, 0, -ctr.z * sz);

  return {
    group: root,
    update(t) {
      for (const { g, s, ph } of anim.swing) {
        g.rotation.z = Math.sin(t * 1.15 + ph) * 0.052;
        g.rotation.x = Math.cos(t * 0.93 + ph * 1.4) * 0.036;
        g.position.y = 0.598 + Math.sin(t * 1.6 + ph) * 0.004;
      }
      m.paper.emissiveIntensity = 0.84 + Math.sin(t * 2.4) * 0.09 + Math.sin(t * 7.7) * 0.03;
      anim.halos.forEach((h, i) => { h.material.opacity = (i % 2 ? 0.78 : 0.52) + Math.sin(t * 2.4 + i) * 0.08; });
    },
  };
}
