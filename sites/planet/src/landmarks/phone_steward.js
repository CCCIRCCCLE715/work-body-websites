// 手机控制台 — a big friendly smartphone standing in a layered charging dock.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { G, mat, gloss, glow, metal, mesh, group, canvasTexture, glowSprite, finalize } from './kit.js';

const PW = 0.62, PH = 0.735, PD = 0.125, PR = 0.09;  // phone body
const DOCK_Y = 0.245;                                  // dock top = phone base

function rrect(g, x, y, w, h, r) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.lineTo(x + w - r, y); g.quadraticCurveTo(x + w, y, x + w, y + r);
  g.lineTo(x + w, y + h - r); g.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  g.lineTo(x + r, y + h); g.quadraticCurveTo(x, y + h, x, y + h - r);
  g.lineTo(x, y + r); g.quadraticCurveTo(x, y, x + r, y);
  g.closePath();
}
function starPath(g, x, y, r) {
  g.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r;
    if (i) g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    else g.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  g.closePath();
}

// ---------- phone face texture: mint UI with greeting, smile and app tiles ----------
function faceTexture() {
  return canvasTexture(512, 640, (g, W, H) => {
    const grd = g.createLinearGradient(0, 0, W * 0.45, H);
    grd.addColorStop(0, '#cdf7e2'); grd.addColorStop(0.5, '#96e8c8'); grd.addColorStop(1, '#63d0ac');
    g.fillStyle = grd; g.fillRect(0, 0, W, H);
    for (let i = 0; i < 5; i++) {
      g.fillStyle = 'rgba(255,255,255,' + (0.09 + i * 0.012) + ')';
      g.beginPath(); g.arc(46 + i * 122, 74 + (i % 2) * 46, 58, 0, 7); g.fill();
    }
    // status strip
    g.fillStyle = 'rgba(24,74,58,0.30)';
    rrect(g, 26, 22, 58, 17, 8); g.fill();
    rrect(g, 94, 22, 30, 17, 8); g.fill();
    rrect(g, W - 88, 22, 62, 17, 8); g.fill();
    // greeting card
    g.fillStyle = 'rgba(255,255,255,0.80)'; rrect(g, 34, 58, W - 68, 112, 30); g.fill();
    g.textAlign = 'left';
    g.fillStyle = 'rgba(24,74,58,0.32)'; g.font = '600 19px Helvetica, Arial, sans-serif';
    g.fillText('TUESDAY  ·  09:41', 58, 90);
    g.fillStyle = '#2b7a5e'; g.font = 'bold 32px Helvetica, Arial, sans-serif';
    g.fillText('Good morning!', 58, 128);
    g.fillStyle = 'rgba(24,74,58,0.55)'; g.font = '500 18px Helvetica, Arial, sans-serif';
    g.fillText('3 tasks · 1 reminder · sunny 22C', 58, 155);
    // cheeks (eyes are 3D, drawn over this)
    g.fillStyle = 'rgba(255,150,160,0.38)';
    for (let s = -1; s <= 1; s += 2) { g.beginPath(); g.arc(W / 2 + s * 150, 296, 26, 0, 7); g.fill(); }
    // smile
    g.strokeStyle = '#20503f'; g.lineWidth = 19; g.lineCap = 'round';
    g.beginPath(); g.moveTo(W / 2 - 52, 318); g.quadraticCurveTo(W / 2, 380, W / 2 + 52, 318); g.stroke();
    // app tiles 3 x 2
    const tiles = [['#f2856c', '#ffe3da'], ['#7fa8d8', '#e1ecfa'], ['#f2c14e', '#fff3d4'],
                   ['#a2c8aa', '#e7f4e6'], ['#c78fd0', '#f6e9f8'], ['#ef9a86', '#ffece6']];
    const tw = 124, th = 116, gap = 16, ox = (W - tw * 3 - gap * 2) / 2;
    tiles.forEach((t, i) => {
      const x = ox + (i % 3) * (tw + gap), y = 402 + Math.floor(i / 3) * (th + gap);
      g.fillStyle = 'rgba(255,255,255,0.74)'; rrect(g, x, y, tw, th, 26); g.fill();
      g.fillStyle = t[1]; rrect(g, x + 15, y + 14, tw - 30, th - 50, 18); g.fill();
      g.fillStyle = t[0];
      if (i === 0) { g.beginPath(); g.arc(x + tw / 2, y + 40, 14, 0, 7); g.fill(); }
      else if (i === 1) { starPath(g, x + tw / 2, y + 40, 16); g.fill(); }
      else if (i === 2) { rrect(g, x + tw / 2 - 14, y + 25, 28, 28, 9); g.fill(); }
      else if (i === 3) { g.beginPath(); g.arc(x + tw / 2, y + 44, 8, 0, 7); g.fill(); g.beginPath(); g.arc(x + tw / 2 - 13, y + 33, 8, 0, 7); g.fill(); g.beginPath(); g.arc(x + tw / 2 + 13, y + 33, 8, 0, 7); g.fill(); }
      else if (i === 4) { g.beginPath(); g.moveTo(x + tw / 2, y + 22); g.lineTo(x + tw / 2 + 17, y + 54); g.lineTo(x + tw / 2 - 17, y + 54); g.closePath(); g.fill(); }
      else {
        g.strokeStyle = t[0]; g.lineWidth = 6;
        g.beginPath(); g.moveTo(x + tw / 2 - 15, y + 50); g.lineTo(x + tw / 2 - 15, y + 24);
        g.lineTo(x + tw / 2 + 15, y + 50); g.lineTo(x + tw / 2 + 15, y + 24); g.stroke();
      }
      g.fillStyle = 'rgba(30,66,54,0.42)'; rrect(g, x + 22, y + th - 26, tw - 44, 9, 5); g.fill();
    });
    g.fillStyle = 'rgba(255,255,255,0.88)'; rrect(g, W / 2 - 36, H - 44, 72, 12, 6); g.fill();
  });
}

