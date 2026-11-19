// 龙椅台阶 — an open-air imperial throne on a three-tier round stone platform (no canopy).
import * as THREE from 'three';
import { G, mat, gloss, glow, metal, mesh, group, canvasTexture, glowSprite, finalize } from './kit.js';

// shared materials (kept few so finalize() merges into few draw calls)
let M = null;
function materials() {
  if (M) return M;
  const cloudBand = canvasTexture(1024, 128, (g, w, h) => {
    g.fillStyle = '#efe2c4'; g.fillRect(0, 0, w, h);
    // carved scrolling clouds: shadowed strokes + highlight strokes
    const cloud = (x, y, s, col, off) => {
      g.strokeStyle = col; g.lineWidth = 7 * s; g.lineCap = 'round';
      g.beginPath(); g.arc(x + off, y + off, 18 * s, Math.PI * 0.9, Math.PI * 2.4); g.stroke();
      g.beginPath(); g.arc(x + 30 * s + off, y + 6 * s + off, 12 * s, Math.PI * 1.1, Math.PI * 2.6); g.stroke();
      g.beginPath(); g.moveTo(x - 20 * s + off, y + 18 * s + off); g.quadraticCurveTo(x + 10 * s + off, y + 30 * s + off, x + 46 * s + off, y + 16 * s + off); g.stroke();
    };
    for (let i = 0; i < 12; i++) { const x = 40 + i * 86, y = 52 + (i % 2) * 10; cloud(x, y, 1, 'rgba(160,130,90,0.55)', 3); cloud(x, y, 1, 'rgba(255,250,235,0.9)', -1); }
    g.fillStyle = 'rgba(170,140,95,0.5)'; g.fillRect(0, 6, w, 5); g.fillRect(0, h - 11, w, 5);
    g.fillStyle = 'rgba(255,252,240,0.9)'; g.fillRect(0, 3, w, 3); g.fillRect(0, h - 14, w, 3);
  }, { repeat: [3, 1] });
  const tufted = canvasTexture(256, 256, (g, w, h) => {
    const grd = g.createLinearGradient(0, 0, 0, h); grd.addColorStop(0, '#d8473d'); grd.addColorStop(1, '#b8322c'); g.fillStyle = grd; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
      const x = 32 + i * 64, y = 32 + j * 64;
      const r = g.createRadialGradient(x, y, 2, x, y, 30); r.addColorStop(0, 'rgba(255,190,170,0.45)'); r.addColorStop(1, 'rgba(120,20,20,0.25)');
      g.fillStyle = r; g.fillRect(x - 32, y - 32, 64, 64);
      g.fillStyle = '#8f2422'; g.beginPath(); g.arc(x - 32, y - 32, 4, 0, 7); g.fill();
    }
  });
  M = {
    stone: mat(0xf2e6ca, { roughness: 0.86 }), stoneBand: mat(0xffffff, { map: cloudBand, roughness: 0.84 }),
    marble: mat(0xf8f1df, { roughness: 0.7 }), shade: mat(0xe2d2b0, { roughness: 0.9 }),
    gold: metal(0xd9a640, 0.3), goldD: metal(0xb98a31, 0.38),
    red: gloss(0xffffff, { map: tufted, roughness: 0.5, clearcoat: 0.45 }), redPlain: gloss(0xc63c35, { roughness: 0.48, clearcoat: 0.45 }),
    carpet: mat(0xa8302b, { roughness: 0.95 }), jade: gloss(0x63b98d, { roughness: 0.2, emissive: 0x1d5a3c, emissiveIntensity: 0.25 }),
    gem: glow(0xe0483c, 1.8), pearl: gloss(0xfff3d0, { roughness: 0.18 }),
  };
  return M;
}

