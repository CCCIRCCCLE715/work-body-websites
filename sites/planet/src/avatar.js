import * as THREE from 'three';
import { R, LAKE_LEVEL, heightAt, lakeCoords, SITES } from './planet-surface.js';

// The avatar is a code-built 3-head-tall chibi rig. Only the head comes from the scanned GLB
// (see avatar-head.js); shoulders, arms, hands, torso, hips and legs are built here, jointed, so the
// character can walk — and every outfit is assembled from parts that ride on those joints.
export const AVATAR_SCALE = 1.02;

// ---------- body proportions (model units; total height 0.98, head from 0.612 to 0.98) ----------
export const BODY = {
  hipY: 0.30, chestY: 0.30, shoulderY: 0.555, neckY: 0.60, headY: 0.80,
  shoulderX: 0.12, armUpper: 0.135, armFore: 0.115,
  hipX: 0.062, thigh: 0.152, shin: 0.126, footY: 0.022,
};
const SKIN = 0xf3cdb6, SKIN_D = 0xe7b49c;

// ---------- small helpers ----------
export const std = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.78, metalness: 0, ...o });
export function patternTexture(kind, base, accent, accent2 = '#ffffff') {
  const c = document.createElement('canvas'); c.width = 512; c.height = 256; const g = c.getContext('2d');
  g.fillStyle = base; g.fillRect(0, 0, 512, 256);
  let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const star = (x, y, r) => { g.beginPath(); for (let i = 0; i < 10; i++) { const a = i * Math.PI / 5 - Math.PI / 2, rr = i % 2 ? r * 0.45 : r; g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } g.closePath(); g.fill(); };
  if (kind === 'cloud') {
    g.strokeStyle = accent; g.lineWidth = 5; g.lineCap = 'round';
    for (let i = 0; i < 14; i++) { const x = (i % 7) * 76 + (i > 6 ? 38 : 0), y = i > 6 ? 170 : 70;
      g.beginPath(); g.arc(x, y, 16, Math.PI, Math.PI * 2.6); g.stroke(); g.beginPath(); g.arc(x + 26, y + 4, 11, Math.PI * 1.1, Math.PI * 2.7); g.stroke(); }
    g.fillStyle = accent2; for (let x = 0; x < 512; x += 16) g.fillRect(x, 236, 9, 20);
  } else if (kind === 'stars') {
    for (let i = 0; i < 70; i++) { g.fillStyle = rnd() < 0.7 ? accent : accent2; star(rnd() * 512, rnd() * 256, 3 + rnd() * 7); }
  } else if (kind === 'stripes') {
    g.fillStyle = accent; g.fillRect(0, 0, 512, 22); g.fillRect(236, 0, 18, 256); g.fillRect(0, 120, 512, 10);
    g.fillStyle = accent2; g.fillRect(256, 0, 8, 256);
  } else if (kind === 'splash') {
    for (let i = 0; i < 40; i++) { g.fillStyle = ['#ff6b6b', '#ffd166', '#4dabf7', '#8ce99a', '#b197fc'][i % 5]; g.beginPath(); g.ellipse(rnd() * 512, rnd() * 256, 4 + rnd() * 9, 3 + rnd() * 6, rnd() * 3, 0, 7); g.fill(); }
  } else if (kind === 'circuit') {
    g.strokeStyle = accent; g.lineWidth = 3;
    for (let i = 0; i < 26; i++) { let x = rnd() * 512, y = rnd() * 256; g.beginPath(); g.moveTo(x, y); x += 30 + rnd() * 40; g.lineTo(x, y); y += (rnd() - 0.5) * 60; g.lineTo(x + 20, y); g.stroke(); g.fillStyle = accent; g.beginPath(); g.arc(x + 20, y, 4, 0, 7); g.fill(); }
  } else if (kind === 'weave') {
    g.globalAlpha = 0.18; g.fillStyle = accent; for (let y = 0; y < 256; y += 6) g.fillRect(0, y, 512, 2); for (let x = 0; x < 512; x += 6) g.fillRect(x, 0, 2, 256); g.globalAlpha = 1;
  } else if (kind === 'bamboo') {
    g.strokeStyle = accent; g.lineWidth = 3;
    for (let i = 0; i < 8; i++) { const x = 30 + i * 64; g.beginPath(); g.moveTo(x, 256); g.quadraticCurveTo(x + 10, 150, x - 6, 60); g.stroke();
      g.fillStyle = accent; for (let k = 0; k < 3; k++) { g.beginPath(); g.ellipse(x + 8, 200 - k * 50, 14, 4, -0.6, 0, 7); g.fill(); } }
    g.fillStyle = accent2; g.fillRect(0, 236, 512, 20);
  } else if (kind === 'knit') {
    g.strokeStyle = accent; g.lineWidth = 3; g.globalAlpha = 0.5;
    for (let y = 4; y < 256; y += 12) for (let x = 0; x < 512; x += 12) { g.beginPath(); g.moveTo(x, y); g.lineTo(x + 6, y + 6); g.lineTo(x + 12, y); g.stroke(); }
    g.globalAlpha = 1;
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8;
  return t;
}

const cyl = (r0, r1, h, color, pos, rot = [0, 0, 0], o = {}, seg = 16) => {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r1, r0, h, seg), color.isMaterial ? color : std(color, o));
  m.position.set(...pos); m.rotation.set(...rot); return m;
};
const ball = (r, color, pos, scale = [1, 1, 1], o = {}) => {
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, 18, 12), color.isMaterial ? color : std(color, o));
  m.position.set(...pos); m.scale.set(...scale); return m;
};
const box = (w, h, d, color, pos, rot = [0, 0, 0], o = {}) => {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), color.isMaterial ? color : std(color, o));
  m.position.set(...pos); m.rotation.set(...rot); return m;
};
const torus = (r, tube, color, pos, rot = [0, 0, 0], o = {}) => {
  const m = new THREE.Mesh(new THREE.TorusGeometry(r, tube, 8, 24), color.isMaterial ? color : std(color, o));
  m.position.set(...pos); m.rotation.set(...rot); return m;
};