function backTexture() {
  return canvasTexture(256, 320, (g, W, H) => {
    const grd = g.createLinearGradient(0, 0, W, H);
    grd.addColorStop(0, '#8fb3de'); grd.addColorStop(0.55, '#7aa4d4'); grd.addColorStop(1, '#6b93c6');
    g.fillStyle = grd; g.fillRect(0, 0, W, H);
    g.fillStyle = 'rgba(255,255,255,0.10)';
    for (let i = 0; i < 4; i++) { g.beginPath(); g.arc(34 + i * 64, 56 + (i % 2) * 34, 44, 0, 7); g.fill(); }
  });
}

function dialTexture() {
  return canvasTexture(128, 128, (g, W) => {
    g.fillStyle = '#fffaf2'; g.beginPath(); g.arc(W / 2, W / 2, W / 2, 0, 7); g.fill();
    g.strokeStyle = '#e08a70'; g.lineWidth = 5; g.lineCap = 'round';
    for (let i = 0; i < 12; i++) {
      const a = i / 12 * Math.PI * 2, r0 = W / 2 - 17, r1 = W / 2 - (i % 3 ? 9 : 6);
      g.beginPath();
      g.moveTo(W / 2 + Math.cos(a) * r0, W / 2 + Math.sin(a) * r0);
      g.lineTo(W / 2 + Math.cos(a) * r1, W / 2 + Math.sin(a) * r1);
      g.stroke();
    }
    g.strokeStyle = '#5a8f78'; g.lineWidth = 7;
    g.beginPath(); g.moveTo(W / 2, W / 2); g.lineTo(W / 2 + 27, W / 2 - 27); g.stroke();
    g.fillStyle = '#e08a70'; g.beginPath(); g.arc(W / 2, W / 2, 7, 0, 7); g.fill();
  });
}

let PM = null;
function materials() {
  if (PM) return PM;
  const FACE_TEX = faceTexture();
  const screen = mat(0xffffff, { map: FACE_TEX, emissive: 0xffffff, emissiveMap: FACE_TEX, emissiveIntensity: 0.5, roughness: 0.34 });
  PM = {
    blue: gloss(0x84addd, { roughness: 0.22, clearcoat: 1, clearcoatRoughness: 0.12 }),
    face: screen,
    cream: mat(0xfbf3e4, { roughness: 0.78 }),
    coral: gloss(0xe8694f, { roughness: 0.34 }),
    mint: gloss(0x8ddfbe, { roughness: 0.3 }),
    cyan: glow(0x8ef0cd, 1.3),
    metal: metal(0xcdba9c, 0.3),
    dark: mat(0x37505e, { roughness: 0.66 }),
    dial: mat(0xffffff, { map: dialTexture(), roughness: 0.62 }),
  };
  return PM;
}

