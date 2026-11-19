// AI 规划座椅 — a softly curved cream garden bench with sage cushions, a glowing
// kanban tablet on a side table, hovering holographic plan panels and a little plant.
import * as THREE from 'three';
import { G, mat, gloss, glow, mesh, group, canvasTexture, glowSprite, finalize } from './kit.js';

// ---------- shared materials ----------
let M = null;
function materials() {
  if (M) return M;

  const woodTex = canvasTexture(256, 256, (g, w, h) => {
    g.fillStyle = '#eed7ad'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 90; i++) {
      const y = Math.random() * h, a = 0.09 + Math.random() * 0.16;
      g.strokeStyle = 'rgba(176,138,86,' + a.toFixed(3) + ')';
      g.lineWidth = 0.8 + Math.random() * 2.0;
      g.beginPath(); g.moveTo(0, y);
      for (let x = 0; x <= w; x += 24) g.lineTo(x, y + Math.sin(x * 0.04 + i) * 2.2);
      g.stroke();
    }
    for (let i = 0; i < 12; i++) { // knots
      const x = Math.random() * w, y = Math.random() * h;
      g.strokeStyle = 'rgba(168,132,84,0.20)'; g.lineWidth = 1.2;
      g.beginPath(); g.ellipse(x, y, 7 + Math.random() * 5, 3, 0, 0, 7); g.stroke();
    }
  });

  const quilt = canvasTexture(128, 128, (g, w, h) => {
    g.fillStyle = '#95b183'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 64; i++) {
      g.strokeStyle = i % 2 ? 'rgba(108,132,96,0.45)' : 'rgba(196,214,176,0.42)';
      g.lineWidth = 1; g.beginPath(); g.moveTo(i * 2, 0); g.lineTo(i * 2, h); g.stroke();
      g.strokeStyle = i % 2 ? 'rgba(196,214,176,0.38)' : 'rgba(108,132,96,0.45)';
      g.beginPath(); g.moveTo(0, i * 2); g.lineTo(w, i * 2); g.stroke();
    }
  }, { repeat: [9, 9] });

  // kanban screen
  const kanban = canvasTexture(512, 660, (g, w, h) => {
    const grd = g.createLinearGradient(0, 0, 0, h); grd.addColorStop(0, '#16233a'); grd.addColorStop(1, '#0d1728');
    g.fillStyle = grd; g.fillRect(0, 0, w, h);
    g.fillStyle = '#8fe3c8'; g.font = 'bold 40px sans-serif'; g.fillText('PLAN', 34, 62);
    g.fillStyle = '#5c7fa8'; g.font = '22px sans-serif'; g.fillText('week 12', 34, 96);
    g.strokeStyle = 'rgba(120,200,180,0.5)'; g.lineWidth = 2; g.beginPath(); g.moveTo(34, 116); g.lineTo(w - 34, 116); g.stroke();
    const cols = [['TODO', '#7fa8d8'], ['DOING', '#ffd27a'], ['DONE', '#8fe3c8']];
    const cardCols = ['#2c4166', '#2c4166', '#2c4166'];
    cols.forEach((c, ci) => {
      const x = 30 + ci * 155;
      g.fillStyle = c[1]; g.font = 'bold 20px sans-serif'; g.fillText(c[0], x, 162);
      g.fillStyle = 'rgba(255,255,255,0.10)'; g.fillRect(x, 176, 140, 430);
      const n = 4 - (ci === 2 ? 1 : 0);
      for (let i = 0; i < n; i++) {
        const y = 190 + i * 104;
        g.fillStyle = cardCols[ci]; g.fillRect(x + 8, y, 124, 88);
        g.fillStyle = ci === 2 ? '#8fe3c8' : (ci === 1 ? '#ffd27a' : '#7fa8d8');
        g.fillRect(x + 8, y, 124, 5);
        g.fillStyle = 'rgba(220,235,255,0.85)'; g.fillRect(x + 20, y + 22, 78, 8);
        g.fillStyle = 'rgba(200,220,245,0.45)'; g.fillRect(x + 20, y + 40, 96, 6); g.fillRect(x + 20, y + 54, 60, 6);
        g.fillStyle = c[1]; g.beginPath(); g.arc(x + 112, y + 72, 8, 0, 7); g.fill();
      }
    });
  });
  kanban.wrapS = kanban.wrapT = THREE.ClampToEdgeWrapping;

  // holographic checklist
  const holoA = canvasTexture(512, 288, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    g.strokeStyle = 'rgba(150,255,225,0.95)'; g.lineWidth = 4; g.strokeRect(6, 6, w - 12, h - 12);
    g.fillStyle = 'rgba(120,240,215,0.13)'; g.fillRect(6, 6, w - 12, h - 12);
    g.fillStyle = 'rgba(190,255,240,1)'; g.font = 'bold 32px sans-serif'; g.fillText('TODAY', 34, 60);
    g.strokeStyle = 'rgba(150,255,225,0.6)'; g.lineWidth = 2; g.beginPath(); g.moveTo(34, 76); g.lineTo(w - 34, 76); g.stroke();
    const rows = ['outline', 'storyboard', 'render pass', 'grading'];
    rows.forEach((r, i) => {
      const y = 112 + i * 40;
      g.strokeStyle = 'rgba(160,255,230,0.9)'; g.lineWidth = 3; g.strokeRect(36, y - 18, 24, 24);
      if (i < 2) { g.strokeStyle = 'rgba(190,255,240,1)'; g.lineWidth = 5; g.beginPath(); g.moveTo(40, y - 6); g.lineTo(48, y + 3); g.lineTo(60, y - 14); g.stroke(); }
      g.fillStyle = i < 2 ? 'rgba(200,255,240,0.95)' : 'rgba(160,220,210,0.8)'; g.font = '26px sans-serif'; g.fillText(r, 78, y);
    });
    g.fillStyle = 'rgba(160,255,230,0.25)'; g.fillRect(34, 262, w - 68, 10);
    g.fillStyle = 'rgba(180,255,235,0.95)'; g.fillRect(34, 262, (w - 68) * 0.62, 10);
  });
  holoA.wrapS = holoA.wrapT = THREE.ClampToEdgeWrapping;

  // holographic timeline / gantt
  const holoB = canvasTexture(512, 224, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    g.strokeStyle = 'rgba(255,205,150,0.95)'; g.lineWidth = 4; g.strokeRect(6, 6, w - 12, h - 12);
    g.fillStyle = 'rgba(255,190,130,0.12)'; g.fillRect(6, 6, w - 12, h - 12);
    for (let i = 0; i < 5; i++) { g.strokeStyle = 'rgba(255,210,160,0.18)'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(40 + i * 106, 24); g.lineTo(40 + i * 106, h - 24); g.stroke(); }
    const bars = [[0.02, 0.34, '#ffd9a0'], [0.20, 0.30, '#9fe8cf'], [0.38, 0.42, '#ffc48a'], [0.10, 0.52, '#ffe9c4'], [0.30, 0.62, '#8fe3c8']];
    bars.forEach((b, i) => {
      const y = 32 + i * 36, x = 34 + b[0] * (w - 100), len = b[1] * (w - 100);
      g.fillStyle = b[2]; g.globalAlpha = 0.9; g.fillRect(x, y, len, 18); g.globalAlpha = 1;
      g.fillStyle = 'rgba(255,240,220,0.65)'; g.fillRect(x, y + 18, len, 3);
    });
    g.fillStyle = 'rgba(255,235,205,1)'; g.fillRect(34 + 0.46 * (w - 100), 20, 4, h - 44);
  });
  holoB.wrapS = holoB.wrapT = THREE.ClampToEdgeWrapping;

  M = {
    wood: mat(0xffffff, { map: woodTex, roughness: 0.68 }),
    woodDeep: mat(0xd8bd91, { roughness: 0.74 }),
    cush: mat(0xffffff, { map: quilt, roughness: 0.9 }),
    stone: mat(0xdccfb0, { roughness: 0.94 }),
    stoneDeep: mat(0xc4b393, { roughness: 0.95 }),
    terra: mat(0xcf7f5c, { roughness: 0.78 }),
    leaf: gloss(0x74b06a, { roughness: 0.42, emissive: 0x1f4a24, emissiveIntensity: 0.18 }),
    screen: mat(0x0d1728, { map: kanban, emissive: 0xffffff, emissiveMap: kanban, emissiveIntensity: 1.0, roughness: 0.35 }),
    holoA: new THREE.MeshBasicMaterial({ map: holoA, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }),
    holoB: new THREE.MeshBasicMaterial({ map: holoB, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }),
  };
  return M;
}

