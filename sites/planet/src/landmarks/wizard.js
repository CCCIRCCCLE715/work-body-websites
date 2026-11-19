// 巫师玩偶 — chibi wizard designer-toy figurine on a cream display base.
import * as THREE from 'three';
import { G, mat, gloss, glow, metal, mesh, group, canvasTexture, glowSprite, finalize } from './kit.js';

let M = null;
function materials() {
  if (M) return M;
  // lilac robe cloth with scattered gold stars (canvas)
  const robeTex = canvasTexture(256, 256, (g, w, h) => {
    const grd = g.createLinearGradient(0, 0, 0, h);
    grd.addColorStop(0, '#ab8fec'); grd.addColorStop(0.55, '#9d81e2'); grd.addColorStop(1, '#8b6dd2');
    g.fillStyle = grd; g.fillRect(0, 0, w, h);
    const star = (x, y, r, col) => {
      g.fillStyle = col; g.beginPath();
      for (let i = 0; i < 10; i++) {
        const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.44 : r;
        const px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr;
        i ? g.lineTo(px, py) : g.moveTo(px, py);
      }
      g.closePath(); g.fill();
    };
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
      const x = 14 + i * 64 + (j % 2) * 30, y = 18 + j * 62;
      star(x, y, 13, '#ffe9a6');
      if ((i + j) % 3 === 0) star(x + 32, y + 28, 6.5, '#fff6d8');
    }
  }, { repeat: [3, 1.4] });
  M = {
    cream: mat(0xf8eeda, { roughness: 0.7 }),
    robe: gloss(0xffffff, { map: robeTex, roughness: 0.52, clearcoat: 0.35, clearcoatRoughness: 0.5 }),
    hat: gloss(0x7a5ecb, { roughness: 0.46, clearcoat: 0.5, clearcoatRoughness: 0.36 }),
    skin: mat(0xf9ddc0, { roughness: 0.6, emissive: 0xa87050, emissiveIntensity: 0.22 }),
    black: mat(0x28232f, { roughness: 0.5 }),
    gold: metal(0xe9bd5e, 0.28),
    wood: mat(0x9d6c46, { roughness: 0.82 }),
    blush: mat(0xf49ba4, { roughness: 0.75 }),
    lens: gloss(0xdcecff, { transparent: true, opacity: 0.22, roughness: 0.08, clearcoat: 1, depthWrite: false }),
    starGlow: glow(0xffd76a, 2.2),
  };
  return M;
}

function starShape(ro, ri) {
  const s = new THREE.Shape();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? ri : ro;
    const x = Math.cos(a) * r, y = Math.sin(a) * r;
    i ? s.lineTo(x, y) : s.moveTo(x, y);
  }
  s.closePath(); return s;
}

/** Real partial sphere (kit's G.sphere ignores phi/theta args). */
function spherePart(r, ws, hs, ps, pl, ts, tl) { return new THREE.SphereGeometry(r, ws, hs, ps, pl, ts, tl); }