function planarUV(geo, w, h, u0, u1) {
  const pos = geo.attributes.position, uv = geo.attributes.uv;
  for (let i = 0; i < pos.count; i++) uv.setXY(i, u0 + (pos.getX(i) / w + 0.5) * (u1 - u0), pos.getY(i) / h + 0.5);
  uv.needsUpdate = true;
  return geo;
}

export function build() {
  const m = materials();
  const root = new THREE.Group();
  const anim = {};

  // ---------------- layered charging dock ----------------
  mesh(G.box(0.72, 0.058, 0.60, 0.028, 3), m.cream, { parent: root, pos: [0, 0.029, 0] });
  mesh(G.box(0.62, 0.064, 0.48, 0.028, 3), m.coral, { parent: root, pos: [0, 0.090, 0] });
  mesh(G.box(0.50, 0.060, 0.38, 0.026, 3), m.mint, { parent: root, pos: [0, 0.151, 0] });
  mesh(G.box(0.36, 0.044, 0.28, 0.020, 3), m.cream, { parent: root, pos: [0, 0.203, 0] });
  mesh(G.cyl(0.115, 0.125, 0.026, 28), m.mint, { parent: root, pos: [0, 0.228, 0] });
  // lip that the phone leans on
  mesh(G.box(0.42, 0.055, 0.05, 0.024, 2), m.cream, { parent: root, pos: [0, 0.222, 0.105] });
  mesh(G.box(0.30, 0.014, 0.028, 0.006, 2), m.cyan, { parent: root, pos: [0, 0.250, 0.098] });
  // dial on the coral step
  const dial = group(root, { pos: [0, 0.093, 0.243] });
  mesh(G.cyl(0.082, 0.082, 0.022, 26), m.cream, { parent: dial, rot: [Math.PI / 2, 0, 0] });
  mesh(planarUV(new THREE.CircleGeometry(0.072, 26), 0.144, 0.144, 0, 1), m.dial, { parent: dial, pos: [0, 0, 0.012] });
  mesh(G.cyl(0.013, 0.013, 0.016, 14), m.coral, { parent: dial, pos: [0, 0, 0.020], rot: [Math.PI / 2, 0, 0] });
  // little metal feet on the base
  for (const s of [-1, 1]) for (const t of [-1, 1]) {
    mesh(G.cyl(0.030, 0.030, 0.014, 14), m.metal, { parent: root, pos: [s * 0.300, 0.007, t * 0.235] });
  }
  // side knobs
  for (const s of [-1, 1]) mesh(G.cyl(0.019, 0.019, 0.020, 14), m.metal, { parent: root, pos: [s * 0.303, 0.090, 0.02], rot: [0, 0, Math.PI / 2] });
  // cable curling out of the back left
  mesh(G.tube([[-0.10, 0.035, -0.26], [-0.18, 0.022, -0.33], [-0.28, 0.016, -0.365], [-0.365, 0.030, -0.33], [-0.395, 0.055, -0.24]], 0.014, 44, 8, false), m.cream, { parent: root });
  mesh(G.cyl(0.024, 0.024, 0.026, 14), m.metal, { parent: root, pos: [-0.398, 0.058, -0.228], rot: [Math.PI / 2, 0, 0] });

  // ---------------- phone body ----------------
  const phone = group(root, { pos: [0, DOCK_Y, 0], rot: [-0.055, 0, 0] });
  mesh(G.box(PW, PH, PD, PR, 4), m.blue, { parent: phone, pos: [0, PH / 2, 0] });
  // screen: rounded slab on the front face
  const faceZ = PD / 2;
  const sw = PW - 0.062, sh = PH - 0.07;
  const sg = G.box(sw, sh, 0.014, 0.048, 3);
  planarUV(sg, sw, sh, 0.004, 0.996);
  mesh(sg, m.face, { parent: phone, pos: [0, PH / 2 + 0.004, faceZ + 0.004] });
  // speaker slot + front camera
  mesh(G.box(0.09, 0.013, 0.010, 0.005, 2), m.dark, { parent: phone, pos: [0, PH - 0.048, faceZ + 0.008] });
  mesh(G.sphere(0.011, 12, 10), m.dark, { parent: phone, pos: [0.155, PH - 0.046, faceZ + 0.008], scale: [1, 1, 0.6] });
  // side buttons
  for (const s of [-1, 1]) {
    mesh(G.box(0.015, 0.120, 0.036, 0.007, 2), m.metal, { parent: phone, pos: [s * (PW / 2 + 0.004), PH * 0.66, -0.006] });
  }
  mesh(G.box(0.015, 0.062, 0.032, 0.007, 2), m.metal, { parent: phone, pos: [-(PW / 2 + 0.004), PH * 0.46, -0.006] });
  // camera bump on the back
  const bump = group(phone, { pos: [-0.165, PH - 0.155, -PD / 2 - 0.014] });
  mesh(G.box(0.15, 0.19, 0.028, 0.028, 3), m.blue, { parent: bump });
  mesh(G.cyl(0.045, 0.045, 0.020, 20), m.dark, { parent: bump, pos: [-0.030, 0.050, -0.020], rot: [Math.PI / 2, 0, 0] });
  mesh(G.cyl(0.032, 0.032, 0.014, 18), m.cyan, { parent: bump, pos: [-0.030, 0.050, -0.030], rot: [Math.PI / 2, 0, 0] });
  mesh(G.cyl(0.040, 0.040, 0.018, 20), m.dark, { parent: bump, pos: [-0.030, -0.040, -0.020], rot: [Math.PI / 2, 0, 0] });
  mesh(G.sphere(0.014, 10, 8), m.cream, { parent: bump, pos: [0.040, -0.058, -0.018] });
  // back logo ring
  mesh(G.torus(0.048, 0.009, 8, 24), m.metal, { parent: phone, pos: [0.085, PH * 0.42, -PD / 2 - 0.003] });

  // ---------------- blinking eyes (one dynamic mesh, two discs) ----------------
  const face = group(phone, { pos: [0, PH * 0.635, faceZ + 0.012], dynamic: true });
  const eye = (s) => new THREE.CircleGeometry(0.031, 18).scale(1, 1.3, 1).translate(s * 0.090, 0, 0);
  mesh(mergeGeometries([eye(-1), eye(1)], false), m.dark, { parent: face });
  const glint = (s) => G.sphere(0.0092, 10, 8).scale(1, 1, 0.45).translate(s * 0.090 - 0.011, 0.013, 0.010);
  mesh(mergeGeometries([glint(-1), glint(1)], false), m.cream, { parent: face });
  anim.eyes = face;

  // ---------------- screen glow ----------------
  const halo = glowSprite(0x9cecc9, 0.56, 0.30);
  halo.position.set(0, PH * 0.50, faceZ + 0.055);
  phone.add(halo);
  anim.halo = halo;

  // ---------------- friends on the dock ----------------
  for (const s of [-1, 1]) {
    const app = group(root, { pos: [s * 0.255, 0.207, 0.115] });
    mesh(G.box(0.080, 0.080, 0.050, 0.022, 3), s < 0 ? m.coral : m.blue, { parent: app });
    mesh(G.box(0.032, 0.032, 0.012, 0.008, 2), m.cream, { parent: app, pos: [0, 0, 0.028] });
  }
  mesh(G.cyl(0.040, 0.032, 0.060, 14), m.coral, { parent: root, pos: [-0.185, 0.180, -0.185] });
  for (let i = 0; i < 3; i++) {
    mesh(G.sphere(0.028, 12, 9), m.mint, { parent: root, pos: [-0.185 + (i - 1) * 0.026, 0.222 + (i === 1 ? 0.022 : 0), -0.185], scale: [1, 0.8, 1] });
  }

  finalize(root);
  return {
    group: root,
    update(t) {
      m.face.emissiveIntensity = 0.50 + Math.sin(t * 1.5) * 0.06;
      anim.halo.material.opacity = 0.28 + Math.sin(t * 1.3) * 0.06;
      m.cyan.emissiveIntensity = 1.25 + Math.sin(t * 2.2) * 0.22;
      const cyc = t % 5.0;
      const blink = cyc > 4.60 ? Math.max(0.07, Math.abs(Math.cos((cyc - 4.60) / 0.40 * Math.PI))) : 1;
      anim.eyes.scale.y = blink;
    },
  };
}