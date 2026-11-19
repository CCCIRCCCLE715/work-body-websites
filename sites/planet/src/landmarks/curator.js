// 拌面野餐桌 — a tiny warm-wood picnic table with two mint cushions, a big blue-rimmed bowl of
// mixed noodles, chopsticks, a soy bottle, a gingham napkin and lazy rising steam.
import * as THREE from 'three';
import { G, mat, gloss, glow, metal, mesh, group, canvasTexture, glowSprite, finalize } from './kit.js';

let M = null;
function materials() {
  if (M) return M;

  // warm plank grain
  const plankTex = canvasTexture(256, 256, (g, w, h) => {
    const grd = g.createLinearGradient(0, 0, 0, h);
    grd.addColorStop(0, '#d79a56'); grd.addColorStop(0.45, '#c98b47'); grd.addColorStop(1, '#b97c3d');
    g.fillStyle = grd; g.fillRect(0, 0, w, h);
    let s = 99;
    const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < 70; i++) {
      const y = rnd() * h, len = 40 + rnd() * 180, x = rnd() * w;
      g.strokeStyle = 'rgba(' + (120 + rnd() * 40 | 0) + ',' + (78 + rnd() * 30 | 0) + ',40,' + (0.10 + rnd() * 0.22).toFixed(2) + ')';
      g.lineWidth = 0.7 + rnd() * 2.4; g.beginPath(); g.moveTo(x, y);
      g.quadraticCurveTo(x + len * 0.5, y + (rnd() - 0.5) * 7, x + len, y + (rnd() - 0.5) * 3); g.stroke();
    }
    // a couple of knots
    for (let i = 0; i < 3; i++) {
      const x = rnd() * w, y = rnd() * h;
      for (let k = 3; k > 0; k--) { g.strokeStyle = 'rgba(130,84,42,0.28)'; g.lineWidth = 1.6; g.beginPath(); g.ellipse(x, y, 3 * k, 1.7 * k, 0.4, 0, 7); g.stroke(); }
    }
    g.fillStyle = 'rgba(255,226,180,0.16)'; g.fillRect(0, 0, w, 6);
    // seams at the top and bottom edges of each board (v wraps board to board)
    g.fillStyle = 'rgba(96,58,26,0.75)'; g.fillRect(0, 0, w, 9); g.fillRect(0, h - 9, w, 9);
    g.fillStyle = 'rgba(255,232,196,0.22)'; g.fillRect(0, 9, w, 4); g.fillRect(0, h - 13, w, 4);
  });

  // cream ceramic with a blue rim pattern (v runs along the profile)
  const bowlTex = canvasTexture(512, 256, (g, w, h) => {
    const grd = g.createLinearGradient(0, 0, 0, h);
    grd.addColorStop(0, '#fffdf6'); grd.addColorStop(0.55, '#fdf4e4'); grd.addColorStop(1, '#f4e6d0');
    g.fillStyle = grd; g.fillRect(0, 0, w, h);
    const blue = '#3f7ec9', pale = '#8fbbe8';
    // band
    g.fillStyle = 'rgba(63,126,201,0.92)'; g.fillRect(0, h * 0.40, w, h * 0.20);
    g.fillStyle = '#fdf6ea'; g.fillRect(0, h * 0.415, w, h * 0.012);
    g.fillStyle = pale; g.fillRect(0, h * 0.58, w, h * 0.008);
    // wave motif inside the band
    for (let i = 0; i < 26; i++) {
      const x = i * (w / 26) + 6;
      g.strokeStyle = 'rgba(255,255,255,0.85)'; g.lineWidth = 2.4; g.lineCap = 'round';
      g.beginPath(); g.arc(x, h * 0.47, 5.5, Math.PI * 1.05, Math.PI * 1.95); g.stroke();
      g.beginPath(); g.arc(x + 6, h * 0.51, 4.2, Math.PI * 0.05, Math.PI * 0.95); g.stroke();
      g.fillStyle = 'rgba(255,255,255,0.9)'; g.beginPath(); g.arc(x + 3, h * 0.545, 1.7, 0, 7); g.fill();
    }
    g.fillStyle = 'rgba(63,126,201,0.35)'; g.fillRect(0, h * 0.36, w, h * 0.006);
    g.fillStyle = 'rgba(255,255,255,0.5)'; g.fillRect(0, h * 0.20, w, 3);
  });

  // pink gingham
  const gingham = canvasTexture(128, 128, (g, w, h) => {
    g.fillStyle = '#fff3f2'; g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(238,124,140,0.55)';
    for (let i = 0; i < 4; i++) { g.fillRect(i * 32, 0, 16, h); g.fillRect(0, i * 32, w, 16); }
    g.fillStyle = 'rgba(214,86,110,0.35)';
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) g.fillRect(i * 32, j * 32, 16, 16);
  }, { repeat: [2, 2] });

  M = {
    wood: gloss(0xffe6c4, { map: plankTex, roughness: 0.62, clearcoat: 0.25, clearcoatRoughness: 0.5 }),
    woodDark: mat(0x9c6435, { roughness: 0.75 }),
    mint: gloss(0xa8ecc8, { roughness: 0.5, clearcoat: 0.4, emissive: 0x2e7a55, emissiveIntensity: 0.10 }),
    bowl: gloss(0xffffff, { map: bowlTex, roughness: 0.16, clearcoat: 1, clearcoatRoughness: 0.06 }),
    noodle: gloss(0xf6d98f, { roughness: 0.16, clearcoat: 1, clearcoatRoughness: 0.08, emissive: 0x6a4a12, emissiveIntensity: 0.12 }),
    green: gloss(0x7cc94a, { roughness: 0.4 }),
    red: gloss(0xd8342a, { roughness: 0.35, clearcoat: 0.7 }),
    yolk: gloss(0xf7ac35, { roughness: 0.3, clearcoat: 0.8 }),
    cream: gloss(0xfffaf0, { roughness: 0.28 }),
    cloth: mat(0xffffff, { map: gingham, roughness: 0.92 }),
  };
  return M;
}

