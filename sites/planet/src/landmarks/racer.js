// 橙色赛车 — chunky orange toy race kart, nose pointing +Z.
import * as THREE from 'three';
import { G, mat, gloss, glow, metal, mesh, group, canvasTexture, glowSprite, finalize } from './kit.js';

let M = null;
function materials() {
  if (M) return M;
  // cream roundel with a hand-painted 8
  const decal = canvasTexture(256, 256, (g, w, h) => {
    g.fillStyle = '#f8f0dd'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#e8611d'; g.beginPath(); g.arc(128, 128, 120, 0, 7); g.fill();
    g.fillStyle = '#f8f0dd'; g.beginPath(); g.arc(128, 128, 108, 0, 7); g.fill();
    g.fillStyle = '#e8611d'; g.font = 'bold 168px Georgia, serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText('8', 130, 136);
    g.strokeStyle = '#efbe6a'; g.lineWidth = 7; g.beginPath(); g.arc(128, 128, 114, 0, 7); g.stroke();
  });
  // tyre tread: chunky blocks with soft shadow in the grooves
  const tread = canvasTexture(256, 128, (g, w, h) => {
    g.fillStyle = '#2b2933'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 16; i++) {
      const x = i * 16 + 2, y = (i % 2) * 8;
      g.fillStyle = '#3b3846'; g.fillRect(x, 4 + y * 0.5, 11, 92);
      g.fillStyle = '#4a4756'; g.fillRect(x, 6 + y * 0.5, 11, 8);
      g.fillStyle = '#171620'; g.fillRect(x + 11, 4 + y * 0.5, 4, 92);
    }
    g.fillStyle = '#14131b'; g.fillRect(0, 0, w, 5); g.fillRect(0, h - 5, w, 5);
  }, { repeat: [1, 1] });
  M = {
    orange: gloss(0xf07a22, { roughness: 0.26, clearcoat: 0.95, clearcoatRoughness: 0.12 }),
    cream: gloss(0xf9f1de, { roughness: 0.3, clearcoat: 0.85, clearcoatRoughness: 0.2 }),
    tyre: mat(0xffffff, { map: tread, roughness: 0.92 }),
    hub: gloss(0xf2e4c8, { roughness: 0.34, clearcoat: 0.7 }),
    chrome: metal(0xdfe4ec, 0.2),
    blue: gloss(0x2f6cba, { roughness: 0.38, clearcoat: 0.7 }),
    dark: mat(0x1a1b21, { roughness: 0.72 }),
    lamp: glow(0xfff2cc, 2.0),
    red: glow(0xff5233, 1.5),
    decal: mat(0xffffff, { map: decal, roughness: 0.4 }),
  };
  return M;
}

