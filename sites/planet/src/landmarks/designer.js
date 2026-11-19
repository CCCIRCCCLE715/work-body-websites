// 设计色卡 — a short cream pedestal desk with a fan of giant colour-swatch cards and a red apple.
import * as THREE from 'three';
import { G, mat, gloss, metal, mesh, group, canvasTexture, glowSprite, finalize, roundRect } from './kit.js';

const CW = 0.30, CH = 0.70, CR = 0.085;   // swatch card: width, height, corner radius
const TOP = 0.27;                          // desk surface height
const AW = 1536, AH = 1536;                // atlas: 3 front cells on top, 3 backs below

// atlas rectangles in px  [x, y, w, h]
const CELL = 512;
const FRONT = [0, 1, 2].map((c) => [c * CELL, 0, CELL, 1024]);
const BACK = [0, 1, 2].map((c) => [c * CELL, 1024, CELL, 512]);

function rectUV(r) { return [r[0] / AW, 1 - (r[1] + r[3]) / AH, (r[0] + r[2]) / AW, 1 - r[1] / AH]; }

function rrect(g, x, y, w, h, r) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.lineTo(x + w - r, y); g.quadraticCurveTo(x + w, y, x + w, y + r);
  g.lineTo(x + w, y + h - r); g.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  g.lineTo(x + r, y + h); g.quadraticCurveTo(x, y + h, x, y + h - r);
  g.lineTo(x, y + r); g.quadraticCurveTo(x, y, x + r, y);
  g.closePath();
}

const BASE = ['#f2856c', '#a2c8aa', '#88aedb'];
const DEEP = ['#c9573f', '#6c9775', '#557cad'];
const PALE = ['#ffd8cd', '#ddeee3', '#d9e8f8'];
const NAME = ['CLAY 01', 'SAGE 02', 'SKY 03'];
const CHIPS = [
  ['#ffd8cd', '#f7b59f', '#f2856c', '#c9573f', '#fff7ec', '#e6c3a0'],
  ['#ddeee3', '#c0ddc7', '#a2c8aa', '#6c9775', '#fff7ec', '#e6c3a0'],
  ['#d9e8f8', '#b3cfee', '#88aedb', '#557cad', '#fff7ec', '#e6c3a0'],
];