// ---------- garment pieces that ride the rig ----------
// chest: a lathe body from shoulders to waist; skirt: hips down; sleeve: follows an arm bone
const CHEST_PROFILE = [[0.30, 0.108, 0.076, 0.012], [0.34, 0.112, 0.079, 0.014], [0.38, 0.114, 0.081, 0.016], [0.42, 0.113, 0.080, 0.017],
  [0.46, 0.110, 0.077, 0.016], [0.50, 0.104, 0.072, 0.014], [0.545, 0.094, 0.065, 0.010], [0.585, 0.070, 0.052, 0.006], [0.605, 0.044, 0.038, 0.004]];
export function chestGarment(color, { map = null, mapRepeat = 1, scale = 1, roughness = 0.82, open = 0, yTop = 0.605 } = {}) {
  const rows = CHEST_PROFILE.filter(r => r[0] <= yTop + 1e-6);
  const seg = 34, pos = [], uv = [], idx = [];
  rows.forEach(([y, rx, rz, cz], j) => {
    for (let i = 0; i <= seg; i++) {
      const a = open / 2 + (Math.PI * 2 - open) * i / seg;
      pos.push(Math.sin(a) * rx * scale, y, cz + Math.cos(a) * rz * scale);
      uv.push(i / seg * mapRepeat, (y - 0.30) / 0.31);
    }
  });
  for (let j = 0; j < rows.length - 1; j++) for (let i = 0; i < seg; i++) {
    const a = j * (seg + 1) + i, b = a + 1, c = a + seg + 1, d = c + 1; idx.push(a, c, b, b, c, d);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx); g.computeVertexNormals();
  const m = new THREE.Mesh(g, std(color, { map, roughness, side: THREE.DoubleSide }));
  m.userData.garment = true;
  return m;
}
export function skirtGarment(color, { hem = 0.055, flare = 0.045, map = null, mapRepeat = 1, back = false, front = false, open = 0, roughness = 0.85 } = {}) {
  const rows = [[0.315, 0.112, 0.079], [0.30, 0.115, 0.081]];
  const steps = Math.max(2, Math.round((0.30 - hem) / 0.03));
  for (let i = 1; i <= steps; i++) { const t = i / steps; rows.push([0.30 - (0.30 - hem) * t, 0.115 + flare * t, 0.081 + (flare + 0.012) * t]); }
  const seg = 34, pos = [], uv = [], idx = [];
  const span = Math.PI * 2 - open;
  const a0 = back ? Math.PI * 0.6 : front ? -span / 2 : open / 2, a1 = back ? Math.PI * 1.4 : front ? span / 2 : span + open / 2;
  rows.forEach(([y, rx, rz], j) => {
    for (let i = 0; i <= seg; i++) {
      const a = a0 + (a1 - a0) * i / seg;
      pos.push(Math.sin(a) * rx, y, 0.014 + Math.cos(a) * rz);
      uv.push(i / seg * mapRepeat, (0.30 - y) / (0.30 - hem + 1e-4));
    }
  });
  for (let j = 0; j < rows.length - 1; j++) for (let i = 0; i < seg; i++) {
    const a = j * (seg + 1) + i, b = a + 1, c = a + seg + 1, d = c + 1; idx.push(a, c, b, b, c, d);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx); g.computeVertexNormals();
  return new THREE.Mesh(g, std(color, { map, roughness, side: THREE.DoubleSide }));
}
/** A sleeve + cuff that follows its arm bone (parented to the upper-arm group). */
export function sleeve(color, { len = BODY.armUpper + BODY.armFore + 0.02, r0 = 0.05, r1 = 0.038, cuff = null, map = null } = {}) {
  const g = new THREE.Group();
  const upperLen = Math.min(len, BODY.armUpper);
  const geo = new THREE.CylinderGeometry(r0, r0 * 0.94, upperLen, 18, 1); geo.translate(0, -upperLen / 2, 0);
  const m = new THREE.Mesh(geo, std(color, { map, side: THREE.DoubleSide, roughness: 0.84 })); g.add(m);
  g.add(ball(r0 * 0.98, color, [0, -0.005, 0], [1, 0.7, 1]));
  const lower = new THREE.Group(), lowerLen = Math.max(0.035, len - upperLen);
  lower.add(cyl(r1, r0 * 0.94, lowerLen, std(color, { map }), [0, -lowerLen / 2, 0]));
  lower.add(ball(r0 * 0.94, std(color, { map }), [0, 0, 0], [1, 0.85, 1]));
  if (cuff) lower.add(cyl(r1 * 1.08, r1 * 1.08, 0.026, cuff, [0, -lowerLen + 0.012, 0]));
  g.userData.lower = lower;
  return g;
}
/** Trouser leg for one side; parented to that leg's hip joint so it swings with the walk. */
export function trousers(color, { map = null, len = BODY.thigh + BODY.shin, r0 = 0.058, r1 = 0.052, cuff = null } = {}) {
  const g = new THREE.Group();
  const geo = new THREE.CylinderGeometry(r0, r1, BODY.thigh, 18, 1); geo.translate(0, -BODY.thigh / 2, 0);
  g.add(new THREE.Mesh(geo, std(color, { map, side: THREE.DoubleSide, roughness: 0.86 })));
  const lower = new THREE.Group(), lowerLen = len - BODY.thigh;
  lower.add(cyl(r1 * 0.94, r1, lowerLen, std(color, { map }), [0, -lowerLen / 2, 0]));
  lower.add(ball(r1, std(color, { map }), [0, 0, 0], [1, 0.95, 1]));
  if (cuff) lower.add(cyl(r1, r1, 0.024, cuff, [0, -lowerLen + 0.012, 0]));
  g.userData.lower = lower;
  return g;
}

