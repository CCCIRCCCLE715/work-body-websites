// 代码晶体 — a cluster of faceted translucent mint crystals growing out of soft pastel blob pillows,
// with a tiny open laptop at the front and code-glyph sparkles drifting around it.
import * as THREE from 'three';
import { G, mat, gloss, glow, metal, mesh, group, canvasTexture, glowSprite, finalize } from './kit.js';

let M = null;
function materials() {
  if (M) return M;

  // ---- gold circuit traces on a dark pad (canvas) ----
  const circuitTex = canvasTexture(512, 512, (g, w, h) => {
    g.fillStyle = '#123038'; g.fillRect(0, 0, w, h);
    const grd = g.createRadialGradient(w * 0.5, h * 0.5, 20, w * 0.5, h * 0.5, w * 0.62);
    grd.addColorStop(0, 'rgba(90,255,215,0.30)'); grd.addColorStop(1, 'rgba(6,20,26,0)');
    g.fillStyle = grd; g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(120,255,215,0.18)';
    for (let x = 16; x < w; x += 32) for (let y = 16; y < h; y += 32) { g.beginPath(); g.arc(x, y, 1.7, 0, 7); g.fill(); }
    let s = 7;
    const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
    g.lineCap = 'round'; g.lineJoin = 'round';
    for (let i = 0; i < 26; i++) {
      let x = Math.floor(rnd() * 15) * 32 + 16, y = Math.floor(rnd() * 15) * 32 + 16;
      const x0 = x, y0 = y;
      g.beginPath(); g.moveTo(x, y);
      for (let k = 0; k < 4; k++) {
        const len = (1 + Math.floor(rnd() * 3)) * 32, d = Math.floor(rnd() * 4);
        x += d === 0 ? len : d === 1 ? -len : 0;
        y += d === 2 ? len : d === 3 ? -len : 0;
        x = Math.min(w - 16, Math.max(16, x)); y = Math.min(h - 16, Math.max(16, y));
        g.lineTo(x, y);
      }
      g.strokeStyle = 'rgba(255,205,110,0.95)'; g.lineWidth = 4.5; g.stroke();
      g.strokeStyle = 'rgba(255,246,214,0.85)'; g.lineWidth = 1.6; g.stroke();
      g.fillStyle = '#ffe6a8'; g.beginPath(); g.arc(x, y, 5.5, 0, 7); g.fill();
      g.strokeStyle = 'rgba(255,230,168,0.8)'; g.lineWidth = 3.5; g.beginPath(); g.arc(x0, y0, 4.5, 0, 7); g.stroke();
    }
  });

  // ---- code shown on the laptop screen ----
  const codeTex = canvasTexture(256, 160, (g, w, h) => {
    g.fillStyle = '#0c1b2c'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#16304a'; g.fillRect(0, 0, w, 17);
    ['#ff7b8a', '#ffcf6a', '#7ce0a8'].forEach((c, i) => { g.fillStyle = c; g.beginPath(); g.arc(9 + i * 11, 8.5, 3.2, 0, 7); g.fill(); });
    g.fillStyle = 'rgba(140,200,255,0.5)'; g.fillRect(52, 5, 96, 3); g.fillRect(52, 11, 60, 2);
    const rows = [
      [['#ff9ab0', 'import'], ['#cfe0f5', ' * as '], ['#ffd479', 'THREE'], ['#cfe0f5', ' from '], ['#a6e3a1', "'three'"]],
      [['#ff9ab0', 'const'], ['#7fd7ff', ' crystal'], ['#cfe0f5', ' = '], ['#ffd479', 'new'], ['#cfe0f5', ' Mesh(']],
      [['#cfe0f5', '  '], ['#7fd7ff', 'geo'], ['#cfe0f5', ', '], ['#7fd7ff', 'mint'], ['#cfe0f5', ');']],
      [['#6b8299', '// glow follows'], ['#7fd7ff', ' time']],
      [['#ff9ab0', 'function'], ['#7fd7ff', ' update'], ['#cfe0f5', '(t) {']],
      [['#cfe0f5', '  e = '], ['#f2b8ff', 'sin'], ['#cfe0f5', '(t * '], ['#ffd479', '1.6'], ['#cfe0f5', ');']],
      [['#ffd479', '  return'], ['#7fd7ff', ' sparkle'], ['#cfe0f5', '; },']],
    ];
    g.textBaseline = 'middle';
    rows.forEach((row, i) => {
      const y = 27 + i * 18;
      g.font = '600 13px ui-monospace, Menlo, monospace';
      let x = 9;
      for (const [c, txt] of row) { g.fillStyle = c; g.fillText(txt, x, y); x += g.measureText(txt).width; }
    });
    g.fillStyle = 'rgba(140,230,255,0.85)'; g.fillRect(9, 143, 7, 11);
    g.strokeStyle = 'rgba(120,220,255,0.14)'; g.lineWidth = 2; g.strokeRect(2, 2, w - 4, h - 4);
  });

  M = {
    crystal: gloss(0x63ecc0, { transparent: true, opacity: 0.74, emissive: 0x1fc894, emissiveIntensity: 0.42, roughness: 0.09, clearcoat: 1, clearcoatRoughness: 0.05, flatShading: true, side: THREE.DoubleSide }),
    core: glow(0xd6fff2, 2.1, { roughness: 0.3 }),
    pink: mat(0xffb9d2, { roughness: 0.95 }),
    lime: mat(0xd2f58c, { roughness: 0.95 }),
    peach: mat(0xffd2ab, { roughness: 0.95 }),
    circuit: mat(0xffffff, { map: circuitTex, emissive: 0xffffff, emissiveMap: circuitTex, emissiveIntensity: 0.75, roughness: 0.55 }),
    shell: gloss(0xfdf4e6, { roughness: 0.3, clearcoat: 0.7 }),
    dark: mat(0x36455e, { roughness: 0.55 }),
    screen: mat(0x0c1b2c, { map: codeTex, emissive: 0xffffff, emissiveMap: codeTex, emissiveIntensity: 1.25, roughness: 0.35 }),
    gold: metal(0xffcf6a, 0.28),
  };
  return M;
}