function cardAtlas() {
  return canvasTexture(AW, AH, (g) => {
    // ---- front faces (512 x 1024 each) ----
    for (let c = 0; c < 3; c++) {
      const r = FRONT[c], x0 = r[0], C = r[2], Hh = r[3];
      g.fillStyle = BASE[c]; g.fillRect(x0, 0, C, Hh);
      rrect(g, x0 + 26, 28, C - 52, Hh - 56, 40);
      g.fillStyle = '#fffaf2'; g.fill();
      rrect(g, x0 + 50, 54, C - 100, 206, 24);
      const grd = g.createLinearGradient(x0 + 50, 54, x0 + C - 50, 260);
      grd.addColorStop(0, PALE[c]); grd.addColorStop(1, BASE[c]);
      g.fillStyle = grd; g.fill();
      g.textAlign = 'center';
      g.fillStyle = DEEP[c]; g.font = 'bold 54px Helvetica, Arial, sans-serif';
      g.fillText(NAME[c], x0 + C / 2, 148);
      g.fillStyle = 'rgba(75,62,56,0.5)'; g.font = '600 24px Helvetica, Arial, sans-serif';
      g.fillText('BRAND PALETTE  /  06', x0 + C / 2, 190);
      for (let k = 0; k < 4; k++) {
        g.beginPath(); g.arc(x0 + C / 2 - 51 + k * 34, 226, 9, 0, 7);
        g.fillStyle = CHIPS[c][k % 4]; g.fill();
      }
      const gap = 16, cw = (C - 100 - gap * 2) / 3, chh = 168;
      for (let row = 0; row < 3; row++) for (let k = 0; k < 3; k++) {
        const x = x0 + 50 + k * (cw + gap), y = 300 + row * (chh + 18);
        rrect(g, x, y, cw, chh, 14);
        g.fillStyle = CHIPS[c][(row * 3 + k) % 6]; g.fill();
        g.strokeStyle = 'rgba(80,66,58,0.10)'; g.lineWidth = 2; g.stroke();
        g.fillStyle = 'rgba(70,58,50,0.55)'; g.font = '600 19px Helvetica, Arial, sans-serif';
        g.fillText('#' + ((row * 3 + k) % 6) + '0' + (c + 1), x + cw / 2, y + chh - 16);
      }
      g.fillStyle = 'rgba(70,58,50,0.4)'; g.font = '600 22px Helvetica, Arial, sans-serif';
      g.fillText('PRINT  ·  SCREEN  ·  PACKAGE', x0 + C / 2, 930);
    }
    // ---- back faces (512 x 512 each, no text so the mirrored projection is invisible) ----
    for (let c = 0; c < 3; c++) {
      const r = BACK[c], x0 = r[0], y0 = r[1], S = r[2];
      g.fillStyle = BASE[c]; g.fillRect(x0, y0, S, S);
      rrect(g, x0 + 34, y0 + 34, S - 68, S - 68, 54);
      g.fillStyle = 'rgba(255,255,255,0.30)'; g.fill();
      g.strokeStyle = 'rgba(255,255,255,0.7)'; g.lineWidth = 8;
      g.beginPath(); g.arc(x0 + S / 2, y0 + S / 2 - 10, 96, 0, 7); g.stroke();
      for (let k = 0; k < 5; k++) {
        g.fillStyle = 'rgba(255,255,255,' + (0.85 - k * 0.12) + ')';
        g.beginPath(); g.arc(x0 + S / 2 - 88 + k * 44, y0 + S / 2 - 10, 15, 0, 7); g.fill();
      }
      g.fillStyle = 'rgba(255,255,255,0.55)';
      rrect(g, x0 + S / 2 - 96, y0 + S - 130, 192, 18, 9); g.fill();
      rrect(g, x0 + S / 2 - 62, y0 + S - 98, 124, 18, 9); g.fill();
      // pure base-colour patch, bottom-left: sampled by the card's thin side walls
      g.fillStyle = BASE[c]; g.fillRect(x0 + 2, y0 + S - 42, 40, 40);
    }
  });
}

/** map a mesh's vertices onto one atlas rect, projecting along z */
function planarUV(geo, rect, x0, y0, w, h) {
  const pos = geo.attributes.position, uv = geo.attributes.uv, nor = geo.attributes.normal;
  const u0 = rect[0], v0 = rect[1], u1 = rect[2], v1 = rect[3];
  for (let i = 0; i < pos.count; i++) {
    if (nor && Math.abs(nor.getZ(i)) < 0.5) { uv.setXY(i, u0, v0); continue; }
    uv.setXY(i, u0 + ((pos.getX(i) - x0) / w) * (u1 - u0), v0 + ((pos.getY(i) - y0) / h) * (v1 - v0));
  }
  uv.needsUpdate = true;
  return geo;
}

let MATS = null;
function materials() {
  if (MATS) return MATS;
  MATS = {
    paper: mat(0xfbf3e4, { roughness: 0.84 }),
    card: mat(0xffffff, { map: cardAtlas(), roughness: 0.7 }),
    coral: gloss(0xe8694f, { roughness: 0.34 }),
    red: gloss(0xf0432f, { roughness: 0.14, clearcoat: 1, clearcoatRoughness: 0.06, emissive: 0x3a0803, emissiveIntensity: 0.35 }),
    green: mat(0x8dbf93, { roughness: 0.62 }),
    blue: gloss(0x7fa8d8, { roughness: 0.34 }),
    wood: mat(0xc59a6c, { roughness: 0.74 }),
    metal: metal(0xcdba9c, 0.3),
    dark: mat(0x463a33, { roughness: 0.72 }),
  };
  return MATS;
}