export function build() {
  const m = materials();
  const root = new THREE.Group();
  const steam = [];

  // ---------- table top: five planks running the long way ----------
  const TW = 0.966, TOPY = 0.372;
  for (let i = 0; i < 6; i++) {
    const z = -0.172 + i * 0.0688;
    mesh(G.box(TW, 0.05, 0.062, 0.007, 1), m.wood, { parent: root, pos: [0, TOPY - 0.025, z] });
  }
  // rails + cross braces beneath
  for (const z of [-0.155, 0.155]) mesh(G.box(TW - 0.06, 0.028, 0.024, 0.005, 1), m.woodDark, { parent: root, pos: [0, TOPY - 0.064, z] });
  for (const x of [-0.38, 0.38]) mesh(G.box(0.03, 0.03, 0.33, 0.005, 1), m.woodDark, { parent: root, pos: [x, TOPY - 0.064, 0] });

  // ---------- A-frame legs, benches, mint cushions ----------
  const legA = Math.atan2(0.247, 0.29), legL = Math.hypot(0.247, 0.29) + 0.03;
  for (const x of [-0.34, 0.34]) {
    for (const s of [-1, 1]) {
      mesh(G.box(0.036, legL, 0.03, 0.008, 1), m.woodDark, {
        parent: root, pos: [x, 0.172, s * 0.112], rot: [s * -legA, 0, 0],
      });
      // bench post + rail
      mesh(G.box(0.03, 0.145, 0.026, 0.006, 1), m.woodDark, { parent: root, pos: [x, 0.098, s * 0.417] });
      mesh(G.box(0.05, 0.022, 0.10, 0.006, 1), m.woodDark, { parent: root, pos: [x, 0.166, s * 0.367] });
    }
    mesh(G.box(0.03, 0.024, 0.26, 0.006, 1), m.woodDark, { parent: root, pos: [x, 0.052, 0] });          // low stretcher
  }
  // bench seats (two planks per side)
  for (const s of [-1, 1]) for (const dz of [-0.037, 0.037]) {
    mesh(G.box(0.92, 0.036, 0.072, 0.007, 1), m.wood, { parent: root, pos: [0, 0.185, s * 0.414 + dz] });
  }
  for (const s of [-1, 1]) mesh(G.box(0.86, 0.022, 0.13, 0.006, 1), m.woodDark, { parent: root, pos: [0, 0.196, s * 0.414] }); // bench underframe
  // mint cushions
  for (const s of [-1, 1]) for (const x of [-0.238, 0.238]) {
    mesh(G.box(0.36, 0.032, 0.152, 0.014, 2), m.mint, { parent: root, pos: [x, 0.209, s * 0.414] });
    mesh(G.box(0.30, 0.006, 0.102, 0.003, 2), m.mint, { parent: root, pos: [x, 0.226, s * 0.414] });   // puff
    for (const t of [-1, 1]) mesh(G.sphere(0.011, 8, 6), m.cream, { parent: root, pos: [x + t * 0.168, 0.215, s * 0.414], scale: [1, 0.9, 1] }); // button
  }

  // ---------- the big noodle bowl ----------
  const B = group(root, { pos: [0, TOPY, -0.005] });
  const bowlPts = [[0, 0], [0.056, 0.002], [0.062, 0.016], [0.094, 0.038], [0.136, 0.072], [0.168, 0.101], [0.178, 0.119],
    [0.170, 0.124], [0.158, 0.111], [0.124, 0.081], [0.084, 0.05], [0.056, 0.034], [0, 0.031]];
  mesh(G.lathe(bowlPts, 40), m.bowl, { parent: B });
  mesh(G.torus(0.1745, 0.0038, 4, 40), m.cream, { parent: B, pos: [0, 0.1215, 0], rot: [Math.PI / 2, 0, 0] }); // rim lip
  mesh(G.torus(0.1745, 0.0016, 3, 40), m.bowl, { parent: B, pos: [0, 0.1245, 0], rot: [Math.PI / 2, 0, 0] });
  // foot ring
  mesh(G.torus(0.06, 0.0085, 4, 24), m.bowl, { parent: B, pos: [0, 0.009, 0], rot: [Math.PI / 2, 0, 0] });

  // noodles: a glossy mound plus loose strands looping over the rim
  mesh(G.sphere(0.158, 16, 12), m.noodle, { parent: B, pos: [0, 0.089, 0], scale: [1, 0.46, 1] });
  mesh(G.sphere(0.112, 14, 10), m.noodle, { parent: B, pos: [0.028, 0.113, -0.022], scale: [1.06, 0.55, 1] });
  mesh(G.sphere(0.072, 12, 9), m.noodle, { parent: B, pos: [-0.035, 0.132, 0.02], scale: [1, 0.6, 1] });
  let sd = 3;
  const rnd = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2 + 0.3, r = 0.118 + rnd() * 0.022;
    mesh(G.torus(r, 0.0085, 4, 10, Math.PI * (0.85 + rnd() * 0.5)), m.noodle, {
      parent: B, pos: [Math.cos(a) * 0.028, 0.086 + rnd() * 0.02, Math.sin(a) * 0.028],
      rot: [Math.PI / 2 - 0.32 - rnd() * 0.2, 0, a + Math.PI * 0.5],
    });
  }
  for (let i = 0; i < 5; i++) {
    const a = i / 5 * Math.PI * 2 + 1.1;
    mesh(G.torus(0.055 + rnd() * 0.05, 0.0085, 4, 10, Math.PI * 1.2), m.noodle, {
      parent: B, pos: [0, 0.10, 0], rot: [Math.PI / 2 - 0.15, 0, a],
    });
  }

  // ---------- toppings ----------
  // green onion rings
  for (let i = 0; i < 14; i++) {
    const a = rnd() * Math.PI * 2, r = rnd() * 0.12;
    const p = [Math.cos(a) * r, 0.136 + (1 - r / 0.125) * 0.022, Math.sin(a) * r];
    mesh(G.torus(0.013 + rnd() * 0.006, 0.0045, 3, 7), m.green, { parent: B, pos: p, rot: [Math.PI / 2 + (rnd() - 0.5) * 0.5, 0, rnd() * 3] });
  }
  // chili slices
  for (let i = 0; i < 5; i++) {
    const a = 0.7 + i * 1.15, r = 0.05 + rnd() * 0.055;
    const p = [Math.cos(a) * r, 0.142 + rnd() * 0.014, Math.sin(a) * r];
    mesh(G.cyl(0.019, 0.019, 0.006, 12, true), m.red, { parent: B, pos: p, rot: [(rnd() - 0.5) * 0.4, 0, 0] });
    mesh(G.torus(0.0185, 0.0038, 4, 10), m.red, { parent: B, pos: [p[0], p[1] + 0.002, p[2]], rot: [Math.PI / 2, 0, 0] });
  }
  // egg halves
  for (const [ex, ez, er] of [[-0.066, 0.05, 0.4], [0.062, -0.056, 2.6]]) {
    const egg = group(B, { pos: [ex, 0.128, ez], rot: [0, er, 0] });
    mesh(G.sphere(0.041, 14, 10), m.cream, { parent: egg, pos: [0, 0.012, 0], scale: [1.15, 0.64, 1] });
    mesh(G.cyl(0.028, 0.028, 0.008, 14), m.yolk, { parent: egg, pos: [0, 0.034, 0], scale: [1, 1, 0.92] });
    mesh(G.sphere(0.021, 12, 8), m.yolk, { parent: egg, pos: [0, 0.034, 0], scale: [1, 0.34, 0.92] });
  }
  // sesame
  for (let i = 0; i < 10; i++) {
    const a = rnd() * Math.PI * 2, r = rnd() * 0.11;
    mesh(G.sphere(0.0045, 6, 5), m.cream, { parent: B, pos: [Math.cos(a) * r, 0.146, Math.sin(a) * r], scale: [1.5, 0.7, 1] });
  }
  // chopsticks resting across the bowl
  for (let i = 0; i < 2; i++) {
    mesh(G.cyl(0.0055, 0.0072, 0.34, 7), m.woodDark, {
      parent: B, pos: [0.078 + i * 0.022, 0.143, 0.005], rot: [0, 0, Math.PI / 2 - 0.22 + i * 0.06],
    });
    mesh(G.cyl(0.006, 0.006, 0.02, 7), m.woodDark, { parent: B, pos: [0.078 + i * 0.022, 0.143, 0.005], rot: [0, 0, Math.PI / 2 - 0.22 + i * 0.06] });
  }

  // ---------- soy bottle + gingham napkin ----------
  const SB = group(root, { pos: [0.335, TOPY, 0.012], rot: [0, -0.25, 0] });
  mesh(G.lathe([[0, 0], [0.031, 0], [0.033, 0.008], [0.031, 0.04], [0.022, 0.062], [0.013, 0.076], [0.0135, 0.088], [0, 0.088]], 20), m.woodDark, { parent: SB });
  mesh(G.cyl(0.016, 0.016, 0.012, 14), m.cream, { parent: SB, pos: [0, 0.09, 0] });
  mesh(G.cyl(0.011, 0.011, 0.006, 12), m.woodDark, { parent: SB, pos: [0, 0.098, 0] });
  mesh(G.box(0.046, 0.028, 0.004, 0.002, 1), m.cream, { parent: SB, pos: [0, 0.05, 0.0305] }); // label

  const NP = group(root, { pos: [-0.335, TOPY, -0.01], rot: [0, 0.3, 0] });
  mesh(G.box(0.17, 0.007, 0.135, 0.005, 1), m.cloth, { parent: NP, pos: [0, 0.004, 0] });
  mesh(G.box(0.145, 0.006, 0.11, 0.004, 1), m.cloth, { parent: NP, pos: [0.006, 0.011, 0.004], rot: [0, 0.16, 0] });
  mesh(G.box(0.10, 0.005, 0.07, 0.004, 1), m.cloth, { parent: NP, pos: [-0.008, 0.017, -0.002], rot: [0, -0.22, 0] });

  // ---------- rising steam ----------
  for (let i = 0; i < 7; i++) {
    const s = glowSprite(0xfff8ee, 0.06, 0.0);
    s.position.set((rnd() - 0.5) * 0.14, 0.20, (rnd() - 0.5) * 0.14);
    root.add(s);
    steam.push({ s, k: i / 7, ox: (rnd() - 0.5) * 0.10, oz: (rnd() - 0.5) * 0.10, sp: 0.16 + rnd() * 0.08 });
  }

  finalize(root);
  return {
    group: root,
    update(t) {
      steam.forEach(({ s, k, ox, oz, sp }, i) => {
        const p = (t * sp + k) % 1;
        s.position.set(Math.sin(t * 0.9 + i * 1.7) * 0.022 + ox, 0.19 + p * 0.29, Math.cos(t * 0.7 + i) * 0.016 + oz);
        const sc = 0.06 + p * 0.10;
        s.scale.setScalar(sc);
        s.material.opacity = Math.sin(Math.min(1, p * 1.6) * Math.PI) * 0.68;
      });
    },
  };
}