function crystalGeo(h, r) {
  return G.lathe([[0, 0], [r * 0.64, 0], [r * 0.98, h * 0.10], [r * 1.0, h * 0.50], [r * 0.76, h * 0.80], [r * 0.34, h * 0.95], [0, h]], 6);
}
function pillowGeo(R, H) {
  return G.lathe([[0, 0], [R * 0.52, H * 0.02], [R * 0.86, H * 0.14], [R, H * 0.42], [R * 0.93, H * 0.68], [R * 0.64, H * 0.88], [R * 0.30, H * 0.97], [0, H]], 26);
}

function glyphTexture(text, color) {
  return canvasTexture(128, 128, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    g.font = '800 70px ui-monospace, Menlo, monospace';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    // dark halo first so the glyph separates from the bright ground
    g.shadowColor = 'rgba(20,40,50,0.85)'; g.shadowBlur = 12;
    g.lineWidth = 12; g.strokeStyle = 'rgba(20,40,50,0.9)'; g.lineJoin = 'round';
    g.strokeText(text, w / 2, h / 2 + 3);
    // saturated face
    g.shadowColor = color; g.shadowBlur = 16;
    g.lineWidth = 3; g.strokeStyle = color; g.strokeText(text, w / 2, h / 2 + 3);
    g.shadowBlur = 4; g.fillStyle = color; g.fillText(text, w / 2, h / 2 + 3);
  });
}

