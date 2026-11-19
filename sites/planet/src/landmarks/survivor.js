// 末日小超市 — a cozy post-apocalyptic corner mini-supermarket reclaimed by nature.
import * as THREE from 'three';
import { G, mat, gloss, glow, metal, mesh, group, canvasTexture, glowSprite, finalize } from './kit.js';

// ---------- shared materials (kept few so finalize() merges into few draw calls) ----------
let M = null;
function materials() {
  if (M) return M;

  // weathered cream / peach plaster: mottling, water stains, cracks, exposed brick patches
  const plaster = canvasTexture(512, 512, (g, w, h) => {
    const grd = g.createLinearGradient(0, 0, 0, h);
    grd.addColorStop(0, '#f9ecd7'); grd.addColorStop(0.45, '#f3ddc0'); grd.addColorStop(1, '#e2c19f');
    g.fillStyle = grd; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 130; i++) {
      const x = Math.random() * w, y = Math.random() * h, r = 10 + Math.random() * 70;
      g.fillStyle = Math.random() < 0.5
        ? 'rgba(255,247,232,' + (0.05 + Math.random() * 0.09).toFixed(3) + ')'
        : 'rgba(196,163,129,' + (0.04 + Math.random() * 0.08).toFixed(3) + ')';
      g.beginPath(); g.ellipse(x, y, r, r * (0.4 + Math.random() * 0.8), Math.random() * 3.14, 0, 6.3); g.fill();
    }
    // rain streaks from the top
    for (let i = 0; i < 26; i++) {
      const x = Math.random() * w, l = 40 + Math.random() * 190;
      const s = g.createLinearGradient(0, 0, 0, l);
      s.addColorStop(0, 'rgba(150,120,92,0.16)'); s.addColorStop(1, 'rgba(150,120,92,0)');
      g.fillStyle = s; g.fillRect(x, 0, 3 + Math.random() * 9, l);
    }
    // exposed brick patches
    const patch = (px, py, pw, ph) => {
      g.save(); g.beginPath(); g.rect(px, py, pw, ph); g.clip();
      g.fillStyle = '#c9a184'; g.fillRect(px, py, pw, ph);
      const bw = 30, bh = 14, cols = ['#c07c5c', '#b26b4e', '#cb8f6c', '#a96247'];
      for (let r = 0; r * bh < ph + bh; r++) for (let c = -1; c * bw < pw + bw; c++) {
        const bx = px + c * bw + (r % 2 ? bw * 0.5 : 0) + 1.5, by = py + r * bh + 1.5;
        g.fillStyle = cols[(r * 3 + c * 5 + 12) % 4];
        g.fillRect(bx, by, bw - 3, bh - 3);
        g.fillStyle = 'rgba(255,235,215,0.13)'; g.fillRect(bx, by, bw - 3, 2.5);
      }
      g.restore();
      // crumbly plaster rim so the patch reads as damage, not a sticker
      g.fillStyle = 'rgba(244,222,194,0.9)';
      for (let i = 0; i < 60; i++) {
        const t = Math.random();
        let x, y;
        if (t < 0.5) { x = px + Math.random() * pw; y = Math.random() < 0.5 ? py : py + ph; }
        else { y = py + Math.random() * ph; x = Math.random() < 0.5 ? px : px + pw; }
        g.beginPath(); g.ellipse(x, y, 5 + Math.random() * 13, 5 + Math.random() * 11, Math.random() * 3, 0, 6.3); g.fill();
      }
    };
    patch(36, 306, 138, 100); patch(296, 54, 156, 78); patch(330, 322, 126, 142);
    // hairline cracks
    const crack = (x, y, ang, len, lw) => {
      let cx = x, cy = y, a = ang;
      g.strokeStyle = 'rgba(96,70,52,0.5)'; g.lineCap = 'round'; g.lineWidth = lw;
      g.beginPath(); g.moveTo(cx, cy);
      const pts = [[cx, cy]];
      for (let i = 0; i < len; i++) {
        a += (Math.random() - 0.5) * 0.75;
        cx += Math.cos(a) * 7; cy += Math.sin(a) * 7; pts.push([cx, cy]); g.lineTo(cx, cy);
      }
      g.stroke();
      for (let b = 1; b < 3; b++) {
        const p = pts[Math.floor(pts.length * (0.3 + b * 0.2))];
        g.beginPath(); g.moveTo(p[0], p[1]); g.lineTo(p[0] + (Math.random() - 0.5) * 34, p[1] + 14 + Math.random() * 20); g.lineWidth = lw * 0.6; g.stroke();
      }
    };
    crack(70, 26, 1.3, 22, 3); crack(430, 18, 1.8, 16, 2.4); crack(250, 236, 0.5, 18, 2.2); crack(150, 430, -1.2, 12, 2);
    // grime at the foot of the wall
    const foot = g.createLinearGradient(0, h - 90, 0, h);
    foot.addColorStop(0, 'rgba(120,96,74,0)'); foot.addColorStop(1, 'rgba(110,86,64,0.28)');
    g.fillStyle = foot; g.fillRect(0, h - 90, w, 90);
  });

  // faded mint / cream striped awning canvas
  const stripes = canvasTexture(256, 128, (g, w, h) => {
    for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? '#f6efd9' : '#9ed9c1'; g.fillRect(i * w / 8, 0, w / 8 + 1, h); }
    for (let i = 0; i < 170; i++) {
      g.fillStyle = 'rgba(' + (150 + Math.random() * 60 | 0) + ',' + (140 + Math.random() * 50 | 0) + ',' + (110 + Math.random() * 50 | 0) + ',' + (0.04 + Math.random() * 0.09).toFixed(3) + ')';
      g.beginPath(); g.ellipse(Math.random() * w, Math.random() * h, 3 + Math.random() * 22, 2 + Math.random() * 12, Math.random() * 3, 0, 6.3); g.fill();
    }
    const dirt = g.createLinearGradient(0, h * 0.55, 0, h);
    dirt.addColorStop(0, 'rgba(120,100,78,0)'); dirt.addColorStop(1, 'rgba(112,92,70,0.3)');
    g.fillStyle = dirt; g.fillRect(0, h * 0.55, w, h * 0.45);
    // a couple of mended holes
    g.fillStyle = 'rgba(96,80,62,0.5)';
    g.beginPath(); g.ellipse(70, 44, 7, 4, 0.4, 0, 6.3); g.fill();
    g.beginPath(); g.ellipse(196, 88, 5, 3, -0.3, 0, 6.3); g.fill();
  });

  // hand-painted shop sign 小卖部
  const signTex = canvasTexture(512, 320, (g, w, h) => {
    g.fillStyle = '#efdcb6'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 40; i++) {
      g.fillStyle = 'rgba(' + (170 + Math.random() * 40 | 0) + ',' + (140 + Math.random() * 40 | 0) + ',' + (100 + Math.random() * 40 | 0) + ',' + (0.05 + Math.random() * 0.12).toFixed(3) + ')';
      g.beginPath(); g.ellipse(Math.random() * w, Math.random() * h, 20 + Math.random() * 90, 4 + Math.random() * 12, Math.random() * 3, 0, 6.3); g.fill();
    }
    g.strokeStyle = 'rgba(160,120,80,0.35)'; g.lineWidth = 2;
    for (let i = 1; i < 3; i++) { g.beginPath(); g.moveTo(0, i * h / 3); g.lineTo(w, i * h / 3 + 4); g.stroke(); }
    // painted border
    g.strokeStyle = '#c05a3f'; g.lineWidth = 13; g.lineJoin = 'round';
    g.strokeRect(16, 16, w - 32, h - 32);
    g.font = '700 152px "PingFang SC", "Hiragino Sans GB", "Heiti SC", sans-serif';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillStyle = 'rgba(90,52,36,0.35)'; g.fillText('小卖部', 262, 172);
    g.fillStyle = '#c0432d'; g.fillText('小卖部', 256, 166);
    // worn paint
    for (let i = 0; i < 260; i++) {
      g.fillStyle = 'rgba(239,220,182,' + (0.25 + Math.random() * 0.5).toFixed(2) + ')';
      g.fillRect(Math.random() * w, Math.random() * h, 2 + Math.random() * 9, 2 + Math.random() * 6);
    }
    // little hand-painted hearts
    g.fillStyle = '#e0876f';
    for (const [x, y, s] of [[74, 250, 1], [440, 240, 0.8]]) {
      g.beginPath(); g.moveTo(x, y + 8 * s);
      g.bezierCurveTo(x - 14 * s, y - 6 * s, x - 6 * s, y - 16 * s, x, y - 5 * s);
      g.bezierCurveTo(x + 6 * s, y - 16 * s, x + 14 * s, y - 6 * s, x, y + 8 * s);
      g.fill();
    }
  });

  M = {
    wall: mat(0xffffff, { map: plaster, roughness: 0.94 }),
    awning: gloss(0xffffff, { map: stripes, roughness: 0.62, clearcoat: 0.3, clearcoatRoughness: 0.5 }),
    sign: mat(0xffffff, { map: signTex, roughness: 0.88 }),
    wood: mat(0xa97a50, { roughness: 0.9 }),
    leaf: mat(0x6ea85c, { roughness: 0.86 }),
    steel: metal(0x99a2a8, 0.62),
    glass: gloss(0xcdeee4, { roughness: 0.1, transparent: true, opacity: 0.14, emissive: 0xffb266, emissiveIntensity: 0.05 }),
    inside: glow(0xffb264, 0.55, { roughness: 0.85 }),
    bulb: glow(0xffd79a, 2.5, { roughness: 0.35 }),
    goods: mat(0xffffff, { roughness: 0.5, emissive: 0xff8f3a, emissiveIntensity: 0.26 }),
  };
  return M;
}