function cardGeo(col) {
  const s = roundRect(CW, CH, CR);
  const hole = new THREE.Path();
  hole.absarc(0, -CH / 2 + 0.085, 0.023, 0, Math.PI * 2, true);
  s.holes.push(hole);
  const geo = new THREE.ExtrudeGeometry(s, {
    depth: 0.014, bevelEnabled: true, bevelSize: 0.005, bevelThickness: 0.005, bevelSegments: 2, curveSegments: 7,
  });
  geo.computeBoundingBox();
  const bb = geo.boundingBox;
  const zc = (bb.min.z + bb.max.z) / 2;
  geo.computeVertexNormals();
  // front / back faces get their own cell, the thin rim samples a flat base colour
  const pos = geo.attributes.position, uv = geo.attributes.uv, nor = geo.attributes.normal;
  const FR = rectUV(FRONT[col]), BK = rectUV(BACK[col]);
  const sideU = (BACK[col][0] + 22) / AW, sideV = 1 - (BACK[col][1] + BACK[col][3] - 22) / AH;
  for (let i = 0; i < pos.count; i++) {
    const nz = nor.getZ(i);
    if (Math.abs(nz) < 0.55) { uv.setXY(i, sideU, sideV); continue; }
    const r = nz > 0 ? FR : BK;
    uv.setXY(i, r[0] + ((pos.getX(i) + CW / 2) / CW) * (r[2] - r[0]), r[1] + ((pos.getY(i) + CH / 2) / CH) * (r[3] - r[1]));
  }
  uv.needsUpdate = true;
  geo.translate(0, 0, -zc);
  return geo;
}