// ---------- the rig ----------
export function buildRig(renderer) {
  const root = new THREE.Group(); root.name = 'avatarBody';
  const hips = new THREE.Group(); hips.position.y = BODY.hipY; root.add(hips);
  const torso = new THREE.Group(); hips.add(torso);
  const headMount = new THREE.Group(); headMount.position.y = BODY.headY - BODY.hipY; torso.add(headMount);

  const skin = std(SKIN, { roughness: 0.62 });
  // pelvis + chest volumes so gaps never show under the clothes
  const pelvis = new THREE.Mesh(new THREE.SphereGeometry(0.1, 18, 12), std(0xe8e2d4, { roughness: 0.85 }));
  pelvis.visible = false; pelvis.scale.set(1, 0.7, 0.78); pelvis.position.y = 0.02; hips.add(pelvis);
  const chest = new THREE.Mesh(new THREE.CapsuleGeometry(0.088, 0.16, 6, 16), std(0xf2eee4, { roughness: 0.85 }));
  chest.visible = false; chest.position.y = 0.155; chest.scale.set(1, 1, 0.82); torso.add(chest);
  // neck
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.047, 0.055, 0.10, 18), skin); neck.position.y = 0.31; torso.add(neck);

  const mkArm = (side) => {
    const shoulder = new THREE.Group();
    shoulder.position.set(side * BODY.shoulderX, BODY.shoulderY - BODY.hipY, 0.004);
    torso.add(shoulder);
    const upper = new THREE.Mesh(new THREE.CapsuleGeometry(0.037, BODY.armUpper - 0.02, 4, 12), skin);
    upper.position.y = -BODY.armUpper / 2; shoulder.add(upper);
    const elbow = new THREE.Group(); elbow.position.y = -BODY.armUpper; shoulder.add(elbow);
    const fore = new THREE.Mesh(new THREE.CapsuleGeometry(0.033, BODY.armFore - 0.02, 4, 12), skin);
    fore.position.y = -BODY.armFore / 2; elbow.add(fore);
    const wrist = new THREE.Group(); wrist.position.y = -BODY.armFore; elbow.add(wrist);
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.036, 14, 10), skin);
    hand.scale.set(0.95, 1.1, 0.9); wrist.add(hand);
    const thumb = new THREE.Mesh(new THREE.CapsuleGeometry(0.012, 0.02, 3, 8), skin);
    thumb.position.set(side * -0.026, 0.005, 0.014); thumb.rotation.z = side * 0.5; wrist.add(thumb);
    return { shoulder, elbow, wrist, upper, fore, hand };
  };
  const armL = mkArm(1), armR = mkArm(-1);

  const mkLeg = (side) => {
    const hip = new THREE.Group(); hip.position.set(side * BODY.hipX, 0.005, 0.008); hips.add(hip);
    const thigh = new THREE.Mesh(new THREE.CapsuleGeometry(0.05, BODY.thigh - 0.03, 4, 12), skin);
    thigh.position.y = -BODY.thigh / 2; hip.add(thigh);
    const knee = new THREE.Group(); knee.position.y = -BODY.thigh; hip.add(knee);
    const shin = new THREE.Mesh(new THREE.CapsuleGeometry(0.044, BODY.shin - 0.03, 4, 12), skin);
    shin.position.y = -BODY.shin / 2; knee.add(shin);
    const ankle = new THREE.Group(); ankle.position.y = -BODY.shin; knee.add(ankle);
    const foot = new THREE.Mesh(new THREE.SphereGeometry(0.048, 14, 10), std(0xf6f4ee, { roughness: 0.7 }));
    foot.scale.set(0.85, 0.62, 1.25); foot.position.set(0, BODY.footY - 0.01, 0.018); ankle.add(foot);
    const sole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.012, 14), std(0xd9d3c6, { roughness: 0.9 }));
    sole.position.set(0, BODY.footY - 0.032, 0.018); ankle.add(sole);
    return { hip, knee, ankle, thigh, shin, foot, sole };
  };
  const legL = mkLeg(1), legR = mkLeg(-1);

  const bodyMeshes = [pelvis, chest, neck, armL.upper, armL.fore, armL.hand, armR.upper, armR.fore, armR.hand,
    legL.thigh, legL.shin, legL.foot, legL.sole, legR.thigh, legR.shin, legR.foot, legR.sole];
  // the bare body is the "default" look; outfits hide most of it
  const legs = { thigh: [legL.thigh, legR.thigh], shin: [legL.shin, legR.shin], foot: [legL.foot, legR.foot, legL.sole, legR.sole] };
  const skinParts = [neck, armL.upper, armL.fore, armL.hand, armR.upper, armR.fore, armR.hand, legL.thigh, legL.shin, legR.thigh, legR.shin];
  function setLegVisible(on) { for (const m of [...legs.thigh, ...legs.shin]) m.visible = on; }

  // outfit slots sit on the joints; the torso and skirt anchors are shifted so that garment builders
  // can work in plain model-space Y (0 = ground) while still riding the rig.
  // head accessories are authored in plain model Y (0 = ground); shift them onto the head node
  const outfit = { torso: new THREE.Group(), skirt: new THREE.Group(), armL: new THREE.Group(), armR: new THREE.Group(), legL: new THREE.Group(), legR: new THREE.Group(), head: new THREE.Group(), handL: new THREE.Group(), handR: new THREE.Group(), back: new THREE.Group() };
  for (const k of ['foreL', 'foreR', 'shinL', 'shinR']) outfit[k] = new THREE.Group();
  outfit.head.position.y = 0;
  outfit.torso.position.y = -BODY.hipY; outfit.back.position.y = -BODY.hipY; outfit.skirt.position.y = -BODY.hipY;
  torso.add(outfit.torso, outfit.back);
  hips.add(outfit.skirt);
  armL.shoulder.add(outfit.armL); armR.shoulder.add(outfit.armR);
  legL.hip.add(outfit.legL); legR.hip.add(outfit.legR);
  legL.knee.add(outfit.shinL); legR.knee.add(outfit.shinR);
  armL.elbow.add(outfit.foreL); armR.elbow.add(outfit.foreR);
  headMount.add(outfit.head);
  armL.wrist.add(outfit.handL); armR.wrist.add(outfit.handR);

  root.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return {
    root, hips, torso, headMount, armL, armR, legL, legR, outfit, bodyMeshes, skinParts, setLegVisible,
    setHead(node) {
      while (headMount.children.length) headMount.remove(headMount.children[0]);
      // the scan node is recentred on its own pivot (HEAD_CENTER_Y); mount it so the eyes land on headY
      // Preserve the extracted head's recentering transform.
      // Its geometry is authored at scan height, not at the local origin.
      headMount.add(node); headMount.add(outfit.head);
    },
  };
}