export function build() {
  const m = materials();
  const root = new THREE.Group();

  // ---------- main pod: lathe revolved, stretched along Z ----------
  const profile = [[0, 0.050], [0.10, 0.051], [0.158, 0.062], [0.197, 0.086], [0.219, 0.118], [0.225, 0.152],
    [0.221, 0.188], [0.206, 0.224], [0.181, 0.258], [0.146, 0.286], [0.103, 0.306], [0.050, 0.316], [0, 0.320]];
  mesh(G.lathe(profile, 32), m.orange, { parent: root, pos: [0, 0, 0.02], scale: [1, 1, 1.46] });
  // belly pan in shadow
  mesh(G.lathe([[0, 0.048], [0.15, 0.050], [0.19, 0.066], [0.20, 0.092], [0, 0.10]], 24), m.dark, { parent: root, pos: [0, 0, 0.02], scale: [0.94, 1, 1.4] });

  // cream racing stripe over the top ridge (a flattened tube following the shell)
  const stripePts = [];
  for (let i = 0; i <= 8; i++) {
    const z = -0.285 + (i / 8) * 0.63;
    const t = Math.min(0.99, Math.abs(z) / 0.3255);
    stripePts.push([0, 0.054 + 0.268 * Math.sqrt(1 - t * t), z + 0.02]);
  }
  mesh(G.tube(stripePts, 0.016, 18, 6), m.cream, { parent: root, scale: [3.9, 1, 1] });


  // ---------- wheels ----------
  const WY = 0.104, WX = 0.297, WZ = 0.288, WR = 0.104, WW = 0.122;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const W = group(root, { pos: [sx * WX, WY, sz * WZ], rot: [0, 0, Math.PI / 2] });
    mesh(G.cyl(WR, WR, WW, 20), m.tyre, { parent: W });
    mesh(G.cyl(WR * 0.6, WR * 0.6, WW + 0.004, 14), m.hub, { parent: W });                 // cream hub
    mesh(G.cyl(WR * 0.57, WR * 0.57, WW + 0.01, 14), m.orange, { parent: W });            // orange insert
    mesh(G.cyl(0.021, 0.021, WW + 0.02, 8), m.chrome, { parent: W });                      // axle cap
    for (let k = 0; k < 3; k++) {                                                          // spokes
      const a = k / 3 * Math.PI * 2;
      mesh(G.box(0.012, 0.062, 0.012, 0.003, 1), m.chrome, { parent: W, pos: [Math.cos(a) * 0.032, Math.sin(a) * 0.032, WW / 2 + 0.004], rot: [0, 0, a + Math.PI / 2] });
    }
    // mudguard: an arc in the wheel's own disc plane, capping the top of the tyre
    mesh(G.torus(WR + 0.019, 0.028, 5, 18, Math.PI * 1.06), m.orange, { parent: W, rot: [Math.PI / 2, 0, -0.06], scale: [1.02, 1, 1] });
    mesh(G.torus(WR + 0.022, 0.0095, 4, 18, Math.PI * 0.98), m.cream, { parent: W, rot: [Math.PI / 2, 0, 0.0], scale: [1.04, 1, 1] });
  }

  // cream flank stripes
  for (const s of [-1, 1]) {
    mesh(G.tube([[-s * 0.196, 0.196, 0.20], [-s * 0.223, 0.196, 0.02], [-s * 0.196, 0.198, -0.16]], 0.013, 10, 5), m.cream, { parent: root });
  }

  // ---------- cockpit ----------
  mesh(G.cyl(0.112, 0.104, 0.05, 22), m.dark, { parent: root, pos: [0, 0.298, 0.0], scale: [1, 1, 1.2] });
  mesh(G.torus(0.113, 0.011, 5, 24), m.cream, { parent: root, pos: [0, 0.318, 0.0], rot: [Math.PI / 2, 0, 0], scale: [1, 1.2, 1] });
  // bucket seat
  mesh(G.box(0.165, 0.05, 0.16, 0.022, 2), m.blue, { parent: root, pos: [0, 0.316, 0.0] });
  mesh(G.box(0.165, 0.140, 0.05, 0.022, 2), m.blue, { parent: root, pos: [0, 0.372, -0.098], rot: [0.18, 0, 0] });
  for (const s of [-1, 1]) {
    mesh(G.box(0.03, 0.075, 0.15, 0.014, 2), m.blue, { parent: root, pos: [s * 0.078, 0.345, 0.004] });
    mesh(G.box(0.028, 0.075, 0.05, 0.012, 2), m.blue, { parent: root, pos: [s * 0.08, 0.372, -0.09], rot: [0.18, 0, 0] });
    mesh(G.box(0.026, 0.007, 0.1, 0.003, 1), m.cream, { parent: root, pos: [s * 0.042, 0.398, -0.072], rot: [0.18, 0, 0] });
  }
  // steering column and wheel
  mesh(G.cyl(0.012, 0.015, 0.09, 8), m.chrome, { parent: root, pos: [0, 0.33, 0.10], rot: [0.6, 0, 0] });
  const SW = group(root, { pos: [0, 0.362, 0.124], rot: [0.92, 0, 0] });
  mesh(G.torus(0.05, 0.011, 6, 20), m.dark, { parent: SW });
  mesh(G.torus(0.05, 0.0035, 4, 20), m.cream, { parent: SW, pos: [0, 0, 0.008] });
  for (let k = 0; k < 3; k++) { const a = k / 3 * Math.PI * 2 - Math.PI / 2; mesh(G.box(0.007, 0.046, 0.007, 0.002, 1), m.chrome, { parent: SW, pos: [Math.cos(a) * 0.024, Math.sin(a) * 0.024, 0], rot: [0, 0, a + Math.PI / 2] }); }
  mesh(G.sphere(0.018, 10, 8), m.chrome, { parent: SW, scale: [1, 1, 0.75] });

  // ---------- side number roundels ----------
  for (const s of [-1, 1]) {
    mesh(G.cyl(0.078, 0.078, 0.01, 22), m.cream, { parent: root, pos: [s * 0.215, 0.178, -0.01], rot: [0, 0, (s * Math.PI) / 2] });
    mesh(G.cyl(0.069, 0.069, 0.005, 22), m.decal, { parent: root, pos: [s * 0.2235, 0.178, -0.01], rot: [0, 0, (s * -Math.PI) / 2] });
  }

  // ---------- nose: bumper, grille, lamps ----------
  mesh(G.cyl(0.019, 0.019, 0.25, 10), m.chrome, { parent: root, pos: [0, 0.108, 0.466], rot: [0, 0, Math.PI / 2] });
  for (const s of [-1, 1]) mesh(G.box(0.028, 0.048, 0.07, 0.011, 2), m.orange, { parent: root, pos: [s * 0.132, 0.108, 0.432] });
  mesh(G.box(0.24, 0.05, 0.062, 0.022, 2), m.cream, { parent: root, pos: [0, 0.104, 0.44] });
  mesh(G.box(0.2, 0.012, 0.05, 0.005, 1), m.dark, { parent: root, pos: [0, 0.104, 0.4665] });
  for (const s of [-1, 1]) {
    mesh(G.sphere(0.026, 12, 9), m.lamp, { parent: root, pos: [s * 0.075, 0.164, 0.386], scale: [1, 1, 0.72] });
    mesh(G.torus(0.027, 0.0058, 4, 14), m.chrome, { parent: root, pos: [s * 0.075, 0.164, 0.378] });
    const halo = glowSprite(0xffe6a8, 0.105, 0.5); halo.position.set(s * 0.075, 0.166, 0.404); root.add(halo);
    mesh(G.box(0.024, 0.03, 0.05, 0.008, 2), m.orange, { parent: root, pos: [s * 0.088, 0.234, 0.288] }); // mirror pods
  }
  mesh(G.box(0.14, 0.009, 0.07, 0.004, 1), m.cream, { parent: root, pos: [0, 0.208, 0.318], rot: [0.16, 0, 0] }); // nose fin

  // ---------- rear: spoiler, exhausts, tail lights ----------
  for (const s of [-1, 1]) {
    mesh(G.box(0.030, 0.145, 0.042, 0.011, 2), m.dark, { parent: root, pos: [s * 0.130, 0.312, -0.345], rot: [-0.50, 0, 0] });
    mesh(G.cyl(0.019, 0.022, 0.075, 10), m.chrome, { parent: root, pos: [s * 0.078, 0.118, -0.372], rot: [Math.PI / 2, 0, 0] });
    mesh(G.cyl(0.0145, 0.0145, 0.08, 8), m.dark, { parent: root, pos: [s * 0.078, 0.118, -0.376], rot: [Math.PI / 2, 0, 0] });
    mesh(G.sphere(0.023, 10, 8), m.red, { parent: root, pos: [s * 0.128, 0.196, -0.318], scale: [1, 0.72, 0.55] });
  }
  mesh(G.box(0.37, 0.028, 0.10, 0.012, 2), m.orange, { parent: root, pos: [0, 0.362, -0.432], rot: [0.12, 0, 0] });
  mesh(G.box(0.38, 0.007, 0.018, 0.003, 1), m.cream, { parent: root, pos: [0, 0.376, -0.440], rot: [0.12, 0, 0] });
  for (const s of [-1, 1]) mesh(G.box(0.018, 0.042, 0.108, 0.007, 2), m.cream, { parent: root, pos: [s * 0.184, 0.362, -0.432], rot: [0.1, 0, 0] });

  finalize(root);
  return {
    group: root,
    update(t) {
      root.position.y = Math.sin(t * 2.05) * 0.0055;
      root.rotation.x = Math.sin(t * 1.65 + 0.5) * 0.009;
      root.rotation.z = Math.sin(t * 1.25 + 1.0) * 0.007;
    },
  };
}