export function build() {
  const m = materials();
  const root = new THREE.Group();
  const anim = { glyphs: [], halos: [] };

  // ---- soft pastel blob pillows forming the base ----
  mesh(pillowGeo(0.325, 0.20), m.pink, { parent: root, pos: [0, 0, -0.15], scale: [1.42, 1, 1.06] });
  mesh(pillowGeo(0.235, 0.17), m.lime, { parent: root, pos: [-0.255, 0, 0.145], scale: [1.02, 1, 1.0] });
  mesh(pillowGeo(0.235, 0.16), m.peach, { parent: root, pos: [0.265, 0, 0.12], scale: [1.0, 1, 1.02] });
  mesh(pillowGeo(0.185, 0.14), m.pink, { parent: root, pos: [0.0, 0, 0.30], scale: [1.18, 1, 0.95] });
  for (const [x, z, rr] of [[-0.335, -0.22, 0.05], [0.345, -0.20, 0.045], [-0.335, 0.24, 0.04], [0.345, 0.22, 0.04]]) {
    mesh(G.sphere(rr, 10, 8), m.shell, { parent: root, pos: [x, 0.145, z], scale: [1, 0.35, 1] });
  }

  // ---- glowing circuit pad the crystals grow through ----
  mesh(G.cyl(0.20, 0.205, 0.022, 40), m.circuit, { parent: root, pos: [0.01, 0.176, -0.09] });
  mesh(G.torus(0.203, 0.006, 6, 40), m.gold, { parent: root, pos: [0.01, 0.186, -0.09], rot: [Math.PI / 2, 0, 0] });
  for (let i = 0; i < 6; i++) {
    const a = i / 6 * Math.PI * 2 + 0.3;
    mesh(G.cyl(0.008, 0.008, 0.01, 8), m.gold, { parent: root, pos: [0.01 + Math.cos(a) * 0.168, 0.191, -0.09 + Math.sin(a) * 0.168] });
  }

  // tiny gold chips / capacitors dotted around the pad
  for (let i = 0; i < 7; i++) {
    const a = i / 7 * Math.PI * 2 + 1.05, r = 0.126 + (i % 2) * 0.045;
    mesh(G.box(0.026, 0.009, 0.016, 0.003, 1), m.gold, {
      parent: root, pos: [0.01 + Math.cos(a) * r, 0.189, -0.09 + Math.sin(a) * r], rot: [0, a, 0],
    });
  }

  // ---- mint crystals (chunky, faceted, translucent) with glowing cores ----
  const crystals = [
    { p: [0.0, 0.185, -0.11], r: 0.155, h: 0.655, rot: [0.05, 0.35, -0.06] },
    { p: [-0.19, 0.18, -0.045], r: 0.112, h: 0.395, rot: [-0.07, 0.9, 0.11] },
    { p: [0.185, 0.175, -0.035], r: 0.118, h: 0.345, rot: [0.09, 0.2, -0.14] },
    { p: [-0.255, 0.145, 0.155], r: 0.078, h: 0.225, rot: [-0.12, 1.4, 0.16] },
    { p: [0.26, 0.135, 0.135], r: 0.074, h: 0.19, rot: [0.14, 0.6, -0.18] },
  ];
  for (const c of crystals) {
    const g = group(root, { pos: c.p, rot: c.rot });
    mesh(crystalGeo(c.h, c.r), m.crystal, { parent: g });
    mesh(crystalGeo(c.h * 0.78, c.r * 0.34), m.core, { parent: g, pos: [0, c.h * 0.10, 0] });
    mesh(G.torus(c.r * 0.95, 0.0075, 6, 20), m.gold, { parent: g, pos: [0, 0.012, 0], rot: [Math.PI / 2, 0, 0] });
    const halo = glowSprite(0x7dffd6, c.r * 2.6, 0.5);
    halo.position.set(c.p[0], c.p[1] + c.h * 0.55, c.p[2] + 0.02);
    root.add(halo); anim.halos.push({ s: halo, base: c.r * 2.6, k: Math.random() * 6.28 });
  }

  // ---- tiny open laptop on the front cushion ----
  const LAP = group(root, { pos: [0.01, 0.122, 0.30], rot: [0, -0.12, 0] });
  mesh(G.box(0.245, 0.016, 0.17, 0.006), m.shell, { parent: LAP, pos: [0, 0.008, 0] });
  mesh(G.box(0.205, 0.005, 0.12, 0.003), m.dark, { parent: LAP, pos: [0, 0.017, 0.008] });
  for (let r0 = 0; r0 < 3; r0++) for (let c0 = 0; c0 < 6; c0++) {
    mesh(G.box(0.026, 0.004, 0.014, 0.0018, 1), m.shell, { parent: LAP, pos: [-0.0625 + c0 * 0.025, 0.02, -0.028 + r0 * 0.019] });
  }
  mesh(G.box(0.078, 0.004, 0.012, 0.0018, 1), m.shell, { parent: LAP, pos: [0, 0.02, 0.036] });
  const LID = group(LAP, { pos: [0, 0.014, -0.085], rot: [-0.30, 0, 0] });
  mesh(G.box(0.245, 0.148, 0.013, 0.006), m.shell, { parent: LID, pos: [0, 0.074, 0] });
  mesh(G.box(0.215, 0.118, 0.004, 0.002), m.screen, { parent: LID, pos: [0, 0.076, 0.0072] });
  for (const s of [-1, 1]) mesh(G.cyl(0.008, 0.008, 0.022, 8), m.gold, { parent: LAP, pos: [s * 0.095, 0.012, -0.085], rot: [0, 0, Math.PI / 2] });
  const scr = glowSprite(0x8fe4ff, 0.30, 0.35); scr.position.set(0.01, 0.20, 0.265); root.add(scr);

  // ---- floating code-glyph sparkles ----
  const glyphs = [
    ['{ }', '#0f9b78', [0.30, 0.62, 0.16]],
    ['</>', '#1c6fc4', [-0.26, 0.74, 0.10]],
    ['01', '#c07816', [0.12, 0.80, -0.22]],
    ['=>', '#c23c8e', [-0.31, 0.44, 0.24]],
    ['#', '#4d9b22', [0.33, 0.34, -0.14]],
    ['λ', '#9a3fc0', [-0.10, 0.50, 0.28]],
    ['()', '#0d8f9b', [0.22, 0.55, -0.30]],
    ['*', '#b9871a', [-0.24, 0.28, -0.28]],
  ];
  glyphs.forEach(([txt, col, p], i) => {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glyphTexture(txt, col), transparent: true, depthWrite: false, opacity: 1, toneMapped: false }));
    s.position.set(...p); s.scale.setScalar(0.115 + (i % 3) * 0.018);
    root.add(s);
    anim.glyphs.push({ s, base: p.slice(), k: i * 0.9, amp: 0.012 + (i % 3) * 0.006 });
  });

  finalize(root);
  return {
    group: root,
    update(t) {
      m.crystal.emissiveIntensity = 0.42 + Math.sin(t * 1.7) * 0.18 + Math.sin(t * 4.3) * 0.04;
      m.core.emissiveIntensity = 2.1 + Math.sin(t * 2.4) * 0.6;
      m.circuit.emissiveIntensity = 0.7 + Math.sin(t * 2.9) * 0.16;
      m.screen.emissiveIntensity = 1.2 + Math.sin(t * 7.5) * 0.08;
      anim.halos.forEach(({ s, base, k }) => {
        s.scale.setScalar(base * (1 + Math.sin(t * 1.9 + k) * 0.07));
        s.material.opacity = 0.40 + Math.sin(t * 1.9 + k) * 0.12;
      });
      anim.glyphs.forEach(({ s, base, k, amp }) => {
        s.position.y = base[1] + Math.sin(t * 1.25 + k) * amp * 2.2;
        s.position.x = base[0] + Math.sin(t * 0.6 + k * 1.7) * amp;
        s.material.opacity = 0.75 + Math.sin(t * 2.2 + k) * 0.2;
      });
    },
  };
}