export function buildOutfitParts(rig, builder) {
  const parts = { longRobe: false };
  for (const k of Object.keys(rig.outfit)) parts[k] = new THREE.Group();
  builder(parts);
  for (const side of ['L', 'R']) {
    for (const [upper, lower] of [['arm', 'fore'], ['leg', 'shin']]) {
      for (const item of parts[upper + side].children) {
        if (item.userData.lower) parts[lower + side].add(item.userData.lower);
      }
    }
  }
  for (const k of Object.keys(rig.outfit)) parts[k].traverse(o => {
    if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; }
  });
  return parts;
}

// ---------- walk / idle animation ----------
export function animateRig(rig, { walking, t, speed = 1, boat = 0, lean = 0 }) {
  const p = t * 8.2 * speed;
  const sw = walking ? 1 : 0;
  const breathe = Math.sin(t * 1.9) * (1 - sw);
  // legs
  rig.legL.hip.rotation.x = Math.sin(p) * 0.62 * sw;
  rig.legR.hip.rotation.x = Math.sin(p + Math.PI) * 0.62 * sw;
  rig.legL.knee.rotation.x = Math.max(0, -Math.sin(p)) * 0.95 * sw;
  rig.legR.knee.rotation.x = Math.max(0, -Math.sin(p + Math.PI)) * 0.95 * sw;
  rig.legL.ankle.rotation.x = -rig.legL.hip.rotation.x * 0.35;
  rig.legR.ankle.rotation.x = -rig.legR.hip.rotation.x * 0.35;
  // arms swing opposite the legs, hanging naturally when idle
  rig.armL.shoulder.rotation.x = Math.sin(p + Math.PI) * 0.5 * sw + (1 - sw) * (0.03 + breathe * 0.02);
  rig.armR.shoulder.rotation.x = Math.sin(p) * 0.5 * sw + (1 - sw) * (0.03 + breathe * 0.02);
  rig.armL.shoulder.rotation.z = 0.14 + sw * 0.05;
  rig.armR.shoulder.rotation.z = -0.14 - sw * 0.05;
  rig.armL.elbow.rotation.x = -(0.25 + Math.max(0, Math.sin(p + Math.PI)) * 0.35) * sw - (1 - sw) * 0.16;
  rig.armR.elbow.rotation.x = -(0.25 + Math.max(0, Math.sin(p)) * 0.35) * sw - (1 - sw) * 0.16;
  // body bob, weight shift and a small forward lean while walking
  rig.hips.position.y = BODY.hipY + (sw ? Math.abs(Math.sin(p)) * 0.022 - 0.006 : breathe * 0.004);
  rig.hips.rotation.z = sw * Math.sin(p) * 0.05;
  rig.hips.rotation.y = sw * Math.sin(p) * 0.09;
  rig.torso.rotation.x = sw * 0.1 + lean * 0.12;
  rig.torso.rotation.y = -sw * Math.sin(p) * 0.12;
  rig.headMount.rotation.y = sw * Math.sin(p) * 0.06;
  rig.headMount.rotation.x = -rig.torso.rotation.x * 0.8;
  // sitting in the boat keeps the legs together
  if (boat > 0.5) {
    rig.legL.hip.rotation.x = 0.55; rig.legR.hip.rotation.x = 0.55;
    rig.legL.knee.rotation.x = 0.6; rig.legR.knee.rotation.x = 0.6;
  }
}
// ---------- avatar: planet placement, boat, sparkles, outfit application ----------
export async function createAvatar(planet, headNode, renderer) {
  const { OUTFITS } = await import('./outfits.js');
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const rig = buildRig(renderer);
  const root = new THREE.Group(); root.name = 'avatar';
  const bob = new THREE.Group(); root.add(bob);
  const scaled = new THREE.Group(); scaled.scale.setScalar(AVATAR_SCALE); bob.add(scaled);
  scaled.add(rig.root);
  rig.setHead(headNode);

  // boat for sea crossings
  const boat = new THREE.Group();
  const hullGeo = new THREE.SphereGeometry(0.5, 22, 10, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2); hullGeo.scale(0.72, 0.4, 1.2);
  boat.add(new THREE.Mesh(hullGeo, std(0xf2a65a, { side: THREE.DoubleSide })));
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.038, 8, 28), std(0xffffff)); rim.rotation.x = Math.PI / 2; rim.scale.set(0.72, 1.2, 1); boat.add(rim);
  boat.add(cyl(0.018, 0.018, 0.9, 0x8a5a3c, [0, 0.4, -0.22]));
  const sailGeo = new THREE.BufferGeometry();
  sailGeo.setAttribute('position', new THREE.Float32BufferAttribute([0, 0.86, -0.22, 0, 0.18, -0.22, 0, 0.22, 0.28], 3)); sailGeo.computeVertexNormals();
  boat.add(new THREE.Mesh(sailGeo, std(0xfff7e8, { side: THREE.DoubleSide })));
  boat.traverse(o => { if (o.isMesh) o.castShadow = true; });
  boat.scale.setScalar(0.0001); boat.visible = false; root.add(boat);

  // sparkle burst on outfit change
  const N = 80; const sp = new Float32Array(N * 3), sv = [];
  const sGeo = new THREE.BufferGeometry(); sGeo.setAttribute('position', new THREE.BufferAttribute(sp, 3));
  const sMat = new THREE.PointsMaterial({ color: 0xfff1a8, size: 0.075, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
  const sparkles = new THREE.Points(sGeo, sMat); sparkles.frustumCulled = false; root.add(sparkles);
  let sparkleT = 1;

  planet.add(root);
  const state = {
    dir: SITES[0].stand.clone(), heading: SITES[0].frame.f.clone(), siteIndex: 0,
    path: null, pathPos: 0, speed: 2.2, walking: false, onArrive: null, target: 0,
    outfit: 'daily', pop: 0, boatK: 0, time: 0,
  };
  const outfitCache = new Map();
  function applyOutfit(id) {
    for (const k of Object.keys(rig.outfit)) rig.outfit[k].clear();
    state.outfit = id;
    let built = outfitCache.get(id);
    if (!built && OUTFITS[id]) {
      const parts = buildOutfitParts(rig, OUTFITS[id]);
      outfitCache.set(id, parts); built = parts;
    }
    if (built) for (const k of Object.keys(rig.outfit)) rig.outfit[k].add(built[k]);
    rig.setLegVisible(!(built && built.longRobe));
    sv.length = 0;
    for (let i = 0; i < N; i++) { const a = Math.random() * Math.PI * 2, y = Math.random() * 1.2; sp.set([Math.cos(a) * 0.28, y * 0.8, Math.sin(a) * 0.28], i * 3); sv.push([Math.cos(a) * (0.5 + Math.random()), 0.4 + Math.random() * 0.9, Math.sin(a) * (0.5 + Math.random())]); }
    sGeo.attributes.position.needsUpdate = true; sparkleT = reduceMotion ? 1 : 0; state.pop = reduceMotion ? 0 : 1;
  }
  applyOutfit('daily');

  function arrive() {
    state.walking = false; state.siteIndex = state.target;
    const s = SITES[state.target];
    if (s) {
      const toSite = s.n.clone().addScaledVector(state.dir, -s.n.dot(state.dir)).normalize();
      const out = s.frame.f.clone().addScaledVector(state.dir, -s.frame.f.dot(state.dir)).normalize();
      state.heading.copy(out).lerp(toSite, 0.3).normalize();
    }
    const cb = state.onArrive; state.onArrive = null; if (cb) cb();
  }
  function walkTo(path, siteIndex, onArrive, instant = false) {
    state.path = path; state.pathPos = 0; state.walking = !instant && path && path.length > 1;
    state.target = siteIndex; state.onArrive = onArrive;
    if (!state.walking) { if (path) state.dir.copy(path[path.length - 1]).normalize(); arrive(); }
  }
  function groundInfo(d) {
    const h = heightAt(d);
    const lk = lakeCoords(d);
    if (lk.u < 1.0 && h < LAKE_LEVEL) return { h: LAKE_LEVEL, water: true };
    if (h < -0.015) return { h: 0, water: true };
    return { h, water: false };
  }
  const up = new THREE.Vector3(), tmp = new THREE.Vector3(), m4 = new THREE.Matrix4(), right = new THREE.Vector3();
  function update(dt, time) {
    state.time = time;
    if (state.walking) {
      let remaining = state.speed * dt / R;
      while (remaining > 0 && state.walking) {
        const i = Math.floor(state.pathPos), next = state.path[i + 1];
        if (!next) { arrive(); break; }
        const a = state.dir.angleTo(next);
        if (a <= remaining) { state.dir.copy(next); state.pathPos = i + 1; remaining -= a; if (state.pathPos >= state.path.length - 1) arrive(); }
        else {
          tmp.copy(next).addScaledVector(state.dir, -next.dot(state.dir)).normalize();
          state.heading.lerp(tmp, Math.min(1, dt * 10)).normalize();
          state.dir.applyAxisAngle(tmp.clone().cross(state.dir).negate().normalize(), remaining).normalize();
          remaining = 0;
        }
      }
    }
    const g = groundInfo(state.dir);
    state.boatK += ((g.water ? 1 : 0) - state.boatK) * Math.min(1, dt * 5);
    up.copy(state.dir);
    state.heading.addScaledVector(up, -state.heading.dot(up)).normalize();
    right.crossVectors(up, state.heading).normalize();
    m4.makeBasis(right, up, state.heading);
    root.quaternion.setFromRotationMatrix(m4);
    const waterBob = g.water ? Math.sin(time * 2.2) * 0.025 : 0;
    root.position.copy(up).multiplyScalar(R + g.h + state.boatK * 0.13 + waterBob);
    boat.visible = state.boatK > 0.02; boat.scale.setScalar(Math.max(0.0001, state.boatK * 0.7));
    boat.position.y = -0.1; boat.rotation.z = Math.sin(time * 1.7) * 0.05;
    // the rig animates itself: legs and arms swing while walking, breathing while idle
    animateRig(rig, { walking: state.walking && state.boatK < 0.5, t: time, speed: 1, boat: state.boatK });
    // outfit-change pop
    state.pop = Math.max(0, state.pop - dt * 2.2);
    const popS = 1 + Math.sin(state.pop * Math.PI) * 0.1;
    scaled.scale.setScalar(AVATAR_SCALE * popS);
    scaled.rotation.y = state.pop > 0 ? (1 - state.pop) * Math.PI * 2 : 0;
    const holo = rig.outfit.torso.getObjectByName('holo'); if (holo) holo.rotation.y = time * 0.6;
    if (sparkleT < 1) {
      sparkleT += dt / 1.3;
      for (let i = 0; i < N; i++) { sp[i * 3] += sv[i][0] * dt; sp[i * 3 + 1] += sv[i][1] * dt; sp[i * 3 + 2] += sv[i][2] * dt; sv[i][1] -= dt * 0.9; }
      sGeo.attributes.position.needsUpdate = true; sMat.opacity = Math.max(0, 1 - sparkleT);
    } else sMat.opacity = 0;
  }
  const prewarm = async (r, camera, scene) => {
    for (const id of Object.keys(OUTFITS)) {
      if (outfitCache.has(id)) continue;
      outfitCache.set(id, buildOutfitParts(rig, OUTFITS[id]));
    }
    const holder = new THREE.Group();
    for (const parts of outfitCache.values()) for (const k of Object.keys(rig.outfit)) holder.add(parts[k].clone());
    holder.traverse(o => { o.frustumCulled = false; });
    scaled.add(holder);
    await r.compileAsync(holder, camera, scene);
    scene.updateMatrixWorld();
    r.render(scene, camera); // loading-screen render uploads outfit geometry and textures too
    scaled.remove(holder);
  };
  return { root, state, rig, prewarm, setOutfit: applyOutfit, walkTo, update, placeAt: d => state.dir.copy(d).normalize(), localPosition: () => root.position.clone(), headDir: () => state.dir.clone() };
}