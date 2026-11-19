import * as THREE from 'three';
import { BODY, std, patternTexture, chestGarment, skirtGarment, sleeve, trousers } from './avatar.js';

// Each outfit returns groups keyed by rig slot: torso, skirt, armL, armR, head, handL, handR, back.
// Because they are parented to the joints, the walk cycle moves the clothes too.
const box = (w, h, d, color, pos, rot = [0, 0, 0], o = {}) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), color.isMaterial ? color : std(color, o)); m.position.set(...pos); m.rotation.set(...rot); return m; };
const ball = (r, color, pos, scale = [1, 1, 1], o = {}) => { const m = new THREE.Mesh(new THREE.SphereGeometry(r, 16, 12), color.isMaterial ? color : std(color, o)); m.position.set(...pos); m.scale.set(...scale); return m; };
const cyl = (r0, r1, h, color, pos, rot = [0, 0, 0], o = {}, seg = 16) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(r1, r0, h, seg), color.isMaterial ? color : std(color, o)); m.position.set(...pos); m.rotation.set(...rot); return m; };
const torus = (r, tube, color, pos, rot = [0, 0, 0], o = {}) => { const m = new THREE.Mesh(new THREE.TorusGeometry(r, tube, 8, 22), color.isMaterial ? color : std(color, o)); m.position.set(...pos); m.rotation.set(...rot); return m; };
const ring = (y, r, cz, tube, color, o = {}) => torus(r, tube, color, [0, y, cz], [Math.PI / 2, 0, 0], o);

function hatCrown(parent, { band = 0x1f1f28, board = 0x1f1f28, trim = 0xe9b949 } = {}) {
  const g = new THREE.Group(); parent.add(g);
  g.add(cyl(0.142, 0.146, 0.05, band, [0, 0.095, -0.004], [-0.06, 0, 0], { roughness: 0.6 }, 22));
  g.add(cyl(0.15, 0.15, 0.011, trim, [0, 0.068, -0.004], [-0.06, 0, 0], { metalness: 0.7, roughness: 0.3 }, 22));
  g.add(box(0.24, 0.012, 0.15, board, [0, 0.128, -0.008], [-0.05, 0, 0]));
  g.add(box(0.245, 0.005, 0.155, trim, [0, 0.134, -0.008], [-0.05, 0, 0], { metalness: 0.7, roughness: 0.3 }));
  const beadMats = [std(0xfff4c9, { roughness: 0.3 }), std(0xd9532f, { roughness: 0.3 })];
  for (let i = 0; i < 7; i++) for (let k = 0; k < 2; k++) g.add(ball(0.0075, beadMats[(i + k) % 2], [-0.09 + i * 0.03, 0.118 - k * 0.017, 0.085]));
  return g;
}
function crossCollar(parent, color, y0 = 0.235, y1 = 0.16, z = 0.108) {
  const g = new THREE.Group(); parent.add(g);
  g.add(box(0.026, 0.13, 0.01, color, [-0.032, (y0 + y1) / 2, z], [0.1, 0, -0.5]));
  g.add(box(0.026, 0.11, 0.01, color, [0.036, (y0 + y1) / 2 + 0.006, z - 0.004], [0.1, 0, 0.5]));
  return g;
}
function bowtie(parent, color, y, z) {
  const g = new THREE.Group(); parent.add(g);
  g.add(ball(0.02, color, [-0.02, y, z], [1.2, 0.75, 0.5]));
  g.add(ball(0.02, color, [0.02, y, z], [1.2, 0.75, 0.5]));
  g.add(ball(0.009, color, [0, y, z]));
  return g;
}
function shawl(parent, color, { y = 0.20, r = 0.105, tube = 0.022 } = {}) {
  const g = new THREE.Group(); parent.add(g);
  g.add(torus(r, tube, color, [0, y, 0.012], [Math.PI / 2, 0, 0], { roughness: 0.92 }));
  return g;
}