export function build() {
  const m = materials();
  const root = new THREE.Group();
  const anim = { cards: [], motes: [] };

  // ---------------- pedestal desk ----------------
  mesh(G.box(0.916, 0.055, 0.76, 0.024, 2), m.paper, { parent: root, pos: [0, TOP - 0.0275, 0.01] });
  mesh(G.box(0.90, 0.012, 0.745, 0.006, 1), m.coral, { parent: root, pos: [0, TOP - 0.060, 0.01] });
  mesh(G.box(0.84, 0.075, 0.68, 0.030, 2), m.paper, { parent: root, pos: [0, 0.1775, 0.01] });
  for (const s of [-1, 1]) {
    mesh(G.box(0.30, 0.050, 0.022, 0.014, 1), m.paper, { parent: root, pos: [s * 0.20, 0.1775, 0.352] });
    mesh(G.cyl(0.016, 0.016, 0.016, 12), m.metal, { parent: root, pos: [s * 0.20, 0.1775, 0.366], rot: [Math.PI / 2, 0, 0] });
  }
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    mesh(G.capsule(0.036, 0.088, 4, 12), m.paper, { parent: root, pos: [sx * 0.36, 0.08, 0.01 + sz * 0.28] });
    mesh(G.cyl(0.038, 0.038, 0.012, 12), m.metal, { parent: root, pos: [sx * 0.36, 0.012, 0.01 + sz * 0.28] });
  }
  mesh(G.box(0.70, 0.020, 0.50, 0.010, 1), m.paper, { parent: root, pos: [0, 0.045, 0.01] });
  let by = 0.055;
  [[0.20, 0.030, 0.135, m.coral, 0.10], [0.17, 0.028, 0.12, m.blue, -0.14], [0.15, 0.024, 0.11, m.green, 0.22]].forEach((b) => {
    mesh(G.box(b[0], b[1], b[2], 0.008, 1), b[3], { parent: root, pos: [-0.17, by + b[1] / 2, 0.01], rot: [0, b[4], 0] });
    by += b[1];
  });

  // ---------------- swatch-card tray + fanned cards ----------------
  mesh(G.box(0.50, 0.038, 0.17, 0.018, 2), m.coral, { parent: root, pos: [0, TOP + 0.019, -0.235] });
  mesh(G.box(0.45, 0.013, 0.10, 0.005, 1), m.dark, { parent: root, pos: [0, TOP + 0.036, -0.235] });

  const fan = group(root, { pos: [0, TOP + 0.005, -0.235], dynamic: true });
  for (let i = 0; i < 3; i++) {
    const cg = group(fan, { rot: [-0.075, 0, (i - 1) * 0.34] });
    mesh(cardGeo(i), m.card, { parent: cg, pos: [0, CH / 2, 0] });
    anim.cards.push({ g: cg, base: (i - 1) * 0.34 });
  }
  mesh(G.cyl(0.030, 0.030, 0.052, 16), m.metal, { parent: root, pos: [0, TOP + 0.09, -0.235], rot: [Math.PI / 2, 0, 0] });

  // ---------------- shiny red apple ----------------
  const apple = group(root, { pos: [-0.315, TOP, 0.185], rot: [0, 0.5, 0] });
  const prof = [[0, 0], [0.030, 0.002], [0.055, 0.014], [0.070, 0.036], [0.077, 0.062], [0.074, 0.090],
                [0.060, 0.112], [0.040, 0.126], [0.021, 0.132], [0, 0.133]];
  mesh(G.lathe(prof, 20), m.red, { parent: apple });
  mesh(G.cyl(0.0045, 0.0075, 0.052, 7), m.wood, { parent: apple, pos: [0.004, 0.156, 0.002], rot: [0.14, 0, 0.10] });
  const leaf = new THREE.Shape();
  leaf.moveTo(0, 0);
  leaf.quadraticCurveTo(0.036, 0.040, 0.088, 0.010);
  leaf.quadraticCurveTo(0.040, -0.028, 0, 0);
  mesh(new THREE.ExtrudeGeometry(leaf, { depth: 0.006, bevelEnabled: true, bevelSize: 0.002, bevelThickness: 0.002, bevelSegments: 1, curveSegments: 6 }),
    m.green, { parent: apple, pos: [0.014, 0.176, 0.004], rot: [-1.15, 0.5, 0.30] });

  // ---------------- palette with paint dots ----------------
  const pal = group(root, { pos: [0.16, TOP + 0.0115, 0.15], rot: [0, 0.34, 0] });
  const ps = new THREE.Shape();
  ps.absellipse(0, 0, 0.118, 0.084, 0, Math.PI * 2, false, 0);
  const ph = new THREE.Path(); ph.absarc(0.055, -0.004, 0.023, 0, Math.PI * 2, true);
  ps.holes.push(ph);
  const pgeo = new THREE.ExtrudeGeometry(ps, { depth: 0.013, bevelEnabled: true, bevelSize: 0.005, bevelThickness: 0.005, bevelSegments: 1, curveSegments: 12 });
  pgeo.computeBoundingBox();
  pgeo.translate(0, 0, -(pgeo.boundingBox.min.z + pgeo.boundingBox.max.z) / 2);
  mesh(pgeo, m.paper, { parent: pal, rot: [-Math.PI / 2, 0, 0] });
  [[-0.072, 0.030, m.coral], [-0.032, 0.046, m.green], [-0.080, -0.020, m.blue], [-0.038, -0.040, m.dark], [0.010, 0.040, m.red]].forEach((d) => {
    mesh(G.cyl(0.017, 0.017, 0.010, 12), d[2], { parent: pal, pos: [d[0], 0.012, -d[1]] });
  });
  mesh(G.box(0.055, 0.008, 0.012, 0.004, 1), m.wood, { parent: pal, pos: [0.075, 0.016, 0.0], rot: [0, 0, 0.2] });

  // ---------------- pencils in a cup ----------------
  const cup = group(root, { pos: [-0.095, TOP, 0.30] });
  mesh(G.cyl(0.058, 0.050, 0.115, 16, true), m.paper, { parent: cup, pos: [0, 0.0575, 0] });
  mesh(G.cyl(0.050, 0.050, 0.010, 16), m.paper, { parent: cup, pos: [0, 0.005, 0] });
  mesh(G.cyl(0.052, 0.052, 0.014, 16), m.dark, { parent: cup, pos: [0, 0.098, 0] });
  mesh(G.torus(0.0575, 0.005, 5, 18), m.paper, { parent: cup, pos: [0, 0.114, 0], rot: [Math.PI / 2, 0, 0] });
  mesh(G.box(0.052, 0.024, 0.006, 0.003, 1), m.coral, { parent: cup, pos: [0, 0.062, 0.053] });
  [[0.16, 0.42, m.coral], [-0.20, 0.30, m.blue], [0.05, 0.60, m.green], [-0.12, 0.14, m.wood], [0.26, 0.70, m.red]].forEach((d) => {
    const pg = group(cup, { pos: [0, 0.04, 0], rot: [d[0], 0, d[1]] });
    mesh(G.cyl(0.0115, 0.0115, 0.20, 5), d[2], { parent: pg, pos: [0, 0.10, 0] });
    mesh(G.cyl(0.0022, 0.0115, 0.030, 5), m.wood, { parent: pg, pos: [0, 0.215, 0] });
    mesh(G.cyl(0.0010, 0.0034, 0.012, 5), m.dark, { parent: pg, pos: [0, 0.234, 0] });
  });

  // ---------------- tall brush leaning on the card fan ----------------
  const bFrom = new THREE.Vector3(0.365, TOP + 0.004, 0.135);
  const bTo = new THREE.Vector3(0.205, 0.615, -0.245);
  const bDir = bTo.clone().sub(bFrom);
  const blen = bDir.length();
  bDir.normalize();
  const brush = new THREE.Group();
  brush.position.copy(bFrom);
  brush.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), bDir);
  root.add(brush);
  mesh(G.cyl(0.019, 0.006, 0.075, 10), m.dark, { parent: brush, pos: [0, 0.0375, 0] });
  mesh(G.cyl(0.017, 0.019, 0.045, 12), m.metal, { parent: brush, pos: [0, 0.0975, 0] });
  mesh(G.cyl(0.0080, 0.0165, blen - 0.12, 10), m.wood, { parent: brush, pos: [0, 0.12 + (blen - 0.12) / 2, 0] });

  // ---------------- sketchbook on the desk ----------------
  const nb = group(root, { pos: [0.325, TOP, 0.305], rot: [0, -0.30, 0] });
  mesh(G.box(0.17, 0.020, 0.125, 0.008, 1), m.paper, { parent: nb, pos: [0, 0.010, 0] });
  mesh(G.box(0.166, 0.007, 0.118, 0.004, 1), m.coral, { parent: nb, pos: [0, 0.0235, 0] });
  [m.coral, m.green, m.blue].forEach((mm, i) => {
    mesh(G.box(0.024, 0.008, 0.070, 0.003, 1), mm, { parent: nb, pos: [-0.046 + i * 0.030, 0.029, 0] });
  });

  // ---------------- drifting idea motes ----------------
  for (let i = 0; i < 3; i++) {
    const s = glowSprite(0xfff0c8, 0.05, 0.5);
    s.position.set(-0.12 + i * 0.14, 0.46 + i * 0.05, -0.02);
    root.add(s);
    anim.motes.push(s);
  }

  finalize(root);
  return {
    group: root,
    update(t) {
      anim.cards.forEach((c, i) => {
        c.g.rotation.z = c.base + Math.sin(t * 0.62 + i * 0.55) * 0.032;
        c.g.rotation.x = -0.075 + Math.sin(t * 0.47 + i * 0.8) * 0.012;
      });
      anim.motes.forEach((s, i) => {
        s.position.y = 0.45 + i * 0.055 + Math.sin(t * 0.7 + i * 1.9) * 0.030;
        s.position.x = -0.12 + i * 0.14 + Math.sin(t * 0.5 + i) * 0.020;
        s.material.opacity = 0.26 + Math.sin(t * 1.4 + i * 2.0) * 0.12;
      });
    },
  };
}