// deterministic pseudo random so the vegetation is stable between reloads
let _s = 20261113;
const rnd = () => (_s = (_s * 16807) % 2147483647) / 2147483647;
const rr = (a, b) => a + (b - a) * rnd();
const pick = (arr) => arr[Math.floor(rnd() * arr.length) % arr.length];

function shiftUV(geo, du, dv) {
  const uv = geo.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) + du, uv.getY(i) + dv);
  return geo;
}

export function build() {
  const m = materials();
  const root = new THREE.Group();
  const halos = [];

  // ---------- layout constants ----------
  const HW = 0.32, ZF = 0.28, ZB = -0.26, FH = 0.585;
  const WT = 0.03;                       // wall thickness
  const roofY = 0.622;                   // roof slab centre
  const winX0 = -0.225, winX1 = -0.02;   // shop window opening
  const winY0 = 0.135, winY1 = 0.40;
  const drX0 = 0.03, drX1 = 0.275, drY1 = 0.345;

  const P = (w, h, d) => new THREE.BoxGeometry(w, h, d);
  const put = (geo, material, pos, rot, opts) => mesh(geo, material, { parent: root, pos, rot, ...(opts || {}) });
  const R = (w, h, d, r = 0.008) => G.box(w, h, d, r, 1);

  // ---------- walls ----------
  const wallBox = (w, h, d, x, y, z, du = 0, dv = 0) => put(shiftUV(R(w, h, d), du, dv), m.wall, [x, y, z]);
  const fy = (y0, y1) => (y0 + y1) / 2, fh = (y0, y1) => y1 - y0;
  const fc = (a, b) => (a + b) / 2, fw = (a, b) => b - a;

  // front wall (z = ZF - WT/2), built around the window and the doorway
  const fz = ZF - WT / 2;
  wallBox(fw(-HW, winX0), FH, WT, fc(-HW, winX0), FH / 2, fz, 0.02, 0.01);
  wallBox(fw(winX1, drX0), FH, WT, fc(winX1, drX0), FH / 2, fz, 0.31, 0.14);
  wallBox(fw(drX1, HW), FH, WT, fc(drX1, HW), FH / 2, fz, 0.62, 0.28);
  wallBox(fw(winX0, winX1), fh(winY1, FH), WT, fc(winX0, winX1), fy(winY1, FH), fz, 0.44, 0.05);
  wallBox(fw(winX0, winX1), fh(0, winY0), WT, fc(winX0, winX1), fy(0, winY0), fz, 0.15, 0.41);
  wallBox(fw(drX0, drX1), fh(drY1, FH), WT, fc(drX0, drX1), fy(drY1, FH), fz, 0.72, 0.2);
  // side + back walls
  wallBox(WT, FH, (ZF - ZB), HW - WT / 2, FH / 2, (ZF + ZB) / 2, 0.18, 0.33);
  wallBox(WT, FH, (ZF - ZB), -(HW - WT / 2), FH / 2, (ZF + ZB) / 2, 0.55, 0.12);
  wallBox(HW * 2, FH, WT, 0, FH / 2, ZB + WT / 2, 0.38, 0.62);
  // interior floor slab
  put(P(0.6, 0.02, 0.5), m.wood, [0, 0.01, 0.01]);

  // ---------- sagging flat roof + parapet ----------
  for (let i = 0; i < 5; i++) {
    const xc = -0.268 + i * 0.134;
    const k = Math.abs(xc) / 0.268;
    put(shiftUV(R(0.14, 0.05, 0.585, 0.006), 0.1 * i, 0.07 * i), m.wall,
      [xc, roofY + 0.026 * k * k, 0.012], [0, 0, 0.07 * (xc < 0 ? -1 : 1)]);
  }
  // parapet: front broken into three leaning segments
  const parY = roofY + 0.025 + 0.03;
  const segs = [[-0.335, -0.105, 0.012], [-0.075, 0.13, 0], [0.175, 0.335, -0.02]];
  segs.forEach(([a, b, lean], i) => {
    put(shiftUV(R(fw(a, b), 0.062, 0.028, 0.006), 0.2 * i, 0.5), m.wall, [fc(a, b), parY, ZF + 0.012], [0, 0, lean]);
  });
  put(R(0.028, 0.058, 0.55, 0.006), m.wall, [HW + 0.005, parY - 0.004, 0.012], [0, 0, 0.03]);
  put(R(0.028, 0.058, 0.55, 0.006), m.wall, [-HW - 0.005, parY + 0.004, 0.012], [0, 0, -0.05]);
  put(R(0.66, 0.05, 0.026, 0.006), m.wall, [0, parY - 0.002, ZB - 0.005]);

  // ---------- shop window: frame, glass, sill ----------
  const frameZ = ZF + 0.004;
  const fw0 = (x0, x1, y0, y1, d = 0.012) => put(P(fw(x0, x1), fh(y0, y1), 0.022), m.wood, [fc(x0, x1), fy(y0, y1), frameZ]);
  fw0(winX0 - 0.012, winX0 + 0.006, winY0 - 0.012, winY1 + 0.012);
  fw0(winX1 - 0.006, winX1 + 0.012, winY0 - 0.012, winY1 + 0.012);
  fw0(winX0, winX1, winY1 - 0.006, winY1 + 0.012);
  fw0(winX0, winX1, winY0 - 0.012, winY0 + 0.004);
  fw0(-0.128, -0.118, winY0, winY1);       // mullion
  put(P(0.25, 0.014, 0.05), m.wood, [-0.122, winY0 - 0.016, ZF + 0.012]);  // window sill ledge
  put(P(0.205, 0.265, 0.006), m.glass, [-0.1225, 0.2675, ZF - 0.012]);

  // ---------- interior: warm glow, shelves, goods, counter ----------
  put(P(0.56, 0.44, 0.02), m.wood, [0, 0.23, ZB + 0.05]);                    // dark back wall
  put(P(0.21, 0.012, 0.02), m.inside, [-0.122, 0.418, ZF - 0.05]);           // warm strip above the window
  put(P(0.2, 0.008, 0.018), m.inside, [0.15, 0.33, ZF - 0.06]);              // small lamp over the door
  const shelfZ = [0.215, 0.085];
  const goods = [];
  const gcols = ['#e2604f', '#f0a63c', '#f4d55a', '#7fc9a8', '#6fa9e0', '#d97fb0', '#f2efe2', '#c9e06a'];
  shelfZ.forEach((sz, si) => {
    for (let lvl = 0; lvl < 3; lvl++) {
      const y = 0.185 + lvl * 0.082;
      put(P(si ? 0.3 : 0.235, 0.01, 0.075), m.wood, [si ? 0.06 : -0.122, y, sz + (si ? 0.0 : 0.02)]);
      let x = (si ? 0.06 : -0.122) - (si ? 0.14 : 0.112);
      const xEnd = (si ? 0.06 : -0.122) + (si ? 0.14 : 0.112);
      while (x < xEnd - 0.022) {
        const bw = rr(0.016, 0.03), bh = rr(0.024, 0.044), bd = rr(0.02, 0.036);
        goods.push({ p: [x + bw / 2, y + 0.005 + bh / 2, sz + (si ? 0 : 0.02) + rr(-0.012, 0.012)], s: [bw, bh, bd], c: pick(gcols) });
        x += bw + rr(0.003, 0.011);
      }
    }
    for (const sx of [-0.24, 0.0, 0.24]) put(P(0.01, 0.26, 0.075), m.wood, [(si ? 0.06 : -0.122) + sx, 0.185 + 0.08, sz + (si ? 0 : 0.02)]);
  });
  // counter just inside the door
  put(P(0.16, 0.12, 0.09), m.wood, [0.15, 0.06, -0.02]);
  put(P(0.18, 0.014, 0.105), m.wood, [0.15, 0.127, -0.02]);
  goods.push({ p: [0.11, 0.165, -0.01], s: [0.035, 0.05, 0.03], c: '#e2604f' });
  goods.push({ p: [0.17, 0.16, 0.01], s: [0.03, 0.04, 0.028], c: '#7fc9a8' });

  // ---------- half-open roller shutter door ----------
  put(P(0.03, 0.375, 0.022), m.wood, [drX0 - 0.008, 0.1875, frameZ]);
  put(P(0.03, 0.375, 0.022), m.wood, [drX1 + 0.008, 0.1875, frameZ]);
  put(P(0.285, 0.028, 0.022), m.wood, [fc(drX0, drX1), drY1 + 0.014, frameZ]);
  // dark reveal behind the shutter so the slats read
  put(P(0.245, 0.2, 0.012), m.wood, [fc(drX0, drX1), 0.26, ZF - 0.032]);
  for (let i = 0; i < 8; i++) {
    put(P(0.228, 0.0165, 0.022), m.steel, [fc(drX0, drX1), 0.1855 + i * 0.0205, ZF - 0.004], [0.05, 0, 0]);
  }
  put(P(0.24, 0.014, 0.026), m.steel, [fc(drX0, drX1), 0.176, ZF - 0.006]);       // bottom bar
  put(G.cyl(0.026, 0.026, 0.245, 16), m.steel, [fc(drX0, drX1), 0.352, ZF - 0.004], [0, 0, Math.PI / 2]);
  for (const s of [drX0 + 0.001, drX1 - 0.001]) put(P(0.012, 0.19, 0.026), m.steel, [s, 0.26, ZF - 0.008]);
  put(P(0.026, 0.05, 0.024), m.steel, [drX0 - 0.026, 0.335, ZF + 0.006]);          // shutter control box
  put(P(0.004, 0.11, 0.004), m.wood, [drX0 - 0.026, 0.255, ZF + 0.008]);          // dangling pull cord
  // warm light spilling out of the doorway
  const spill = glowSprite(0xffa24d, 0.2, 0.26); spill.position.set(0.15, 0.09, ZF + 0.045); root.add(spill); halos.push(spill);

  // ---------- striped awning ----------
  const awZ0 = ZF + 0.005, awZ1 = ZF + 0.175;          // 0.285 .. 0.455
  const awY0 = 0.474, awY1 = 0.396;
  const awLen = Math.hypot(awZ1 - awZ0, awY0 - awY1);
  const awTilt = Math.atan2(awY0 - awY1, awZ1 - awZ0);
  for (let i = 0; i < 3; i++) {
    const xc = -0.207 + i * 0.207;
    put(R(0.208, 0.012, awLen, 0.005), m.awning,
      [xc, (awY0 + awY1) / 2 - (i === 1 ? 0.008 : 0.002), (awZ0 + awZ1) / 2], [awTilt, 0, 0]);
  }
  put(P(0.64, 0.024, 0.024), m.wood, [0, awY0 + 0.008, ZF + 0.005]);          // mounting batten
  // scalloped valance along the front edge
  put(R(0.63, 0.03, 0.012, 0.004), m.awning, [0, awY1 - 0.012, awZ1 - 0.002], [awTilt * 0.6, 0, 0]);
  for (let i = 0; i < 9; i++) {
    put(R(0.062, 0.042, 0.011, 0.014), m.awning, [-0.28 + i * 0.07, awY1 - 0.04, awZ1 - 0.002], [awTilt * 0.4, 0, 0]);
  }
  // slim poles
  for (const s of [-1, 1]) {
    put(G.cyl(0.0075, 0.009, 0.44, 10), m.wood, [s * 0.297, 0.22, awZ1 - 0.012]);
    put(G.cyl(0.022, 0.026, 0.012, 12), m.steel, [s * 0.297, 0.006, awZ1 - 0.012]);
    put(G.sphere(0.012, 10, 8), m.wood, [s * 0.297, 0.443, awZ1 - 0.012]);
  }

  // ---------- hand-painted sign above the awning ----------
  const signG = group(root, { pos: [-0.02, 0.5325, ZF + 0.016], rot: [-0.05, 0, 0] });
  mesh(R(0.305, 0.098, 0.026, 0.006), m.wood, { parent: signG });
  mesh(P(0.272, 0.072, 0.008), m.sign, { parent: signG, pos: [0, 0, 0.015] });
  mesh(P(0.29, 0.008, 0.012), m.wood, { parent: signG, pos: [0, 0.052, 0.012] });
  mesh(P(0.29, 0.008, 0.012), m.wood, { parent: signG, pos: [0, -0.052, 0.012] });

  // ---------- small wall lamp beside the door ----------
  const lampP = [0.302, 0.415, ZF + 0.026];
  put(P(0.016, 0.016, 0.05), m.steel, [0.302, 0.428, ZF + 0.012]);
  put(G.cyl(0.03, 0.022, 0.014, 14), m.steel, [lampP[0], 0.442, lampP[2]]);
  put(G.sphere(0.024, 14, 10), m.bulb, [lampP[0], 0.418, lampP[2] + 0.002], null, { scale: [1, 1.15, 1] });
  for (let i = 0; i < 3; i++) put(G.torus(0.026, 0.0022, 4, 14), m.steel, [lampP[0], 0.4 + i * 0.016, lampP[2] + 0.002], [Math.PI / 2, 0, 0]);
  const lampHalo = glowSprite(0xffb05a, 0.16, 0.8); lampHalo.position.set(lampP[0], 0.418, lampP[2] + 0.01); root.add(lampHalo); halos.push(lampHalo);

  // ---------- sagging string of warm bulbs under the awning ----------
  const bz = awZ1 + 0.006;
  const wirePts = [];
  for (let i = 0; i <= 16; i++) {
    const t = i / 16;
    wirePts.push([-0.292 + 0.584 * t, 0.378 - Math.sin(t * Math.PI) * 0.05 - Math.abs(Math.sin(t * Math.PI * 5)) * 0.003, bz + Math.sin(t * 3) * 0.003]);
  }
  put(G.tube(wirePts, 0.0032, 40, 4), m.steel);
  for (let i = 0; i < 11; i++) {
    const p = wirePts[Math.round(0.6 + i * 1.45)];
    put(G.cyl(0.0055, 0.0075, 0.011, 6), m.steel, [p[0], p[1] - 0.008, p[2]]);
    put(G.sphere(0.0155, 10, 8), m.bulb, [p[0], p[1] - 0.026, p[2]], null, { scale: [1, 1.2, 1] });
    const h = glowSprite(0xffc07a, 0.115, 0.9); h.position.set(p[0], p[1] - 0.026, p[2] + 0.008); root.add(h); halos.push(h);
  }
  for (const s of [-1, 1]) put(G.torus(0.011, 0.003, 4, 12), m.steel, [s * 0.297, 0.381, bz], [0, 0, Math.PI / 2]);

  // ---------- right-hand side wall: small window, shutter, drainpipe ----------
  const swZ = 0.02, swY = 0.33, sx = HW;
  put(P(0.014, 0.15, 0.155), m.wood, [sx + 0.006, swY, swZ]);
  put(P(0.008, 0.112, 0.116), m.glass, [sx + 0.013, swY, swZ]);
  for (const dz of [-0.072, 0.072]) put(P(0.014, 0.168, 0.016), m.wood, [sx + 0.007, swY, swZ + dz]);
  put(P(0.02, 0.012, 0.18), m.wood, [sx + 0.008, swY + 0.082, swZ]);
  put(P(0.022, 0.014, 0.185), m.wood, [sx + 0.01, swY - 0.082, swZ]);
  // closed wooden shutter flush with the wall
  put(P(0.01, 0.152, 0.152), m.wood, [sx + 0.014, swY, swZ]);
  for (let i = 0; i < 4; i++) put(P(0.008, 0.012, 0.148), m.steel, [sx + 0.02, swY - 0.055 + i * 0.037, swZ]);
  // drainpipe down the front-right corner
  put(G.cyl(0.011, 0.011, 0.6, 8), m.steel, [HW + 0.016, 0.3, ZF - 0.032]);
  for (const y of [0.12, 0.34, 0.55]) put(G.torus(0.013, 0.003, 4, 10), m.steel, [HW + 0.016, y, ZF - 0.032], [Math.PI / 2, 0, 0]);

  // damp skirting line along the wall foot
  put(P(0.64, 0.026, 0.012), m.wood, [0, 0.013, ZF + 0.002]);
  put(P(0.012, 0.026, 0.53), m.wood, [-HW - 0.002, 0.013, 0.01]);
  put(P(0.012, 0.026, 0.53), m.wood, [HW + 0.002, 0.013, 0.01]);

  // ---------- front stoop, doormat ----------
  put(shiftUV(R(0.46, 0.042, 0.105, 0.01), 0.13, 0.62), m.wall, [0.03, 0.021, ZF + 0.055]);
  put(P(0.135, 0.007, 0.075), m.awning, [0.135, 0.045, ZF + 0.05], [0, 0.05, 0]);

  // ---------- crates of produce ----------
  const crate = (x, y, z, s, rot) => {
    const g = group(root, { pos: [x, y, z], rot });
    const w = 0.115 * s, h = 0.085 * s, d = 0.105 * s;
    mesh(P(w, h, d), m.wood, { parent: g, pos: [0, h / 2, 0] });
    mesh(P(w * 1.04, 0.012 * s, d * 1.04), m.wood, { parent: g, pos: [0, h * 0.16, 0] });
    mesh(P(w * 1.04, 0.012 * s, d * 1.04), m.wood, { parent: g, pos: [0, h * 0.84, 0] });
    return g;
  };
  const produce = [];
  const fill = (g, n, cols, rad) => {
    for (let i = 0; i < n; i++) {
      produce.push({ p: [rr(-0.045, 0.045), 0.088 + rr(0, 0.012), rr(-0.04, 0.04)], c: pick(cols), r: rad * rr(0.85, 1.15) });
    }
  };
  const prodCols = ['#e2604f', '#f0932c', '#c9d95e', '#8fbf5a', '#e8c14a'];
  crate(-0.33, 0, 0.42, 0.78, [0, 0.3, 0]); fill(0, 5, prodCols, 0.015);
  crate(0.4, 0, 0.3, 0.92, [0, -0.3, 0]);
  crate(0.395, 0, 0.34, 0.92, [0, -0.12, 0]);
  crate(0.13, 0, 0.37, 0.82, [0, 0.5, 0]); fill(0, 5, prodCols, 0.014);
  // produce always sits on the top crates
  const prodAt = [[-0.33, 0.066, 0.42, 5], [0.398, 0.084, 0.32, 8], [0.13, 0.07, 0.37, 6]];
  for (const [px, py, pz, n] of prodAt) {
    for (let i = 0; i < n; i++) {
      produce.push({ p: [px + rr(-0.042, 0.042), py + rr(0, 0.012), pz + rr(-0.038, 0.038)], c: pick(prodCols), r: rr(0.013, 0.019) });
    }
  }

  // ---------- potted plant ----------
  const pot = group(root, { pos: [0.41, 0, 0.15] });
  mesh(G.cyl(0.048, 0.038, 0.075, 16), m.wood, { parent: pot, pos: [0, 0.0375, 0] });
  mesh(G.cyl(0.052, 0.05, 0.014, 16), m.wood, { parent: pot, pos: [0, 0.072, 0] });
  for (let i = 0; i < 7; i++) {
    const a = i / 7 * Math.PI * 2;
    mesh(G.sphere(0.026, 6, 4), m.leaf, { parent: pot, pos: [Math.cos(a) * 0.026, 0.1 + (i % 3) * 0.024, Math.sin(a) * 0.026], scale: [1, 0.55, 1.35], rot: [0.3, a, 0.4] });
  }

  // ---------- bicycle leaning on the left wall ----------
  const bike = group(root, { pos: [-0.375, 0, 0.155], rot: [0, -0.1, 0.13] });
  const wheel = (z) => {
    mesh(G.torus(0.07, 0.0072, 6, 20), m.steel, { parent: bike, pos: [0, 0.07, z], rot: [0, Math.PI / 2, 0] });
    mesh(G.cyl(0.013, 0.013, 0.028, 8), m.steel, { parent: bike, pos: [0, 0.07, z], rot: [0, 0, Math.PI / 2] });
    for (let i = 0; i < 3; i++) mesh(P(0.0035, 0.136, 0.0035), m.steel, { parent: bike, pos: [0, 0.07, z], rot: [i * Math.PI / 3, 0, 0] });
  };
  wheel(-0.1); wheel(0.108);
  const tube = (pts, r = 0.0062) => mesh(G.tube(pts, r, 12, 5), m.steel, { parent: bike });
  tube([[-0.1, 0.07, 0], [-0.028, 0.075, 0], [-0.05, 0.172, 0]]);
  tube([[-0.028, 0.075, 0], [0.062, 0.152, 0], [-0.05, 0.172, 0]]);
  tube([[-0.028, 0.075, 0], [0.098, 0.08, 0], [0.075, 0.17, 0]]);
  tube([[0.108, 0.07, 0], [0.075, 0.17, 0], [-0.05, 0.172, 0]]);
  tube([[-0.1, 0.07, 0], [-0.052, 0.168, 0]]);
  mesh(P(0.028, 0.012, 0.062), m.wood, { parent: bike, pos: [-0.055, 0.184, 0] });
  mesh(G.tube([[-0.04, 0.182, 0.062], [-0.04, 0.19, 0.0], [-0.04, 0.182, -0.062]], 0.0045, 10, 4), m.steel, { parent: bike });
  mesh(G.tube([[0.07, 0.172, 0.07], [0.07, 0.178, 0], [0.07, 0.172, -0.07]], 0.0055, 10, 4), m.steel, { parent: bike });
  mesh(P(0.055, 0.028, 0.045), m.wood, { parent: bike, pos: [0.088, 0.135, 0] });
  mesh(P(0.05, 0.002, 0.038), m.wood, { parent: bike, pos: [0.088, 0.15, 0] });

  // ---------- back lean-to shed + rubble ----------
  const shed = group(root, { pos: [0, 0, ZB] });
  for (const s of [-1, 1]) mesh(G.cyl(0.009, 0.01, 0.34, 8), m.wood, { parent: shed, pos: [s * 0.24, 0.17, -0.14] });
  mesh(R(0.56, 0.02, 0.23, 0.005), m.steel, { parent: shed, pos: [0, 0.35, -0.11], rot: [0.2, 0, 0] });
  mesh(R(0.58, 0.016, 0.03, 0.005), m.wood, { parent: shed, pos: [0, 0.312, -0.215] });
  for (let i = 0; i < 6; i++) mesh(P(0.008, 0.008, 0.2), m.steel, { parent: shed, pos: [-0.24 + i * 0.096, 0.362, -0.11], rot: [0.2, 0, 0] });
  [[-0.2, 0.14], [0.2, 0.09]].forEach(([bx, bz], i) => {
    mesh(P(0.1, 0.08, 0.1), m.wood, { parent: shed, pos: [bx, 0.04, bz + 0.1] });
  });

  // ---------- rubble + grass (instanced) ----------
  const rubbleSpots = [[-0.3, 0.24, 0.02], [0.29, 0.2, 0.03], [-0.26, -0.13, 0.025], [0.31, -0.2, 0.03], [0.06, 0.32, 0.022], [-0.16, 0.35, 0.018], [0.34, 0.06, 0.026], [-0.36, -0.05, 0.03], [0.22, 0.4, 0.02], [-0.24, 0.42, 0.019], [0.4, -0.18, 0.022]];
  rubbleSpots.forEach(([rx, rz, s], i) => {
    put(shiftUV(P(s * 1.4, s, s * 1.1), 0.3 * i, 0.2 * i), m.wall, [rx, s * 0.4, rz], [rr(-0.3, 0.3), rr(0, 3), rr(-0.3, 0.3)]);
    put(P(s * 0.9, s * 0.7, s), m.wall, [rx + rr(-0.04, 0.04), s * 0.25, rz + rr(-0.05, 0.05)], [rr(-0.4, 0.4), rr(0, 3), rr(-0.4, 0.4)]);
  });

  // ---------- vegetation: instanced leaves ----------
  const leafSpots = [];
  const addLeaf = (x, y, z, s) => leafSpots.push({ p: [x + rr(-0.01, 0.01), y + rr(-0.009, 0.009), z + rr(-0.01, 0.01)], r: [rr(-1.1, 1.1), rr(0, 3.14), rr(-1.1, 1.1)], s: s * rr(0.85, 1.15) });

  // roof-top ivy: a couple of clumps rather than one uniform dome
  const clumps = [[-0.055, -0.02, 0.29, 0.112, 150], [0.16, -0.12, 0.16, 0.07, 52], [-0.21, 0.14, 0.13, 0.062, 44]];
  for (const [cx, cz, cr, ch, n] of clumps) {
    for (let i = 0; i < n; i++) {
      const a = rnd() * Math.PI * 2, r = cr * Math.pow(rnd(), 0.6);
      const x = cx + Math.cos(a) * r, z = cz + Math.sin(a) * r * 0.95;
      if (Math.abs(x) > 0.325 || z < -0.258 || z > 0.288) continue;
      const lift = (1 - r / cr) * ch;
      addLeaf(x, roofY + 0.038 + lift + rr(0, 0.024), z, rr(0.013, 0.022));
    }
  }
  // taller sprigs breaking the roofline
  for (let i = 0; i < 14; i++) {
    addLeaf(rr(-0.16, 0.1), roofY + 0.145 + rr(0, 0.055), rr(-0.16, 0.1), rr(0.011, 0.019));
  }
  // ivy spilling over the front parapet, framing the sign
  for (let i = 0; i < 44; i++) addLeaf(rr(-0.328, -0.15), parY + rr(0.0, 0.05), ZF + rr(0.0, 0.024), rr(0.013, 0.022));
  for (let i = 0; i < 34; i++) addLeaf(rr(0.135, 0.328), parY + rr(0.0, 0.05), ZF + rr(0.0, 0.024), rr(0.013, 0.022));
  for (let i = 0; i < 12; i++) addLeaf(rr(-0.12, 0.1), parY + rr(0.05, 0.078), ZF + rr(0.0, 0.018), rr(0.011, 0.018));
  // climbing the left side wall
  // climbing strands up the side walls: a wavy stem with leaves packed along it
  const climb = (x, z0, z1, top, ph, n) => {
    const pts = [];
    for (let i = 0; i <= 7; i++) {
      const t = i / 7;
      pts.push([x, 0.05 + t * top, z0 + (z1 - z0) * t + Math.sin(t * 5 + ph) * 0.016]);
    }
    put(G.tube(pts, 0.0035, 20, 4), m.leaf);
    for (let i = 0; i < n; i++) {
      const t = rr(0.04, 1), k = Math.min(6, Math.floor(t * 7));
      const p = pts[k];
      addLeaf(p[0] + (x > 0 ? 0.006 : -0.006), p[1] + rr(-0.03, 0.03), p[2] + rr(-0.03, 0.03), rr(0.012, 0.02));
    }
  };
  climb(HW + 0.012, 0.16, 0.05, 0.56, 0.5, 40);
  climb(HW + 0.012, 0.02, -0.06, 0.5, 2.0, 34);
  climb(HW + 0.012, -0.1, -0.17, 0.4, 3.6, 26);
  climb(-HW - 0.012, 0.18, 0.09, 0.6, 1.2, 44);
  climb(-HW - 0.012, 0.0, -0.09, 0.52, 2.9, 36);
  climb(-HW - 0.012, -0.15, -0.2, 0.34, 4.4, 22);
  // only on the solid wall: the narrow strips beside the openings and above them
  for (let i = 0; i < 14; i++) addLeaf(rr(-0.328, -0.29), rr(0.1, 0.46), ZF + rr(0.0, 0.006), rr(0.011, 0.017));
  for (let i = 0; i < 10; i++) addLeaf(rr(0.29, 0.328), rr(0.1, 0.3), ZF + rr(0.0, 0.006), rr(0.011, 0.017));
  for (let i = 0; i < 22; i++) addLeaf(rr(-0.3, 0.3), rr(0.415, 0.5), ZF + rr(0.0, 0.006), rr(0.011, 0.017));
  // hanging vines over the roof edges
  const hangVine = (x0, y0, z0, len, ph) => {
    const pts = [];
    for (let i = 0; i <= 6; i++) {
      const t = i / 6;
      pts.push([x0 + Math.sin(t * 4 + ph) * 0.014, y0 - t * len, z0 + Math.cos(t * 3.4 + ph) * 0.011]);
    }
    put(G.tube(pts, 0.005, 16, 4), m.leaf);
    for (let i = 1; i <= 7; i++) {
      const p = pts[i - 1];
      const n = i % 2 ? 2 : 1;
      for (let k = 0; k < n + 1; k++) addLeaf(p[0] + rr(-0.015, 0.015), p[1] + rr(-0.01, 0.01), p[2] + rr(-0.013, 0.013), rr(0.011, 0.019));
    }
  };
  hangVine(-0.305, parY + 0.02, ZF + 0.014, 0.31, 0.4);
  hangVine(-0.2, parY + 0.02, ZF + 0.014, 0.17, 1.9);
  hangVine(0.19, parY + 0.015, ZF + 0.014, 0.24, 3.1);
  hangVine(0.285, parY + 0.01, ZF + 0.014, 0.15, 0.8);
  hangVine(-HW - 0.014, parY + 0.01, 0.08, 0.34, 2.4);   // left side
  hangVine(-HW - 0.014, parY + 0.01, -0.16, 0.2, 4.2);
  hangVine(HW + 0.014, parY + 0.01, -0.06, 0.3, 5.1);    // right side
  hangVine(-0.12, parY + 0.01, ZB - 0.01, 0.36, 1.2);    // back
  hangVine(0.14, parY + 0.01, ZB - 0.01, 0.22, 3.7);

  const leafGeo = new THREE.SphereGeometry(1, 5, 3); leafGeo.scale(1, 0.5, 1.15);
  const leafInst = new THREE.InstancedMesh(leafGeo, m.leaf, leafSpots.length);
  {
    const mm = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), sc = new THREE.Vector3(), col = new THREE.Color();
    const greens = ['#ffffff', '#e6f0cf', '#c6d8b4', '#f2e6c6', '#d6e2c2', '#b6c9a4', '#9fbe92'];
    leafSpots.forEach((l, i) => {
      e.set(l.r[0], l.r[1], l.r[2]); q.setFromEuler(e);
      v.set(l.p[0], l.p[1], l.p[2]); sc.setScalar(l.s);
      mm.compose(v, q, sc); leafInst.setMatrixAt(i, mm);
      col.set(pick(greens)); col.multiplyScalar(rr(0.86, 1.1));
      leafInst.setColorAt(i, col);
    });
  }
  root.add(leafInst);

  // grass tufts
  const tufts = [];
  for (let i = 0; i < 110; i++) {
    const side = rnd();
    let x, z;
    if (side < 0.4) { x = rr(-0.46, 0.46); z = rr(ZF + 0.03, 0.46); }
    else if (side < 0.6) { x = rr(-0.46, 0.46); z = rr(-0.45, ZB - 0.02); }
    else if (side < 0.8) { x = rr(-0.46, -HW - 0.02); z = rr(-0.4, 0.3); }
    else { x = rr(HW + 0.02, 0.46); z = rr(-0.4, 0.3); }
    if (Math.abs(x) < HW && z < ZF && z > ZB) continue;
    tufts.push({ p: [x, 0.022, z], r: [rr(-0.25, 0.25), rr(0, 3.14), rr(-0.25, 0.25)], s: rr(0.7, 1.3) });
  }
  for (let i = 0; i < 26; i++) tufts.push({ p: [rr(-0.3, 0.3), roofY + 0.055 + rr(0, 0.03), rr(-0.22, 0.24)], r: [rr(-0.3, 0.3), rr(0, 3.14), rr(-0.3, 0.3)], s: rr(0.6, 1.0) });
  const tuftGeo = new THREE.ConeGeometry(0.007, 0.05, 4);
  const tuftInst = new THREE.InstancedMesh(tuftGeo, m.leaf, tufts.length);
  {
    const mm = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), sc = new THREE.Vector3(), col = new THREE.Color();
    const gcols2 = ['#ffffff', '#e2f2cc', '#c2e0b0', '#a6cc98'];
    tufts.forEach((t, i) => {
      e.set(t.r[0], t.r[1], t.r[2]); q.setFromEuler(e);
      v.set(t.p[0], t.p[1], t.p[2]); sc.set(t.s, t.s, t.s);
      mm.compose(v, q, sc); tuftInst.setMatrixAt(i, mm);
      tuftInst.setColorAt(i, col.set(pick(gcols2)));
    });
  }
  root.add(tuftInst);

  // produce + shop goods (instanced, per-instance colour)
  const prodGeo = new THREE.SphereGeometry(1, 7, 5);
  const prodInst = new THREE.InstancedMesh(prodGeo, m.goods, produce.length);
  {
    const mm = new THREE.Matrix4(), q = new THREE.Quaternion(), v = new THREE.Vector3(), sc = new THREE.Vector3(), col = new THREE.Color();
    produce.forEach((p, i) => {
      q.identity(); v.set(p.p[0], p.p[1], p.p[2]); sc.setScalar(p.r);
      mm.compose(v, q, sc); prodInst.setMatrixAt(i, mm);
      prodInst.setColorAt(i, col.set(p.c));
    });
  }
  root.add(prodInst);

  const goodsInst = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), m.goods, goods.length);
  {
    const mm = new THREE.Matrix4(), q = new THREE.Quaternion(), v = new THREE.Vector3(), sc = new THREE.Vector3(), col = new THREE.Color();
    goods.forEach((b, i) => {
      q.identity(); v.set(b.p[0], b.p[1], b.p[2]); sc.set(b.s[0], b.s[1], b.s[2]);
      mm.compose(v, q, sc); goodsInst.setMatrixAt(i, mm);
      goodsInst.setColorAt(i, col.set(b.c));
    });
  }
  root.add(goodsInst);

  // warm glow through the window
  const winGlow = glowSprite(0xffb765, 0.3, 0.3); winGlow.position.set(-0.122, 0.255, ZF + 0.028); root.add(winGlow); halos.push(winGlow);

  // one warm point light at the entrance
  // brief: intensity ~4.5, distance ~2.4 WORLD units. The site scales this group by 3.55,
  // so the local distance is 2.4 / SCALE. Kept warm and close to the entrance.
  const SCALE = 3.55;
  const lamp = new THREE.PointLight(0xffb565, 4.5, 2.4 / SCALE, 2);
  lamp.position.set(0.1, 0.185, ZF + 0.245);
  root.add(lamp);

  finalize(root);

  return {
    group: root,
    update(t) {
      const f = 1 + Math.sin(t * 2.3) * 0.045 + Math.sin(t * 7.7) * 0.028 + Math.sin(t * 13.3) * 0.014;
      m.bulb.emissiveIntensity = 2.5 * f;
      m.inside.emissiveIntensity = 1.5 + Math.sin(t * 1.7) * 0.07;
      lamp.intensity = 4.5 * f;
      halos.forEach((h, i) => {
        const k = 0.86 + Math.sin(t * 2.3 + i * 1.7) * 0.08 + Math.sin(t * 9.1 + i) * 0.05;
        h.material.opacity = h.userData.base ? h.userData.base * k : 0.85 * k;
      });
    },
  };
}