// Each builder returns nothing; the slot groups receive the parts. Long robes set `o.longRobe = true`
// so the rig hides the bare legs under the hem.
const BUILDERS = {
  // ---------- 皇帝 ----------
  emperor(o) {
    o.longRobe = true;
    o.torso.add(chestGarment(0xf3c54e, { map: patternTexture('cloud', '#f3c54e', '#d9532f', '#c23b2c'), mapRepeat: 2, roughness: 0.7 }));
    o.torso.add(ring(0.30, 0.116, 0.014, 0.017, 0x4fae7a, { roughness: 0.5 }));
    o.torso.add(ring(0.575, 0.072, 0.006, 0.012, 0xc23b2c));
    o.torso.add(crossCollar(o.torso, 0xc23b2c));
    o.skirt.add(skirtGarment(0xf3c54e, { hem: 0.012, flare: 0.05, map: patternTexture('cloud', '#f3c54e', '#d9532f', '#c23b2c'), mapRepeat: 2, roughness: 0.7 }));
    for (const s of [o.armL, o.armR]) { s.add(sleeve(0xf3c54e, { len: 0.26, r0: 0.056, r1: 0.05, cuff: 0xc23b2c, map: patternTexture('cloud', '#f3c54e', '#d9532f', '#c23b2c') })); }
    o.head.add(hatCrown(o.head));
    o.handR.add(cyl(0.012, 0.016, 0.22, 0x8a5a3c, [0, 0.03, 0.02], [0.4, 0, 0]));
  },
  // ---------- 书生 ----------
  scholar(o) {
    o.longRobe = true;
    o.torso.add(chestGarment(0xbfe3dc, { map: patternTexture('bamboo', '#c3e6de', '#7fb7a3', '#2f4f6a'), mapRepeat: 2 }));
    o.torso.add(ring(0.305, 0.116, 0.014, 0.014, 0x2f4f6a));
    o.torso.add(crossCollar(o.torso, 0x2f4f6a));
    o.skirt.add(skirtGarment(0xbfe3dc, { hem: 0.012, flare: 0.04, map: patternTexture('bamboo', '#c3e6de', '#7fb7a3', '#2f4f6a'), mapRepeat: 2 }));
    for (const s of [o.armL, o.armR]) s.add(sleeve(0xbfe3dc, { len: 0.26, r0: 0.058, r1: 0.055, cuff: 0x2f4f6a }));
    const cap = new THREE.Group(); o.head.add(cap);
    cap.add(ball(0.148, 0x2c3550, [0, 0.115, -0.018], [1.05, 0.52, 1.05], { roughness: 0.9 }));
    cap.add(ball(0.068, 0x2c3550, [0, 0.175, -0.026], [1, 0.85, 1], { roughness: 0.9 }));
    for (const x of [-0.04, 0.04]) cap.add(box(0.024, 0.19, 0.005, 0x2c3550, [x, 0.03, -0.155], [0.28, 0, x * 2]));
    const fanGeo = new THREE.CircleGeometry(0.1, 16, Math.PI * 0.18, Math.PI * 0.64);
    const fan = new THREE.Mesh(fanGeo, std(0xfffaf0, { side: THREE.DoubleSide, map: patternTexture('bamboo', '#fffaf0', '#7fb7a3', '#fffaf0') }));
    fan.rotation.set(0, Math.PI / 2, 0); fan.position.set(0, 0.0, 0.02); o.handR.add(fan);
  },
  // ---------- 末日幸存者 ----------
  survivor(o) {
    o.torso.add(chestGarment(0x7d8c4b, { map: patternTexture('weave', '#7d8c4b', '#3b4420') }));
    o.torso.add(ring(0.302, 0.117, 0.014, 0.014, 0x5b4630));
    for (const x of [-0.06, 0.06]) o.torso.add(box(0.05, 0.045, 0.016, 0x6b7a3d, [x, 0.14, 0.088]));
    for (const s of [o.armL, o.armR]) s.add(sleeve(0x7d8c4b, { len: 0.225, r0: 0.052, r1: 0.044, cuff: 0x6b7a3d }));
    for (const leg of [o.legL, o.legR]) { /* handled by trousers below */ }
    o.legL.add(trousers(0x4d5340, { cuff: 0x3a4036 })); o.legR.add(trousers(0x4d5340, { cuff: 0x3a4036 }));
    // bandana + goggles on the head
    const h = new THREE.Group(); o.head.add(h);
    h.add(torus(0.168, 0.024, 0xd9482f, [0, 0.095, 0], [Math.PI / 2 - 0.12, 0, 0], { roughness: 0.9 }));
    h.add(ball(0.028, 0xd9482f, [0, 0.09, -0.175], [1.4, 1, 0.8]));
    for (const x of [-0.055, 0.055]) {
      h.add(cyl(0.033, 0.033, 0.028, 0x44403a, [x, 0.135, 0.145], [Math.PI / 2 - 0.4, 0, 0], { metalness: 0.4, roughness: 0.4 }, 14));
      h.add(cyl(0.024, 0.024, 0.03, 0x9fd8ff, [x, 0.137, 0.152], [Math.PI / 2 - 0.4, 0, 0], { roughness: 0.1, metalness: 0.2 }, 14));
    }
    // backpack on the back
    o.back.add(box(0.17, 0.19, 0.085, 0x9a6b3f, [0, 0.16, -0.115]));
    o.back.add(box(0.14, 0.05, 0.03, 0x7f5833, [0, 0.09, -0.16]));
    o.back.add(cyl(0.05, 0.05, 0.17, 0xd8c79a, [0, 0.25, -0.125], [0, 0, Math.PI / 2]));
    o.handR.add(cyl(0.016, 0.021, 0.1, 0x3d3d3d, [0, 0.02, 0.03], [Math.PI / 2, 0, 0], { metalness: 0.5, roughness: 0.4 }, 12));
  },
  // ---------- 导演 ----------
  director(o) {
    o.torso.add(chestGarment(0xcaa56c, { map: patternTexture('weave', '#caa56c', '#8a6b3c') }));
    for (const x of [-0.06, 0.06]) for (const y of [0.11, 0.2]) o.torso.add(box(0.042, 0.034, 0.014, 0xb38f58, [x, y, 0.09]));
    o.torso.add(shawl(o.torso, 0xe0574d, { y: 0.245, r: 0.085, tube: 0.026 }));
    o.torso.add(box(0.036, 0.14, 0.016, 0xe0574d, [0.045, 0.18, 0.085], [0.08, 0, 0.12]));
    for (const s of [o.armL, o.armR]) s.add(sleeve(0xcaa56c, { len: 0.225, r0: 0.052, r1: 0.044, cuff: 0xb38f58 }));
    o.legL.add(trousers(0x8f7a55, { cuff: 0x6d5c3e })); o.legR.add(trousers(0x8f7a55, { cuff: 0x6d5c3e }));
    const beret = new THREE.Group(); o.head.add(beret);
    beret.add(ball(0.165, 0xd2483f, [0.015, 0.145, -0.01], [1.05, 0.36, 1.05], { roughness: 0.95 }));
    beret.add(ball(0.011, 0xd2483f, [0.02, 0.2, -0.01]));
    const mega = new THREE.Group(); o.handR.add(mega);
    mega.add(cyl(0.02, 0.06, 0.12, 0xffffff, [0, 0.02, 0.075], [Math.PI / 2, 0, 0], { roughness: 0.4 }, 16));
    mega.add(cyl(0.011, 0.011, 0.055, 0x333333, [0, -0.02, 0], [0, 0, 0], {}, 10));
  },
  // ---------- 短剧男主 ----------
  drama_lead(o) {
    o.longRobe = true;
    o.torso.add(chestGarment(0xf6f1e6, { map: patternTexture('cloud', '#f6f1e6', '#e5d3b0', '#b2302b'), mapRepeat: 2 }));
    o.torso.add(ring(0.305, 0.116, 0.014, 0.014, 0x1f1f28));
    o.torso.add(crossCollar(o.torso, 0xb2302b));
    o.skirt.add(skirtGarment(0xf6f1e6, { hem: 0.012, flare: 0.04, map: patternTexture('cloud', '#f6f1e6', '#e5d3b0', '#b2302b'), mapRepeat: 2 }));
    o.back.add(skirtGarment(0xb2302b, { hem: 0.075, flare: 0.075, back: true }));
    for (const s of [o.armL, o.armR]) s.add(sleeve(0xf6f1e6, { len: 0.26, r0: 0.058, r1: 0.055, cuff: 0xb2302b }));
    const top = new THREE.Group(); o.head.add(top);
    top.add(ball(0.052, 0x14141a, [0, 0.19, -0.035], [1, 0.8, 1]));
    top.add(cyl(0.038, 0.046, 0.036, 0xe9b949, [0, 0.2, -0.035], [0, 0, 0], { metalness: 0.7, roughness: 0.3 }, 14));
    top.add(cyl(0.0045, 0.0045, 0.14, 0xe9b949, [0, 0.205, -0.035], [0, 0, Math.PI / 2], { metalness: 0.7, roughness: 0.3 }, 8));
    // scroll
    const scroll = new THREE.Group(); o.handR.add(scroll);
    scroll.add(cyl(0.02, 0.02, 0.13, 0xf3e3c0, [0, 0, 0.03], [0, 0, Math.PI / 2], {}, 14));
    for (const x of [-0.072, 0.072]) scroll.add(cyl(0.011, 0.011, 0.026, 0x8a5a3c, [x, 0, 0.03], [0, 0, Math.PI / 2], {}, 10));
  },
  // ---------- 设计师 ----------
  designer(o) {
    o.torso.add(chestGarment(0x58bdb5));
    o.torso.add(skirtGarment(0xfff6e6, { hem: 0.16, flare: 0.028, front: true, open: Math.PI * 1.15, map: patternTexture('splash', '#fff6e6', '#000') }));
    for (const s of [o.armL, o.armR]) s.add(sleeve(0x58bdb5, { len: 0.225, r0: 0.05, r1: 0.042, cuff: 0xfff6e6 }));
    o.legL.add(trousers(0x4b5a6b)); o.legR.add(trousers(0x4b5a6b));
    const beret = new THREE.Group(); o.head.add(beret);
    beret.add(ball(0.165, 0xf2b134, [-0.02, 0.14, -0.012], [1.08, 0.34, 1.08], { roughness: 0.95 }));
    beret.add(ball(0.011, 0xf2b134, [-0.02, 0.198, -0.012]));
    beret.add(cyl(0.005, 0.005, 0.12, 0xffd166, [0.15, 0.06, 0.02], [0.3, 0, 0.9], {}, 8));
    const pal = new THREE.Group(); o.handL.add(pal);
    const board = new THREE.Mesh(new THREE.CylinderGeometry(0.068, 0.068, 0.009, 20), std(0xe9c48f)); board.rotation.x = Math.PI / 2 - 0.3; pal.add(board);
    ['#ff6b6b', '#ffd166', '#4dabf7', '#8ce99a', '#b197fc'].forEach((c, i) => { const a = i * 1.1; pal.add(ball(0.011, new THREE.Color(c), [Math.cos(a) * 0.04, Math.sin(a) * 0.04, 0.011])); });
    pal.position.set(0, 0.02, 0.055);
    o.handR.add(cyl(0.0045, 0.006, 0.14, 0x8a5a3c, [0, 0.03, 0.04], [0.5, 0, 0], {}, 8));
  },
  // ---------- 手机管家 ----------
  phone_steward(o) {
    o.torso.add(chestGarment(0x23262f, { open: 0.7 }));
    o.torso.add(chestGarment(0xfaf8f2, { scale: 0.97, yTop: 0.6 }));
    o.torso.add(bowtie(o.torso, 0xc23b47, 0.255, 0.075));
    for (const y of [0.11, 0.16, 0.21]) o.torso.add(ball(0.008, 0xe9b949, [0, y, 0.088], [1, 1, 0.5], { metalness: 0.7, roughness: 0.3 }));
    o.skirt.add(skirtGarment(0x23262f, { hem: 0.075, flare: 0.04, back: true }));
    o.legL.add(trousers(0x23262f)); o.legR.add(trousers(0x23262f));
    for (const s of [o.armL, o.armR]) s.add(sleeve(0x23262f, { len: 0.225, r0: 0.052, r1: 0.044, cuff: 0xffffff }));
    o.head.add(ball(0.016, 0x2b2b2b, [-0.165, -0.02, 0.02]));
    const phone = new THREE.Group(); o.handR.add(phone);
    phone.add(box(0.055, 0.1, 0.009, 0x4a6cf7, [0, 0.03, 0.05], [0.3, 0, 0], { roughness: 0.3 }));
    phone.add(box(0.045, 0.085, 0.002, 0x9ff0d0, [0, 0.03, 0.056], [0.3, 0, 0], { emissive: 0x6be0b0, emissiveIntensity: 0.6 }));
  },
  // ---------- 程序员 ----------
  programmer(o) {
    o.torso.add(chestGarment(0x6cc28c, { map: patternTexture('circuit', '#6cc28c', '#4ea06e') }));
    o.torso.add(box(0.11, 0.05, 0.014, 0x5fb27e, [0, 0.12, 0.088]));
    for (const x of [-0.022, 0.022]) o.torso.add(cyl(0.0035, 0.0035, 0.08, 0xffffff, [x, 0.215, 0.075], [0, 0, 0], {}, 6));
    for (const s of [o.armL, o.armR]) s.add(sleeve(0x6cc28c, { len: 0.23, r0: 0.052, r1: 0.044, cuff: 0x5fb27e }));
    o.legL.add(trousers(0x3f4a55)); o.legR.add(trousers(0x3f4a55));
    const head = new THREE.Group(); o.head.add(head);
    head.add(torus(0.185, 0.013, 0x2f3542, [0, 0.05, -0.004], [0.1, 0, 0], { roughness: 0.4 }));
    for (const x of [-0.178, 0.178]) head.add(cyl(0.044, 0.044, 0.036, 0xff8a65, [x, 0.04, 0], [0, 0, Math.PI / 2], { roughness: 0.4 }, 14));
    o.back.add(torus(0.09, 0.03, 0x5fb27e, [0, 0.24, -0.05], [-1.3, 0, Math.PI], { roughness: 0.85 }));
    const laptop = new THREE.Group(); o.handL.add(laptop);
    laptop.add(box(0.14, 0.007, 0.095, 0xc9ced6, [0, 0, 0.05], [0, 0, 0], { metalness: 0.5, roughness: 0.35 }));
    laptop.add(box(0.14, 0.09, 0.005, 0xc9ced6, [0, 0.045, 0.004], [-0.25, 0, 0], { metalness: 0.5, roughness: 0.35 }));
    laptop.add(box(0.125, 0.072, 0.002, 0x1c2b3a, [0, 0.045, 0.008], [-0.25, 0, 0], { emissive: 0x2fd39b, emissiveIntensity: 0.4, map: patternTexture('circuit', '#1c2b3a', '#2fd39b') }));
    laptop.position.set(0.035, 0, 0.02); laptop.rotation.y = -0.6;
  },
  // ---------- 拌面主理人 ----------
  curator(o) {
    o.torso.add(chestGarment(0xf2e2c4));
    o.torso.add(skirtGarment(0xffffff, { hem: 0.16, flare: 0.03, front: true, open: Math.PI * 1.1, map: patternTexture('stripes', '#ffffff', '#f4a259', '#ffffff') }));
    o.torso.add(ring(0.255, 0.082, 0.006, 0.02, 0xf4a259));
    for (const s of [o.armL, o.armR]) s.add(sleeve(0xf2e2c4, { len: 0.225, r0: 0.05, r1: 0.042, cuff: 0xf4a259 }));
    o.legL.add(trousers(0x6b6f78)); o.legR.add(trousers(0x6b6f78));
    const hat = new THREE.Group(); o.head.add(hat);
    hat.add(cyl(0.115, 0.12, 0.085, 0xffffff, [0, 0.15, -0.01], [-0.06, 0, 0], { roughness: 0.95 }, 18));
    [[0, 0.235, -0.018, 0.098], [0.066, 0.215, 0.0, 0.066], [-0.066, 0.215, -0.026, 0.066], [0.0, 0.215, 0.062, 0.066], [0, 0.215, -0.085, 0.066]].forEach(([x, y, z, r]) => hat.add(ball(r, 0xffffff, [x, y, z], [1, 0.85, 1], { roughness: 0.95 })));
    const bowl = new THREE.Group(); o.handL.add(bowl);
    bowl.add(new THREE.Mesh(new THREE.SphereGeometry(0.055, 18, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), std(0x5aa0d8, { side: THREE.DoubleSide, roughness: 0.4 })));
    bowl.add(ball(0.05, 0xf0b35a, [0, -0.007, 0], [1, 0.3, 1], { roughness: 0.6 }));
    bowl.add(ball(0.013, 0x6cc36a, [0.018, 0.006, 0.008], [1, 0.5, 1]));
    bowl.add(ball(0.011, 0xe0574d, [-0.018, 0.006, -0.008], [1, 0.5, 1]));
    for (const x of [-0.008, 0.008]) bowl.add(cyl(0.0028, 0.0036, 0.14, 0xd8b07a, [x, 0.04, 0], [0.6, 0, 0.1], {}, 6));
    bowl.position.set(0, 0.045, 0.06);
  },
  // ---------- 巫师 ----------
  wizard(o) {
    o.longRobe = true;
    o.torso.add(chestGarment(0x8b6fd6, { map: patternTexture('stars', '#8b6fd6', '#ffe28a', '#ffffff'), mapRepeat: 2 }));
    o.torso.add(ring(0.25, 0.09, 0.006, 0.02, 0xffe28a));
    o.skirt.add(skirtGarment(0x8b6fd6, { hem: 0.01, flare: 0.06, map: patternTexture('stars', '#8b6fd6', '#ffe28a', '#ffffff'), mapRepeat: 2 }));
    o.skirt.add(ring(0.06, 0.16, 0.014, 0.013, 0xffe28a));
    for (const s of [o.armL, o.armR]) s.add(sleeve(0x8b6fd6, { len: 0.26, r0: 0.06, r1: 0.052, cuff: 0xffe28a, map: patternTexture('stars', '#8b6fd6', '#ffe28a', '#ffffff') }));
    const hat = new THREE.Group(); o.head.add(hat);
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.255, 0.255, 0.013, 30), std(0x6c55b8, { roughness: 0.85 }));
    brim.position.set(0, 0.115, 0); brim.rotation.x = -0.08; hat.add(brim);
    const coneGeo = new THREE.ConeGeometry(0.145, 0.34, 26, 6); const p = coneGeo.attributes.position;
    for (let i = 0; i < p.count; i++) { const t = (p.getY(i) + 0.17) / 0.34; p.setZ(i, p.getZ(i) - t * t * 0.11); }
    coneGeo.computeVertexNormals();
    const cone = new THREE.Mesh(coneGeo, std(0x7b62c9, { roughness: 0.85, map: patternTexture('stars', '#7b62c9', '#ffe28a', '#ffffff') }));
    cone.position.set(0, 0.28, -0.02); cone.rotation.x = -0.08; hat.add(cone);
    hat.add(ring(0.14, 0.142, 0, 0.014, 0xffe28a));
    const wand = new THREE.Group(); o.handR.add(wand);
    wand.add(cyl(0.006, 0.009, 0.2, 0x7a4f35, [0, 0.05, 0.03], [0.35, 0, 0], {}, 10));
    const shape = new THREE.Shape(); for (let i = 0; i < 10; i++) { const a = i * Math.PI / 5 + Math.PI / 2, r = i % 2 ? 0.014 : 0.034; shape[i ? 'lineTo' : 'moveTo'](Math.cos(a) * r, Math.sin(a) * r); }
    const st = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: 0.011, bevelEnabled: true, bevelSize: 0.003, bevelThickness: 0.003, bevelSegments: 2 }), std(0xffd85c, { emissive: 0xffc23a, emissiveIntensity: 0.9 }));
    st.position.set(0, 0.16, 0.065); wand.add(st);
  },
  // ---------- 赛车手 ----------
  racer(o) {
    const stripes = patternTexture('stripes', '#ff8a3d', '#ffffff', '#1f2430');
    o.torso.add(chestGarment(0xff8a3d, { map: stripes, roughness: 0.6 }));
    o.torso.add(ring(0.25, 0.09, 0.006, 0.016, 0x1f2430));
    o.torso.add(box(0.06, 0.03, 0.008, 0xffffff, [0.055, 0.17, 0.088], [0, 0.3, 0]));
    for (const s of [o.armL, o.armR]) s.add(sleeve(0xff8a3d, { len: 0.23, r0: 0.052, r1: 0.044, cuff: 0x1f2430, map: stripes }));
    o.legL.add(trousers(0xff8a3d, { map: stripes, cuff: 0x1f2430 })); o.legR.add(trousers(0xff8a3d, { map: stripes, cuff: 0x1f2430 }));
    const cap = new THREE.Group(); o.head.add(cap);
    cap.add(ball(0.175, 0xff8a3d, [0, 0.12, -0.005], [1.0, 0.6, 1.03], { roughness: 0.7 }));
    const visor = new THREE.Mesh(new THREE.CylinderGeometry(0.128, 0.128, 0.011, 20, 1, false, -Math.PI / 2, Math.PI), std(0xffffff));
    visor.position.set(0, 0.115, 0.115); visor.rotation.x = 0.18; visor.scale.z = 0.85; cap.add(visor);
    const helm = new THREE.Group(); o.handL.add(helm);
    helm.add(ball(0.085, 0xffffff, [0, 0, 0], [1, 1, 1], { roughness: 0.25 }));
    helm.add(ball(0.086, 0xff8a3d, [0, 0, 0], [1.01, 0.4, 1.01], { roughness: 0.3 }));
    const vis = new THREE.Mesh(new THREE.SphereGeometry(0.087, 16, 8, -0.9, 1.8, 1.1, 0.7), std(0x223047, { roughness: 0.1, metalness: 0.4 }));
    vis.rotation.y = Math.PI / 2; helm.add(vis);
    helm.position.set(0.05, 0.03, 0.02);
  },
  // ---------- AI 规划师 ----------
  planner(o) {
    o.torso.add(chestGarment(0xefe3c8, { open: 0.55 }));
    o.torso.add(chestGarment(0x5c7cfa, { scale: 0.97, yTop: 0.6 }));
    for (const s of [-1, 1]) o.torso.add(box(0.026, 0.17, 0.01, 0x2fbfa6, [s * 0.04, 0.18, 0.09], [0.1, 0, s * -0.25]));
    for (const s of [o.armL, o.armR]) s.add(sleeve(0xefe3c8, { len: 0.23, r0: 0.052, r1: 0.044, cuff: 0x5c7cfa }));
    o.legL.add(trousers(0x3e4a66)); o.legR.add(trousers(0x3e4a66));
    o.head.add(ball(0.014, 0x2fbfa6, [0.163, -0.02, 0.03], [1, 1, 1], { emissive: 0x2fbfa6, emissiveIntensity: 0.8 }));
    const holo = new THREE.Group(); holo.name = 'holo'; o.torso.add(holo);
    const holoMat = new THREE.MeshBasicMaterial({ color: 0xaaf6ff, transparent: true, opacity: 0.85, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending, map: patternTexture('circuit', '#0b2a44', '#bdfcff') });
    for (let i = 0; i < 3; i++) { const pl = new THREE.Mesh(new THREE.PlaneGeometry(0.1, 0.07), holoMat); const a = i / 3 * Math.PI * 2; pl.position.set(Math.cos(a) * 0.25, 0.3 + i * 0.065, Math.sin(a) * 0.25); pl.lookAt(0, 0.3 + i * 0.065, 0); holo.add(pl); }
    const t = new THREE.Group(); o.handR.add(t);
    t.add(box(0.09, 0.12, 0.007, 0xf4f6fb, [0, 0.03, 0.05], [0.3, 0, 0], { roughness: 0.4 }));
    t.add(box(0.078, 0.1, 0.002, 0x7ff0ff, [0, 0.03, 0.056], [0.3, 0, 0], { emissive: 0x3fc0d0, emissiveIntensity: 0.7 }));
  },
  // ---------- 日常 ----------
  daily(o) {
    o.torso.add(chestGarment(0xf0ece2, { map: patternTexture('knit', '#f0ece2', '#cfc7b6') }));

    o.legL.add(trousers(0x2f3a4a, { cuff: 0x27303d })); o.legR.add(trousers(0x2f3a4a, { cuff: 0x27303d }));
    for (const s of [o.armL, o.armR]) s.add(sleeve(0xf0ece2, { len: 0.23, r0: 0.052, r1: 0.05, cuff: 0xdfd8ca, map: patternTexture('knit', '#f0ece2', '#cfc7b6') }));
  },
};
export const OUTFITS = Object.fromEntries(Object.entries(BUILDERS).map(([id, build]) => [id, o => {
  build(o);
  for (const slot of ['torso', 'back']) for (const child of o[slot].children) {
    // Garments already use model-space coordinates. Small accessories retained their old chest pivot.
    if (child.geometry?.isBufferGeometry && child.geometry.type === 'BufferGeometry') continue;
    if (child.name === 'holo') continue;
    if (child.position.y < 0.29) child.position.y += BODY.hipY;
  }
  // Seat headwear on the hair volume; the ear-level accessories keep their own pivot.
  if (['emperor', 'scholar', 'director', 'designer', 'curator', 'wizard', 'racer'].includes(id))
    o.head.position.y = ['emperor', 'scholar'].includes(id) ? 0.065 : 0.035;
}]));