// ---------- curved-bench geometry helpers ----------
const A = 0.56;      // half sweep of the bench arc (rad)
const CZ = 0.662;    // centre of curvature, in front of the bench

/** point on the bench arc */
const P = (th, R, y) => [Math.sin(th) * R, y, CZ - Math.cos(th) * R];

/** annular sector in the shape plane: theta measured from +Y, so +Y maps to -Z once laid flat */
function arcShape(rIn, rOut, a0, a1) {
  const n = Math.max(2, Math.round((a1 - a0) / 0.20));
  const s = new THREE.Shape();
  const pt = (r, t) => [r * Math.sin(t), r * Math.cos(t)];
  let p = pt(rOut, a0); s.moveTo(p[0], p[1]);
  for (let i = 1; i <= n; i++) { p = pt(rOut, a0 + (a1 - a0) * i / n); s.lineTo(p[0], p[1]); }
  for (let i = n; i >= 0; i--) { p = pt(rIn, a0 + (a1 - a0) * i / n); s.lineTo(p[0], p[1]); }
  s.closePath();
  return s;
}

/** horizontal / vertical slab that follows the bench arc, spans y .. y+h */
function slab(parent, m, rIn, rOut, a0, a1, y, h, bevel, seg, extra) {
  const geo = G.extrude(arcShape(rIn, rOut, a0, a1), h, bevel, seg);
  return mesh(geo, m, Object.assign({ parent, pos: [0, y, CZ], rot: [-Math.PI / 2, 0, 0] }, extra || {}));
}