function dragonHead(parent, s, m) {
  // a chubby, friendly dragon head capping the armrest, looking forward
  const g = group(parent, { pos: [s * 0.16, 0.165, 0.2], rot: [0, s * -0.15, 0] });
  mesh(G.sphere(0.042, 18, 14), m.gold, { parent: g, scale: [1, 0.92, 1.15] });
  mesh(G.sphere(0.027, 14, 10), m.goldD, { parent: g, pos: [0, -0.008, 0.042], scale: [1.15, 0.8, 1] });           // snout
  for (const t of [-1, 1]) {
    mesh(G.cone(0.01, 0.05, 8), m.goldD, { parent: g, pos: [t * 0.022, 0.045, -0.02], rot: [-0.7, 0, t * 0.3] });  // horns
    mesh(G.sphere(0.0085, 10, 8), m.gem, { parent: g, pos: [t * 0.024, 0.014, 0.034] });                         // eyes
    mesh(G.tube([[t * 0.02, -0.015, 0.055], [t * 0.05, -0.03, 0.06], [t * 0.07, -0.02, 0.04]], 0.0045, 10, 5), m.gold, { parent: g }); // whiskers
  }
  for (let i = 0; i < 4; i++) mesh(G.sphere(0.009, 8, 6), m.goldD, { parent: g, pos: [0, 0.035 - i * 0.012, -0.04 - i * 0.008], scale: [0.6, 1, 1] }); // mane
  mesh(G.sphere(0.012, 10, 8), m.pearl, { parent: g, pos: [0, -0.03, 0.06] });                                    // pearl in mouth
}