export function build() {
  const m = materials();
  const root = new THREE.Group();
  const anim = {};

  // ---------- cream display base ----------
  mesh(G.lathe([[0, 0], [0.11, 0], [0.168, 0.005], [0.196, 0.017], [0.201, 0.03], [0.194, 0.042], [0.168, 0.051], [0.10, 0.055], [0, 0.056]], 36), m.cream, { parent: root });
  mesh(G.torus(0.1965, 0.0055, 5, 34), m.gold, { parent: root, pos: [0, 0.030, 0], rot: [Math.PI / 2, 0, 0] });
  mesh(G.torus(0.134, 0.0035, 4, 28), m.gold, { parent: root, pos: [0, 0.0562, 0], rot: [Math.PI / 2, 0, 0] });
  mesh(G.extrude(starShape(0.03, 0.013), 0.006, 0.002, 1), m.gold, { parent: root, pos: [0, 0.0575, 0.128], rot: [-Math.PI / 2, 0, 0] });

  // ---------- little boots, toes peeking out under the hem ----------
  for (const s of [-1, 1]) {
    mesh(G.capsule(0.031, 0.06, 4, 12), m.black, { parent: root, pos: [s * 0.052, 0.086, 0.028], rot: [0.42, s * 0.1, 0] });
    mesh(G.sphere(0.033, 14, 10), m.black, { parent: root, pos: [s * 0.054, 0.078, 0.083], scale: [1, 0.72, 1.12] });   // toe
    mesh(G.torus(0.0315, 0.007, 5, 16), m.gold, { parent: root, pos: [s * 0.052, 0.086, 0.018], rot: [0.42 + Math.PI / 2, 0, 0], scale: [1, 1, 0.7] }); // cuff
    mesh(G.box(0.05, 0.008, 0.03, 0.003, 1), m.black, { parent: root, pos: [s * 0.054, 0.056, 0.085] });              // sole
  }

  // ---------- robe ----------
  const R = group(root, { pos: [0, 0.104, 0] });
  mesh(G.lathe([[0, 0], [0.126, 0.003], [0.133, 0.026], [0.129, 0.058], [0.119, 0.104], [0.108, 0.152], [0.1, 0.196], [0.094, 0.229], [0.073, 0.254], [0.045, 0.263], [0, 0.266]], 32), m.robe, { parent: R });
  mesh(G.torus(0.1305, 0.0075, 5, 30), m.gold, { parent: R, pos: [0, 0.014, 0], rot: [Math.PI / 2, 0, 0] });     // hem trim
  mesh(G.torus(0.1085, 0.0065, 5, 30), m.gold, { parent: R, pos: [0, 0.146, 0], rot: [Math.PI / 2, 0, 0] });    // belt
  mesh(G.extrude(starShape(0.026, 0.011), 0.006, 0.002, 1), m.gold, { parent: R, pos: [0, 0.157, 0.106] });     // buckle
  mesh(G.torus(0.058, 0.011, 5, 22), m.cream, { parent: R, pos: [0, 0.253, 0.004], rot: [Math.PI / 2 - 0.08, 0, 0] }); // collar

  // ---------- arms ----------
  const armPts = s => [[s * 0.078, 0.352, 0.018], [s * 0.106, 0.316, 0.056], [s * 0.12, 0.274, 0.092], [s * 0.126, 0.248, s > 0 ? 0.114 : 0.09]];
  for (const s of [-1, 1]) {
    const pts = armPts(s);
    mesh(G.tube(pts, 0.0300, 14, 7), m.robe, { parent: root });
    const h = pts[3];
    mesh(G.torus(0.0305, 0.008, 5, 16), m.cream, { parent: root, pos: [h[0], h[1] + 0.013, h[2]], rot: [Math.PI / 2 - 0.4 * s, 0, 0] });
    mesh(G.sphere(0.0315, 14, 10), m.skin, { parent: root, pos: h, scale: [1, 0.95, 1] });
  }

  // ---------- head ----------
  const HEAD = 0.516;
  mesh(G.sphere(0.155, 24, 16), m.skin, { parent: root, pos: [0, HEAD, 0], scale: [1.02, 0.99, 0.97] });
  // hair: a crown cap that stops above the brow, a back mass, sideburns, a soft fringe lock
  mesh(spherePart(0.1585, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.37), m.black, { parent: root, pos: [0, HEAD, -0.002], scale: [1.02, 1.02, 1.03] });
  mesh(spherePart(0.1595, 16, 12, Math.PI * 0.72, Math.PI * 1.56, 0, Math.PI * 0.62), m.black, { parent: root, pos: [0, HEAD - 0.004, -0.004], scale: [1.0, 1.02, 1.02] });
  for (const s of [-1, 1]) mesh(G.sphere(0.058, 12, 9), m.black, { parent: root, pos: [s * 0.142, HEAD - 0.016, -0.032], scale: [0.5, 1.05, 0.9] });
  mesh(G.sphere(0.055, 14, 9), m.black, { parent: root, pos: [0, HEAD + 0.086, 0.088], scale: [1.55, 0.36, 0.95] });
  mesh(G.sphere(0.045, 12, 8), m.black, { parent: root, pos: [0.080, HEAD + 0.074, 0.078], scale: [0.85, 0.36, 0.85] });
  mesh(G.sphere(0.045, 12, 8), m.black, { parent: root, pos: [-0.082, HEAD + 0.070, 0.080], scale: [0.8, 0.34, 0.85] });
  // face: big watchful eyes behind round black glasses
  for (const s of [-1, 1]) {
    mesh(G.sphere(0.036, 16, 12), m.cream, { parent: root, pos: [s * 0.068, HEAD + 0.004, 0.122], scale: [1, 1.06, 0.72] });
    mesh(G.sphere(0.0205, 14, 10), m.black, { parent: root, pos: [s * 0.070, HEAD + 0.001, 0.1385], scale: [1, 1.02, 0.5] });
    mesh(G.sphere(0.0064, 8, 6), m.cream, { parent: root, pos: [s * 0.0765, HEAD + 0.010, 0.1495] });
    mesh(G.torus(0.0450, 0.0050, 5, 22), m.black, { parent: root, pos: [s * 0.068, HEAD + 0.004, 0.1375], rot: [0, s * -0.22, 0] });
    mesh(G.cyl(0.0425, 0.0425, 0.004, 20), m.lens, { parent: root, pos: [s * 0.068, HEAD + 0.004, 0.1385], rot: [Math.PI / 2, s * -0.22, 0] });
    mesh(G.box(0.006, 0.0062, 0.056, 0.0025, 1), m.black, { parent: root, pos: [s * 0.1115, HEAD + 0.011, 0.100], rot: [0, s * 0.5, 0] });
    mesh(G.sphere(0.031, 12, 8), m.blush, { parent: root, pos: [s * 0.100, HEAD - 0.056, 0.104], scale: [1, 0.55, 0.16] });
  }
  mesh(G.box(0.030, 0.0062, 0.008, 0.0025, 1), m.black, { parent: root, pos: [0, HEAD + 0.012, 0.1405] });
  mesh(G.torus(0.0185, 0.0044, 4, 12, Math.PI), m.black, { parent: root, pos: [0, HEAD - 0.066, 0.1315], rot: [0, 0, Math.PI] });
  mesh(G.sphere(0.0135, 10, 8), m.skin, { parent: root, pos: [0, HEAD - 0.038, 0.1445], scale: [1, 0.74, 0.9] });

  // ---------- hat ----------
  const HAT = group(root, { pos: [0, HEAD + 0.146, -0.012], rot: [-0.20, 0, 0], scale: [1, 1, 0.97] });
  mesh(G.lathe([[0, 0.009], [0.17, 0.003], [0.25, -0.005], [0.298, 0.002], [0.311, 0.013], [0.303, 0.019], [0.21, 0.023], [0, 0.025]], 34), m.hat, { parent: HAT });
  mesh(G.cyl(0.203, 0.208, 0.031, 26, true), m.gold, { parent: HAT, pos: [0, 0.029, 0] });
  mesh(G.extrude(starShape(0.024, 0.0102), 0.005, 0.0018, 1), m.gold, { parent: HAT, pos: [0, 0.031, 0.196], rot: [-0.06, 0, 0] });

  // bent cone tip (dynamic for a soft sway)
  const tip = group(HAT, { pos: [0, 0.026, 0], dynamic: true });
  const coneGeo = G.cyl(0.023, 0.194, 0.29, 24);
  {
    const p = coneGeo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const t = (p.getY(i) + 0.145) / 0.29;
      p.setZ(i, p.getZ(i) - t * t * 0.150 - t * t * t * 0.055);
      p.setX(i, p.getX(i) * (1 - 0.06 * t));
    }
    coneGeo.computeVertexNormals();
  }
  mesh(coneGeo, m.hat, { parent: tip, pos: [0, 0.145, 0] });
  anim.tip = tip;

  // ---------- wand + glowing star ----------
  const W = group(root, { pos: [0.126, 0.252, 0.11], rot: [0.26, 0, -0.30] });
  mesh(G.cyl(0.0065, 0.0095, 0.3, 9), m.wood, { parent: W, pos: [0, 0.08, 0] });
  for (let i = 0; i < 2; i++) mesh(G.torus(0.0105, 0.0025, 4, 10), m.wood, { parent: W, pos: [0, -0.05 + i * 0.042, 0], rot: [Math.PI / 2, 0, 0], scale: [1, 1, 0.5] });
  const starHolder = group(W, { pos: [0, 0.245, 0], dynamic: true });
  const star = mesh(G.extrude(starShape(0.058, 0.025), 0.017, 0.005, 1), m.starGlow, { parent: starHolder, pos: [0, 0, -0.0085], dynamic: true });
  const halo = glowSprite(0xffd88a, 0.2, 0.85); starHolder.add(halo);
  anim.star = star; anim.halo = halo;

  finalize(root);
  return {
    group: root,
    update(t) {
      anim.tip.rotation.z = Math.sin(t * 1.15) * 0.045;
      anim.tip.rotation.x = Math.sin(t * 1.15 + 1.2) * 0.028 - 0.015;
      const tw = 0.5 + 0.5 * Math.sin(t * 3.1);
      anim.star.material.emissiveIntensity = 1.5 + tw * 1.5;
      anim.star.rotation.z = Math.sin(t * 0.9) * 0.18;
      anim.halo.scale.setScalar(0.17 + tw * 0.07);
      anim.halo.material.opacity = 0.5 + tw * 0.45;
    },
  };
}