export function build() {
  const m = materials();
  const root = new THREE.Group();
  const anim = { panels: [], sprites: [] };

  // ---------- soft stone pad ----------
  mesh(G.box(0.95, 0.026, 0.48, 0.06, 2), m.stoneDeep, { parent: root, pos: [0, 0.013, -0.008] });
  mesh(G.box(0.90, 0.022, 0.435, 0.055, 2), m.stone, { parent: root, pos: [0, 0.026, -0.008] });
  // three little stepping pebbles in front, a charming bit of ground detail
  for (const [x, z, r] of [[-0.10, 0.208, 0.026], [0.02, 0.222, 0.020], [0.135, 0.206, 0.024]])
    mesh(G.sphere(r, 8, 6), m.stoneDeep, { parent: root, pos: [x, 0.030, z], scale: [1.25, 0.36, 1] });

  // ---------- legs: four, standing on the bench curve ----------
  const LEG_TH = 0.47, R_LEG_F = 0.678, R_LEG_B = 0.872;
  for (const s of [-1, 1]) {
    for (const R of [R_LEG_F, R_LEG_B]) {
      const p = P(s * LEG_TH, R, 0);
      mesh(G.cyl(0.030, 0.036, 0.150, 8), m.wood, { parent: root, pos: [p[0], 0.101, p[2]] });
      mesh(G.sphere(0.036, 8, 6), m.woodDeep, { parent: root, pos: [p[0], 0.038, p[2]], scale: [1, 0.72, 1] });
      mesh(G.cyl(0.038, 0.041, 0.016, 10), m.woodDeep, { parent: root, pos: [p[0], 0.178, p[2]] });
    }
    // side stretcher tying the pair together
    const a = P(s * LEG_TH, R_LEG_F, 0), b = P(s * LEG_TH, R_LEG_B, 0);
    mesh(G.box(0.026, 0.024, Math.hypot(b[0] - a[0], b[2] - a[2]), 0.010), m.woodDeep, {
      parent: root, pos: [(a[0] + b[0]) / 2, 0.082, (a[2] + b[2]) / 2],
      rot: [0, Math.atan2(b[0] - a[0], b[2] - a[2]), 0],
    });
  }

  // ---------- seat frame / aprons ----------
  slab(root, m.woodDeep, 0.658, 0.700, -A, A, 0.132, 0.050, 0.008, 1);   // front apron
  slab(root, m.woodDeep, 0.848, 0.884, -A, A, 0.132, 0.050, 0.008, 1);   // back apron

  // ---------- seat slats (six curved boards) ----------
  const SL = [0.862, 0.816, 0.770, 0.724, 0.678];
  for (const R of SL) slab(root, m.wood, R - 0.0130, R + 0.0130, -A, A, 0.174, 0.036, 0.007, 1);

  // ---------- backrest slats ----------
  const N = 7, span = (2 * A - (N - 1) * 0.044) / N;
  for (let i = 0; i < N; i++) {
    const a0 = -A + 0.022 + i * (span + 0.044);
    slab(root, m.wood, 0.872, 0.900, a0, a0 + span, 0.212, 0.190, 0.006, 1);
  }
  slab(root, m.wood, 0.866, 0.910, -A, A, 0.398, 0.036, 0.009, 2);        // top rail
  slab(root, m.woodDeep, 0.868, 0.906, -A, A, 0.372, 0.020, 0.006, 1);    // rail shadow line

  // ---------- sage cushions ----------
  const cush = (a0, a1) => {
    slab(root, m.cush, 0.700, 0.856, a0, a1, 0.210, 0.040, 0.017, 2);
    slab(root, m.cush, 0.718, 0.842, a0 + 0.012, a1 - 0.012, 0.246, 0.022, 0.015, 1);
  };
  cush(0.028, A - 0.02); cush(-A + 0.02, -0.028);
  // small bolster pillow against the backrest
  mesh(G.capsule(0.036, 0.16, 3, 8), m.cush, { parent: root, pos: [0, 0.268, CZ - 0.828], rot: [0.3, 0, Math.PI / 2], scale: [1, 1, 1] });

  // ---------- rounded arms ----------
  for (const s of [-1, 1]) {
    const th = s * (LEG_TH + 0.01);
    // post: a soft rounded column continuing the front leg up to the arm
    const post = P(th, R_LEG_F - 0.008, 0);
    mesh(G.capsule(0.020, 0.130, 3, 8), m.wood, { parent: root, pos: [post[0], 0.268, post[2]] });
    mesh(G.sphere(0.023, 8, 6), m.woodDeep, { parent: root, pos: [post[0], 0.192, post[2]], scale: [1.15, 0.7, 1.15] });
    // arm rail sweeping front-to-back, parallel to the curve radius
    const ap = P(th, 0.780, 0);
    mesh(G.box(0.252, 0.040, 0.030, 0.015), m.wood, { parent: root, pos: [ap[0], 0.348, ap[2]], rot: [0, Math.PI / 2 - th, 0] });
    // rounded front tip and a rounded junction into the backrest
    const tip = P(th, 0.656, 0);
    mesh(G.sphere(0.026, 9, 7), m.woodDeep, { parent: root, pos: [tip[0], 0.348, tip[2]], scale: [1.15, 0.95, 1.15] });
    const bk = P(th, 0.902, 0);
    mesh(G.sphere(0.025, 8, 6), m.wood, { parent: root, pos: [bk[0], 0.352, bk[2]] });
  }

  // ---------- side table with the kanban tablet (right front) ----------
  const TB = group(root, { pos: [0.395, 0, 0.155] });
  mesh(G.cyl(0.082, 0.082, 0.018, 18), m.wood, { parent: TB, pos: [0, 0.294, 0] });
  mesh(G.torus(0.082, 0.008, 5, 18), m.woodDeep, { parent: TB, pos: [0, 0.294, 0], rot: [Math.PI / 2, 0, 0] });
  mesh(G.cyl(0.016, 0.02, 0.262, 10), m.woodDeep, { parent: TB, pos: [0, 0.155, 0] });
  mesh(G.cyl(0.05, 0.062, 0.026, 14), m.wood, { parent: TB, pos: [0, 0.021, 0] });
  for (let i = 0; i < 3; i++) {
    const a = i * Math.PI * 2 / 3 + 0.5;
    mesh(G.capsule(0.014, 0.05, 3, 8), m.woodDeep, { parent: TB, pos: [Math.cos(a) * 0.045, 0.016, Math.sin(a) * 0.045], rot: [Math.PI / 2, 0, -a], scale: [1, 1, 1] });
  }
  // tablet, leaning back on a little stand
  const tab = group(TB, { pos: [-0.014, 0.318, -0.010], rot: [-0.34, -0.52, 0] });
  mesh(G.box(0.100, 0.128, 0.014, 0.008), m.woodDeep, { parent: tab });
  mesh(new THREE.PlaneGeometry(0.082, 0.108), m.screen, { parent: tab, pos: [0, 0.002, 0.0082] });
  mesh(G.box(0.05, 0.012, 0.03, 0.005), m.woodDeep, { parent: tab, pos: [0, -0.062, -0.02], rot: [0.5, 0, 0] });
  // a mug + a couple of cards
  mesh(G.cyl(0.021, 0.018, 0.036, 10), m.woodDeep, { parent: TB, pos: [0.052, 0.320, 0.030] });
  mesh(G.torus(0.014, 0.005, 4, 9, Math.PI * 1.4), m.woodDeep, { parent: TB, pos: [0.072, 0.320, 0.030], rot: [0, 0, 1.2] });
  for (let i = 0; i < 3; i++) mesh(G.box(0.05, 0.004, 0.036, 0.002), m.stone, { parent: TB, pos: [-0.03 + i * 0.004, 0.305 + i * 0.005, 0.036], rot: [0, 0.3 + i * 0.12, 0] });

  // ---------- potted plant (left front) ----------
  const PL = group(root, { pos: [-0.395, 0, 0.145] });
  mesh(G.lathe([[0, 0], [0.032, 0.004], [0.042, 0.026], [0.05, 0.062], [0.054, 0.072]], 14), m.terra, { parent: PL });
  mesh(G.torus(0.053, 0.007, 5, 14), m.terra, { parent: PL, pos: [0, 0.072, 0], rot: [Math.PI / 2, 0, 0] });
  mesh(G.cyl(0.047, 0.047, 0.008, 12), m.woodDeep, { parent: PL, pos: [0, 0.068, 0] });
  const leaves = [[0.0, 0.9], [0.7, 1.05], [1.9, 0.85], [2.9, 1.1], [4.1, 0.78], [5.2, 1.0], [3.6, 0.55]];
  leaves.forEach(([a, s], i) => {
    mesh(G.sphere(0.034, 8, 6), m.leaf, {
      parent: PL, pos: [Math.cos(a) * 0.022, 0.075 + 0.05 * s, Math.sin(a) * 0.022],
      rot: [Math.cos(a) * 0.5, -a, -Math.sin(a) * 0.5], scale: [0.34, 1.55 * s, 0.11],
    });
  });

  // ---------- hover holographic panels ----------
  const mkPanel = (texMat, w, hh, pos, ry) => {
    const p = mesh(new THREE.PlaneGeometry(w, hh), texMat, { parent: root, pos, rot: [0, ry, 0], dynamic: true });
    anim.panels.push({ o: p, y0: pos[1], ry, ph: anim.panels.length * 2.1 });
    // small projector mote under the panel, well inside the bounding box
    const gl = glowSprite(0x9ff0e0, 0.05, 0.7);
    gl.position.set(pos[0], pos[1] - hh * 0.5 - 0.018, pos[2] + 0.01); root.add(gl);
    anim.sprites.push({ s: gl, o: 0.62, ph: anim.panels.length });
    return p;
  };
  mkPanel(m.holoA, 0.300, 0.168, [-0.085, 0.588, -0.02], 0.20);
  mkPanel(m.holoB, 0.255, 0.112, [0.130, 0.789, -0.05], -0.26);

  // glow above the tablet
  const tg = glowSprite(0x8fd8ff, 0.15, 0.5); tg.position.set(0.372, 0.372, 0.152); root.add(tg);
  anim.sprites.push({ s: tg, o: 0.5, ph: 3.4 });

  finalize(root);
  return {
    group: root,
    update(t) {
      m.screen.emissiveIntensity = 1.0 + Math.sin(t * 1.6) * 0.22 + Math.sin(t * 5.3) * 0.05;
      anim.panels.forEach(({ o, y0, ry, ph }) => {
        o.position.y = y0 + Math.sin(t * 0.85 + ph) * 0.013;
        o.rotation.y = ry + Math.sin(t * 0.30 + ph) * 0.20;
        o.position.x += Math.sin(t * 0.55 + ph) * 0.0004;
      });
      anim.sprites.forEach(({ s, o, ph }) => { s.material.opacity = o * (0.72 + Math.sin(t * 1.5 + ph) * 0.28); });
    },
  };
}