export function build() {
  const m = materials();
  const root = new THREE.Group();
  const anim = { lanterns: [], halos: [], smoke: [] };

  // ---- three carved stone tiers ----
  const tiers = [[0.47, 0.085], [0.405, 0.08], [0.345, 0.075]];
  let y = 0;
  tiers.forEach(([r, h], i) => {
    mesh(G.cyl(r * 0.995, r, h * 0.16, 56), m.shade, { parent: root, pos: [0, y + h * 0.08, 0] });                 // plinth foot
    mesh(G.cyl(r, r, h * 0.62, 56, true), m.stoneBand, { parent: root, pos: [0, y + h * 0.47, 0] });               // carved band
    mesh(G.cyl(r * 1.012, r * 1.012, h * 0.2, 56), i === 2 ? m.marble : m.stone, { parent: root, pos: [0, y + h * 0.88, 0] }); // capping lip
    mesh(G.torus(r * 0.985, 0.004, 5, 56), m.gold, { parent: root, pos: [0, y + h - 0.004, 0], rot: [Math.PI / 2, 0, 0] });
    y += h;
  });
  const topY = y; // 0.24
  mesh(G.cyl(0.3, 0.3, 0.004, 72), m.marble, { parent: root, pos: [0, topY + 0.002, 0] });

  // ---- front stair with balustrade cheeks ----
  const N = 5, depth = 0.04, rise = topY / N, sx = 0.12;
  for (let i = 0; i < N; i++) {
    const h = rise * (N - i), z = 0.33 + i * depth;
    mesh(G.box(sx * 2, h, depth + 0.004, 0.006), i % 2 ? m.stone : m.marble, { parent: root, pos: [0, h / 2, z] });
  }
  // red carpet laid over every tread and riser, so it reads as one runner
  for (let i = 0; i < N; i++) {
    const h = rise * (N - i), z = 0.33 + i * depth;
    mesh(G.box(0.1, 0.004, depth + 0.004, 0.0015), m.carpet, { parent: root, pos: [0, h + 0.002, z] });
    mesh(G.box(0.1, rise + 0.004, 0.004, 0.0015), m.carpet, { parent: root, pos: [0, h - rise / 2, z + depth / 2 + 0.003] });
  }
  mesh(G.box(0.1, 0.005, 0.2, 0.002), m.carpet, { parent: root, pos: [0, topY + 0.006, 0.23] });
  for (const s of [-1, 1]) {
    // cheek wall following the slope, capped with gold
    const L = Math.hypot(topY, N * depth);
    const cheek = mesh(G.box(0.03, 0.05, L, 0.01), m.marble, { parent: root, pos: [s * (sx + 0.016), topY / 2 + 0.02, 0.33 + (N * depth) / 2 - 0.022], rot: [Math.atan2(topY, N * depth), 0, 0] });
    mesh(G.box(0.034, 0.008, L, 0.003), m.gold, { parent: root, pos: [s * (sx + 0.016), topY / 2 + 0.048, 0.33 + (N * depth) / 2 - 0.022], rot: [Math.atan2(topY, N * depth), 0, 0] });
    mesh(G.cyl(0.022, 0.026, 0.05, 16), m.marble, { parent: root, pos: [s * (sx + 0.016), 0.025, 0.33 + N * depth - 0.01] });
    mesh(G.sphere(0.02, 14, 10), m.gold, { parent: root, pos: [s * (sx + 0.016), 0.06, 0.33 + N * depth - 0.01] });
  }

  // ---- jade inlays on the top ----
  for (let i = 0; i < 6; i++) {
    const a = Math.PI / 2 + Math.PI / 6 + i * Math.PI / 3 * 0.8;
    const p = [Math.cos(a + Math.PI) * 0.28, topY + 0.005, Math.sin(a + Math.PI) * 0.28];
    if (p[2] > 0.15) continue;
    mesh(G.cyl(0.022, 0.022, 0.006, 16), m.jade, { parent: root, pos: p });
    mesh(G.torus(0.023, 0.003, 5, 18), m.gold, { parent: root, pos: [p[0], p[1] + 0.003, p[2]], rot: [Math.PI / 2, 0, 0] });
  }

  // ---- bronze incense burners + glowing palace lanterns at the front corners ----
  for (const s of [-1, 1]) {
    const x = s * 0.235, z = 0.17;
    const burner = group(root, { pos: [x, topY, z] });
    mesh(G.lathe([[0, 0], [0.03, 0.002], [0.04, 0.02], [0.038, 0.04], [0.03, 0.05], [0.032, 0.056], [0, 0.056]], 20), m.goldD, { parent: burner });
    for (let k = 0; k < 3; k++) { const a = k / 3 * Math.PI * 2; mesh(G.cyl(0.005, 0.007, 0.025, 6), m.goldD, { parent: burner, pos: [Math.cos(a) * 0.026, -0.008, Math.sin(a) * 0.026] }); }
    for (const t of [-1, 1]) mesh(G.torus(0.012, 0.003, 5, 12), m.gold, { parent: burner, pos: [t * 0.04, 0.045, 0], rot: [0, Math.PI / 2, 0] });
    const ember = mesh(G.sphere(0.012, 10, 8), glow(0xff8a3a, 2.2), { parent: burner, pos: [0, 0.056, 0], dynamic: true });
    for (let k = 0; k < 3; k++) {
      const puff = glowSprite(0xfff0e0, 0.05, 0.25); puff.position.set(x, topY + 0.08 + k * 0.04, z); root.add(puff);
      anim.smoke.push({ s: puff, k, x, z });
    }
    // lantern on a short post behind the burner
    const L = group(root, { pos: [s * 0.29, topY, 0.02] });
    mesh(G.cyl(0.006, 0.008, 0.12, 8), m.goldD, { parent: L, pos: [0, 0.06, 0] });
    mesh(G.cyl(0.02, 0.026, 0.012, 12), m.gold, { parent: L, pos: [0, 0.006, 0] });
    const lg = group(L, { pos: [0, 0.16, 0] });
    const body = mesh(G.sphere(0.04, 20, 14), glow(0xffaf55, 1.9, { roughness: 0.55 }), { parent: lg, scale: [1, 1.2, 1], dynamic: true });
    for (const yy of [-0.034, 0.034]) mesh(G.cyl(0.026, 0.026, 0.01, 14), m.redPlain, { parent: lg, pos: [0, yy * 1.2, 0] });
    for (let k = 0; k < 4; k++) mesh(G.torus(0.0405, 0.0018, 4, 22, Math.PI), m.goldD, { parent: lg, rot: [0, k * Math.PI / 4, Math.PI / 2], scale: [1, 1.2, 1] });
    mesh(G.cyl(0.003, 0.003, 0.04, 5), m.redPlain, { parent: lg, pos: [0, -0.07, 0] });
    const halo = glowSprite(0xffa64d, 0.28, 0.7); halo.position.set(0, 0.16, 0); L.add(halo);
    anim.lanterns.push({ lg, body, ember }); anim.halos.push(halo);
  }

  // ---- the throne (scaled to sit inside the spec height) ----
  const T = group(root, { pos: [0, topY, -0.03], scale: 0.7 });
  mesh(G.lathe([[0.14, 0], [0.16, 0.012], [0.157, 0.026], [0.136, 0.036], [0.138, 0.046]], 40), m.goldD, { parent: T });
  for (let i = 0; i < 14; i++) { const a = i / 14 * Math.PI * 2; mesh(G.sphere(0.013, 8, 6), m.gold, { parent: T, pos: [Math.cos(a) * 0.15, 0.028, Math.sin(a) * 0.15], scale: [1, 0.7, 1] }); }
  // lion feet + legs
  for (const s of [-1, 1]) for (const t of [-1, 1]) {
    mesh(G.sphere(0.028, 14, 10), m.gold, { parent: T, pos: [s * 0.12, 0.06, t * 0.09], scale: [1.15, 0.8, 1.25] });
    mesh(G.cyl(0.016, 0.02, 0.04, 10), m.goldD, { parent: T, pos: [s * 0.12, 0.085, t * 0.09] });
  }
  // seat
  mesh(G.box(0.31, 0.04, 0.25, 0.016), m.gold, { parent: T, pos: [0, 0.115, 0.01] });
  mesh(G.box(0.27, 0.052, 0.215, 0.022), m.red, { parent: T, pos: [0, 0.158, 0.016] });
  // backrest
  const B = group(T, { pos: [0, 0.18, -0.1] });
  mesh(G.box(0.29, 0.33, 0.035, 0.014), m.red, { parent: B, pos: [0, 0.165, 0] });
  for (const s of [-1, 1]) mesh(G.box(0.024, 0.36, 0.045, 0.009), m.gold, { parent: B, pos: [s * 0.152, 0.17, 0] });
  mesh(G.box(0.33, 0.028, 0.045, 0.009), m.gold, { parent: B, pos: [0, 0.345, 0] });
  mesh(G.box(0.33, 0.028, 0.05, 0.009), m.gold, { parent: B, pos: [0, 0.0, 0] });
  // scrolling crest with a sun disc and pearl
  mesh(G.tube([[-0.16, 0.35, 0], [-0.12, 0.42, 0], [-0.05, 0.45, 0], [0.05, 0.45, 0], [0.12, 0.42, 0], [0.16, 0.35, 0]], 0.013, 40, 8), m.gold, { parent: B });
  for (const s of [-1, 1]) {
    mesh(G.tube([[s * 0.165, 0.35, 0], [s * 0.2, 0.39, 0], [s * 0.19, 0.43, 0], [s * 0.16, 0.42, 0]], 0.009, 20, 6), m.goldD, { parent: B });
    mesh(G.sphere(0.017, 12, 10), m.gold, { parent: B, pos: [s * 0.152, 0.365, 0.01] });
    mesh(G.sphere(0.009, 10, 8), m.gem, { parent: B, pos: [s * 0.152, 0.365, 0.026] });
  }
  mesh(G.cyl(0.045, 0.045, 0.012, 28), m.gold, { parent: B, pos: [0, 0.405, 0.004], rot: [Math.PI / 2, 0, 0] });
  mesh(G.cyl(0.03, 0.03, 0.014, 24), m.jade, { parent: B, pos: [0, 0.405, 0.006], rot: [Math.PI / 2, 0, 0] });
  mesh(G.sphere(0.02, 14, 10), m.pearl, { parent: B, pos: [0, 0.47, 0] });
  // armrests with dragon heads
  for (const s of [-1, 1]) {
    mesh(G.box(0.036, 0.11, 0.05, 0.01), m.gold, { parent: T, pos: [s * 0.16, 0.19, 0.11] });
    mesh(G.box(0.05, 0.03, 0.24, 0.012), m.redPlain, { parent: T, pos: [s * 0.16, 0.25, 0.02] });
    mesh(G.box(0.056, 0.01, 0.25, 0.004), m.gold, { parent: T, pos: [s * 0.16, 0.268, 0.02] });
    dragonHead(T, s, m);
    for (let i = 0; i < 4; i++) mesh(G.sphere(0.008, 8, 6), m.goldD, { parent: T, pos: [s * 0.183, 0.25, -0.07 + i * 0.05] });
  }

  finalize(root);
  return {
    group: root,
    update(t) {
      anim.lanterns.forEach(({ lg, body, ember }, i) => {
        body.material.emissiveIntensity = 1.8 + Math.sin(t * 2.7 + i) * 0.15 + Math.sin(t * 9.1 + i) * 0.05;
        ember.material.emissiveIntensity = 2 + Math.sin(t * 5 + i) * 0.5;
      });
      anim.halos.forEach((h, i) => { h.material.opacity = 0.6 + Math.sin(t * 2.7 + i) * 0.1; });
      anim.smoke.forEach(({ s, k, x, z }) => {
        const p = ((t * 0.22 + k / 3) % 1);
        s.position.set(x + Math.sin(t + k * 2) * 0.01, 0.31 + p * 0.16, z);
        s.scale.setScalar(0.03 + p * 0.07); s.material.opacity = 0.32 * (1 - p);
      });
    },
  };
}