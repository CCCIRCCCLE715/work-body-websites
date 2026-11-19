import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { R, SITES, SITE_LEVEL, LAKE, SEA_LINE, tangentFrame, stats, heightAt } from './planet-surface.js';
import { LANDMARKS } from './data.js';
import { WORKS } from './portfolio.js';
import { createTerrain } from './terrain.js';
import { createWater } from './water.js';
import { createVegetation } from './vegetation.js';
import { createSky, createClouds } from './atmosphere.js';
import { createLandmarks, siteQuaternion } from './landmarks.js';
import { BUILDERS } from './landmark-builders.js';
import { extractHead } from './avatar-head.js';
import { createAvatar } from './avatar.js';
import { createNavigator, walkable } from './navigation.js';
import { createWorkVisit } from './work-visit.js';

const $ = id => document.getElementById(id);
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const MODEL_BASE = '/models/tripo/';

// ---------- renderer ----------
const canvas = $('planet');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
const maxPR = Math.min(window.devicePixelRatio || 1, 1.5);
let pixelRatio = maxPR, nextPixelRatio = maxPR;
renderer.setPixelRatio(pixelRatio);
renderer.setSize(innerWidth, innerHeight, false);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.NeutralToneMapping;
renderer.toneMappingExposure = 1.06;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.shadowMap.autoUpdate = false; // reuse shadows until the scene or its light framing changes

const scene = new THREE.Scene();
scene.matrixWorldAutoUpdate = false; // update once after all animations, rather than twice per frame
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.55;

const camera = new THREE.PerspectiveCamera(36, innerWidth / innerHeight, 0.1, 1200);
const SUN_DIR = new THREE.Vector3(-0.55, 0.66, 0.52).normalize();

const hemi = new THREE.HemisphereLight(0xe4f0ff, 0x9d8cc4, 0.95); scene.add(hemi);
const sun = new THREE.DirectionalLight(0xfff0d8, 2.35);
sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.035; sun.shadow.radius = 3;
scene.add(sun, sun.target);
const rim = new THREE.DirectionalLight(0xc6c2ff, 0.55); rim.position.set(30, -6, -20); scene.add(rim);

const sky = createSky(renderer); scene.add(sky.group); scene.background = sky.background;
const planet = new THREE.Group(); planet.name = 'planet'; scene.add(planet);

// ---------- world ----------
const loadingText = $('loading-text'), loadingBar = $('loading-bar');
const setProgress = (p, text) => { loadingBar.style.width = Math.round(p * 100) + '%'; if (text) loadingText.textContent = text; };
setProgress(0.05, '正在捏出星球的地形');
await new Promise(r => setTimeout(r, 30));

const T = { start: Math.round(performance.now()) }; let t0 = performance.now();
const terrain = createTerrain(92); planet.add(terrain.mesh);
T.terrain = Math.round(performance.now() - t0); t0 = performance.now();
setProgress(0.2, '正在注满海水和小湖');
await new Promise(r => setTimeout(r, 0));
const water = createWater(terrain); planet.add(water.ocean, ...water.lakes);
T.water = Math.round(performance.now() - t0); t0 = performance.now();
setProgress(0.3, '正在种树');
await new Promise(r => setTimeout(r, 0));
const veg = createVegetation(); planet.add(veg.group);
T.veg = Math.round(performance.now() - t0); t0 = performance.now();
const clouds = createClouds(); planet.add(clouds.group);
const landmarks = createLandmarks(planet);

// ---------- models: landmarks are built in code, only the avatar's head comes from the scanned GLB ----------
const manager = new THREE.LoadingManager();
const loader = new GLTFLoader(manager).setMeshoptDecoder(MeshoptDecoder);
const load = url => loader.loadAsync(MODEL_BASE + url + '.glb');
const avatarGltf = await load('avatar_daily');
setProgress(0.88, '正在搭建作品');
const built = await Promise.all(SITES.map(async (s, i) => {
  const mod = await BUILDERS[s.id]();
  const b = mod.build();
  landmarks.setModel(landmarks.entries[i], b.group, b.update ? (t, dt) => b.update(t, dt) : null);
  return b.group;
}));
T.models = Math.round(performance.now() - t0);
const head = extractHead(avatarGltf.scene, renderer);
const avatar = await createAvatar(planet, head, renderer);
const navigation = createNavigator();
const destination = new THREE.Mesh(new THREE.RingGeometry(0.14, 0.20, 40), new THREE.MeshBasicMaterial({ color: 0xffe39a, side: THREE.DoubleSide, depthWrite: false }));
destination.visible = false; planet.add(destination);
setProgress(1, '到了');

// ---------- camera rig: the planet turns, the camera glides between overview and close-ups ----------
const SIDE_ANGLE = Math.PI / 4;
const OVERVIEW_ELEVATION = 0.12;
function fullPlanetDistance() {
  const halfFov = Math.atan(Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * Math.min(1, camera.aspect));
  return Math.max(41, (R + 1.7) / Math.sin(halfFov) * 1.08);
}
let overviewDistance = fullPlanetDistance();
const rig = {
  mode: 'overview', planetQ: new THREE.Quaternion(), targetQ: new THREE.Quaternion(),
  look: new THREE.Vector3(), lookTarget: new THREE.Vector3(),
  dist: overviewDistance, distTarget: overviewDistance, elev: OVERVIEW_ELEVATION, elevTarget: OVERVIEW_ELEVATION, yaw: 0, yawTarget: 0, focusElev: SIDE_ANGLE,
  offset: 0, offsetTarget: 0, autoRotate: false, idle: 0, vel: new THREE.Vector2(),
};
const focus = { entry: null, follow: false };
// Present the home surface at 45 degrees to the camera, with both faces of the buildings visible.
rig.planetQ.copy(overviewQuaternion(SITES[0], rig.distTarget)); rig.targetQ.copy(rig.planetQ);
function overviewQuaternion(site, distance) {
  // Account for the planet radius: the camera looks at the sphere centre, rather than this surface point.
  const surfaceAngle = Math.acos((R + heightAt(site.stand)) / (distance * Math.SQRT2)) - SIDE_ANGLE;
  const tilt = Math.PI / 2 - OVERVIEW_ELEVATION - surfaceAngle;
  return new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), tilt)
    .multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), SIDE_ANGLE))
    .multiply(frameQuaternion(site.stand, site.frame.f));
}
function frameQuaternion(n, f) {
  const fr = tangentFrame(n, f);
  const local = new THREE.Matrix4().makeBasis(fr.r, fr.n, fr.f);
  const q = new THREE.Quaternion().setFromRotationMatrix(local).invert();
  return q; // maps the local (r, n, f) frame onto world (X, Y, Z)
}
// Match the viewing angle to the tangent beneath the character. A sphere's centre-plane
// camera angle can otherwise produce a much steeper view at the near-side standing point.
function surfaceCameraElevation(look, ground, normal, distance, angle) {
  let low = -0.2, high = 1.4;
  const target = Math.sin(angle);
  for (let i = 0; i < 16; i++) {
    const mid = (low + high) / 2;
    const x = look.x - ground.x;
    const y = look.y + distance * Math.sin(mid) - ground.y;
    const z = look.z + distance * Math.cos(mid) - ground.z;
    const sine = (x * normal.x + y * normal.y + z * normal.z) / Math.hypot(x, y, z);
    if (sine < target) low = mid; else high = mid;
  }
  return (low + high) / 2;
}
function updateRig(dt) {
  const k = 1 - Math.exp(-dt * (reduceMotion ? 12 : 3.2));
  if (rig.mode === 'overview') {
    if (rig.autoRotate && rig.idle > 3 && !dragging) rig.targetQ.premultiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), dt * 0.05));
    if (!dragging && rig.vel.lengthSq() > 1e-6) { applyDrag(rig.vel.x * dt * 60, rig.vel.y * dt * 60); rig.vel.multiplyScalar(Math.pow(0.04, dt)); }
    // Raise the viewing centre as we approach, revealing the upper hemisphere from a flatter angle.
    // Zoom changes distance and the existing upper-hemisphere framing; rotation stays under drag control.
    const near = 1 - THREE.MathUtils.smoothstep(rig.distTarget, 16, 38);
    rig.lookTarget.set(0, R * 0.68 * near, 0);
    rig.elevTarget = THREE.MathUtils.lerp(OVERVIEW_ELEVATION, 0.025, near);
  } else {
    let n, f;
    if (focus.follow) { n = avatar.state.dir.clone(); f = avatar.state.heading.clone(); }
    else { n = focus.entry.site.n.clone(); f = focus.entry.site.frame.f.clone(); }
    f.applyAxisAngle(n, rig.yaw);
    rig.targetQ.copy(frameQuaternion(n, f));
    if (focus.follow) rig.lookTarget.set(0, R + SITE_LEVEL + 0.42, 0);
    else {
      // aim between the landmark and the avatar's waiting spot
      const s = focus.entry.site;
      const p = s.n.clone().multiplyScalar(R + SITE_LEVEL + (s.kind === 'building' ? 0.95 : 0.55)).lerp(s.stand.clone().multiplyScalar(R + SITE_LEVEL + 0.5), 0.3);
      rig.lookTarget.copy(p.applyQuaternion(rig.targetQ));
    }
    const surfaceDir = focus.follow ? avatar.state.dir : focus.entry.site.n;
    const surfaceNormal = surfaceDir.clone().applyQuaternion(rig.targetQ);
    const ground = surfaceNormal.clone().multiplyScalar(R + heightAt(surfaceDir));
    rig.elevTarget = surfaceCameraElevation(rig.lookTarget, ground, surfaceNormal, rig.distTarget, rig.focusElev);
  }
  rig.yaw += (rig.yawTarget - rig.yaw) * k;
  rig.planetQ.slerp(rig.targetQ, rig.mode === 'overview' ? Math.min(1, k * 2.5) : k);
  planet.quaternion.copy(rig.planetQ);
  rig.look.lerp(rig.lookTarget, k);
  rig.dist += (rig.distTarget - rig.dist) * k;
  rig.elev += (rig.elevTarget - rig.elev) * k;
  rig.offset += (rig.offsetTarget - rig.offset) * k;
  const v = new THREE.Vector3(0, Math.sin(rig.elev), Math.cos(rig.elev));
  camera.position.copy(rig.look).addScaledVector(v, rig.dist);
  camera.up.set(0, 1, 0);
  camera.lookAt(rig.look);
  // shift the framing to leave room for the side panel
  const w = innerWidth, h = innerHeight;
  camera.setViewOffset(w, h, w <= 700 ? 0 : -rig.offset * w, 0, w, h);
  // shadow frustum follows the point of interest
  const span = rig.mode === 'overview' ? 12.5 : 5;
  const sc = sun.shadow.camera;
  if (sc.right !== span) { sc.left = -span; sc.right = span; sc.top = span; sc.bottom = -span; sc.near = 1; sc.far = 80; sc.updateProjectionMatrix(); }
  sun.target.position.copy(rig.look);
  sun.position.copy(rig.look).addScaledVector(SUN_DIR, 36);
}
function restoreRoof() {
  const roof = landmarks.byId.scholar.model.getObjectByName('roof');
  roof.visible = true;
  $('view-interior').textContent = '查看内部';
  $('view-interior').setAttribute('aria-pressed', 'false');
}
function goOverview() {
  restoreRoof();
  const site = focus.entry?.site || SITES[avatar.state.siteIndex >= 0 ? avatar.state.siteIndex : nearestSiteIndex()];
  rig.distTarget = Math.max(rig.distTarget, overviewDistance);
  rig.targetQ.copy(overviewQuaternion(site, rig.distTarget));
  rig.mode = 'overview'; focus.entry = null; focus.follow = false;
  rig.offsetTarget = 0;
  landmarks.entries.forEach(e => e.active = 0);
}
function focusSite(entry, close = false) {
  if (focus.entry !== entry) restoreRoof();
  rig.mode = 'focus'; focus.entry = entry; focus.follow = false;
  const [yaw, elevation] = entry.site.view;
  rig.yawTarget = THREE.MathUtils.degToRad(yaw);
  rig.focusElev = THREE.MathUtils.degToRad(elevation);
  const baseDistance = close ? (entry.site.kind === 'building' ? 8.5 : 5.2) : (entry.site.kind === 'building' ? 13 : 9.5);
  const a = THREE.MathUtils.degToRad(yaw), [bx, , bz] = entry.site.bounds;
  const width = 2 * (bx * Math.abs(Math.cos(a)) + bz * Math.abs(Math.sin(a))) * entry.site.scale;
  const horizontalFov = 2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.aspect);
  rig.distTarget = Math.max(baseDistance, width / (2 * Math.tan(horizontalFov / 2)) * 1.30);
  rig.offsetTarget = 0;
  landmarks.entries.forEach(e => e.active = e === entry ? 1 : 0);
}

// ---------- input ----------
let dragging = false, dragMoved = 0, pinchDistance = 0; const last = new THREE.Vector2();
const pointers = new Map();
function applyDrag(dx, dy) {
  if (rig.mode === 'overview') {
    const qy = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), dx * 0.0055);
    const qx = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), dy * 0.0055);
    rig.targetQ.premultiply(qy).premultiply(qx); rig.planetQ.premultiply(qy).premultiply(qx);
  } else {
    rig.yawTarget -= dx * 0.006;
    rig.focusElev = Math.min(1.25, Math.max(0.22, rig.focusElev + dy * 0.004));
  }
}
canvas.addEventListener('pointerdown', e => {
  if (pointers.size >= 2 || (e.pointerType === 'mouse' && e.button !== 0)) return;
  pointers.set(e.pointerId, new THREE.Vector2(e.clientX, e.clientY));
  canvas.setPointerCapture(e.pointerId); rig.idle = 0; rig.vel.set(0, 0);
  dragging = true; canvas.classList.add('dragging');
  if (pointers.size === 2) {
    const [a, b] = [...pointers.values()]; pinchDistance = a.distanceTo(b); dragMoved = Infinity;
  } else { dragMoved = 0; last.set(e.clientX, e.clientY); }
});
canvas.addEventListener('pointermove', e => {
  rig.idle = 0;
  if (pointers.has(e.pointerId)) {
    pointers.get(e.pointerId).set(e.clientX, e.clientY);
    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()], distance = a.distanceTo(b);
      if (distance > 4 && pinchDistance > 4) zoomBy(pinchDistance / distance);
      pinchDistance = distance;
    } else {
      const dx = e.clientX - last.x, dy = e.clientY - last.y; dragMoved += Math.abs(dx) + Math.abs(dy);
      applyDrag(dx, dy); rig.vel.set(dx, dy).multiplyScalar(0.5); last.set(e.clientX, e.clientY);
    }
  } else if (e.pointerType === 'mouse') hoverAt(e.clientX, e.clientY);
});
canvas.addEventListener('pointerup', e => {
  if (!pointers.delete(e.pointerId)) return;
  if (pointers.size) { last.copy([...pointers.values()][0]); pinchDistance = 0; rig.vel.set(0, 0); return; }
  dragging = false; canvas.classList.remove('dragging');
  if (dragMoved < 6) {
    const hit = pick(e.clientX, e.clientY);
    if (hit) openProject(hit);
    else {
      ndc.set(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
      raycaster.setFromCamera(ndc, camera);
      const ground = raycaster.intersectObject(terrain.mesh, false)[0];
      if (ground) {
        const dir = planet.worldToLocal(ground.point.clone()).normalize();
        if (walkable(dir)) {
          projectVisit.cancel(); current = null;
          landmarks.entries.forEach(e => e.active = 0);
          $('intro').hidden = true; rig.offsetTarget = 0; restoreRoof(); travelTo(dir);
        }
      }
    }
  }
  else if (rig.mode !== 'overview') rig.vel.set(0, 0);
});
canvas.addEventListener('pointercancel', () => {
  pointers.clear(); dragging = false; dragMoved = Infinity; pinchDistance = 0;
  canvas.classList.remove('dragging'); rig.vel.set(0, 0);
});
// Wheel and pinch zoom preserve the user's orbit; fixed landmark headings are set at scene creation.
function zoomBy(factor) {
  rig.idle = 0; rig.vel.set(0, 0);
  rig.autoRotate = false; $('rotate').setAttribute('aria-pressed', 'false');
  if (rig.mode === 'overview') {
    rig.distTarget = THREE.MathUtils.clamp(rig.distTarget * factor, 14, Math.max(64, overviewDistance * 1.35));
  } else {
    rig.distTarget = THREE.MathUtils.clamp(rig.distTarget * factor, 3.2, 22);
    if (rig.distTarget >= 22 && factor > 1 && !focus.follow) closeProject();
  }
}
function onZoomWheel(e) {
  e.preventDefault();
  zoomBy(Math.exp(e.deltaY * 0.0012));
}
canvas.addEventListener('wheel', onZoomWheel, { passive: false });
$('pins').addEventListener('wheel', onZoomWheel, { passive: false });
$('zoom-in').onclick = () => zoomBy(0.8);
$('zoom-out').onclick = () => zoomBy(1.25);
$('reset').onclick = () => { closeProject(); rig.distTarget = overviewDistance; };
$('rotate').onclick = () => { rig.autoRotate = !rig.autoRotate; $('rotate').setAttribute('aria-pressed', String(rig.autoRotate)); };
$('rotate').setAttribute('aria-pressed', String(rig.autoRotate));

const raycaster = new THREE.Raycaster(); const ndc = new THREE.Vector2();
function pick(x, y) {
  ndc.set(x / innerWidth * 2 - 1, -(y / innerHeight) * 2 + 1);
  raycaster.setFromCamera(ndc, camera);
  const hits = raycaster.intersectObjects(landmarks.proxies, false);
  for (const h of hits) {
    const entry = landmarks.byId[h.object.userData.siteId];
    const n = entry.site.n.clone().applyQuaternion(planet.quaternion);
    const p = new THREE.Vector3(); entry.group.getWorldPosition(p);
    if (n.dot(camera.position.clone().sub(p).normalize()) > 0.05) return entry;
  }
  return null;
}
const hoverLabel = $('hover-label');
let hoverThrottle = 0;
function hoverAt(x, y) {
  const now = performance.now(); if (now - hoverThrottle < 50) return; hoverThrottle = now;
  const hit = pick(x, y);
  landmarks.entries.forEach(e => e.hover = e === hit ? 1 : 0);
  canvas.classList.toggle('pointing', !!hit);
  if (hit) { hoverLabel.hidden = false; hoverLabel.style.left = x + 'px'; hoverLabel.style.top = y + 'px'; hoverLabel.querySelector('strong').textContent = hit.site.name + ' · ' + hit.site.role; }
  else hoverLabel.hidden = true;
}
canvas.addEventListener('pointerleave', () => { hoverLabel.hidden = true; landmarks.entries.forEach(e => e.hover = 0); });

// ---------- UI ----------
let current = null;
const projectCard = $('project');
const projectVisit = createWorkVisit({
  walk: (entry, arrived) => travelTo(entry.site.stand, SITES.indexOf(entry.site), arrived),
  dress: entry => {
    avatar.setOutfit(entry.site.id);
    $('outfit-name').textContent = entry.site.role + '黄白';
  },
  hide: () => { projectCard.hidden = true; },
  reveal: () => { projectCard.hidden = false; },
});
const toastEl = $('toast'); let toastTimer;
function toast(msg) { toastEl.textContent = msg; toastEl.classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(() => toastEl.classList.remove('show'), 2600); }
function nearestSiteIndex(dir = avatar.state.dir) {
  let best = 0;
  SITES.forEach((site, i) => { if (site.stand.dot(dir) > SITES[best].stand.dot(dir)) best = i; });
  return best;
}
function travelTo(dir, siteIndex = -1, arrived = () => {}) {
  const path = navigation.route(avatar.state.dir, dir);
  if (!path) { toast('这处暂时走不过去，换一块空地试试'); return false; }
  destination.position.copy(dir).multiplyScalar(R + heightAt(dir) + 0.045);
  destination.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir);
  destination.visible = true;
  avatar.walkTo(path, siteIndex, () => { destination.visible = false; arrived(); }, false);
  return true;
}
function openProject(entry, close = false) {
  if (current !== entry) restoreRoof();
  current = entry; const s = entry.site;
  $('intro').hidden = true;
  $('project-index').textContent = '作品 / ' + String(SITES.indexOf(s) + 1).padStart(2, '0');
  const work = WORKS[s.id];
  $('project-name').textContent = work.title;
  $('project-desc').textContent = work.summary;
  $('project-work-title').textContent = work.title;
  $('project-work').href = work.url;
  $('project-cover-link').hidden = !work.cover;
  $('project-summary').classList.toggle('has-cover', !!work.cover);
  if (work.cover) {
    $('project-cover-link').href = work.url;
    $('project-cover-link').setAttribute('aria-label', '观看：' + work.title);
    $('project-cover').src = work.cover;
    $('project-cover').alt = work.title + '封面';
  } else {
    $('project-cover').removeAttribute('src');
    $('project-cover').alt = '';
    $('project-cover-link').removeAttribute('href');
  }
  hoverLabel.hidden = true;
  $('view-interior').hidden = s.id !== 'scholar';
  landmarks.entries.forEach(e => e.active = e === entry ? 1 : 0);
  rig.offsetTarget = 0;
  if (projectVisit.begin(entry)) focusSite(entry, close);
  else { current = null; landmarks.entries.forEach(e => e.active = 0); }
}
function closeProject() {
  projectVisit.cancel(); current = null; restoreRoof();
  landmarks.entries.forEach(e => e.active = 0);
  if (rig.mode !== 'overview') goOverview();
  rig.offsetTarget = 0;
}
function autoDressNearby() {
  if (projectVisit.phase === 'walking' || projectVisit.phase === 'dressing') return;
  if (!avatar.state.walking && !frame.wasWalking) return;
  let near = null, gap = Infinity;
  for (const site of SITES) {
    const distance = avatar.state.dir.angleTo(site.n);
    if (distance < site.standAng + 0.018 && distance < gap) { near = site; gap = distance; }
  }
  if (!near || avatar.state.outfit === near.id) return;
  avatar.setOutfit(near.id);
  $('outfit-name').textContent = near.role + '黄白';
  toast('换上了' + near.role + '装扮');
}
$('project-close').onclick = closeProject;
$('look-close').onclick = () => current && focusSite(current, true);
$('view-interior').onclick = () => {
  const roof = current.model.getObjectByName('roof');
  const showInterior = roof.visible;
  if (showInterior) { focusSite(current, true); rig.distTarget = 10.5; rig.yawTarget = Math.PI / 12; }
  roof.visible = !showInterior;
  $('view-interior').textContent = roof.visible ? '查看内部' : '恢复屋顶';
  $('view-interior').setAttribute('aria-pressed', String(!roof.visible));
};
$('outfit-chip').onclick = () => {
  if (projectVisit.phase === 'walking' || projectVisit.phase === 'dressing') closeProject();
  avatar.setOutfit('daily'); $('outfit-name').textContent = '日常黄白'; toast('换回日常的黄白'); };
$('explore').onclick = () => { openProject(landmarks.entries[avatar.state.siteIndex >= 0 ? avatar.state.siteIndex : nearestSiteIndex()]); };
$('brand').onclick = e => { e.preventDefault(); closeProject(); $('intro').hidden = false; };
addEventListener('keydown', e => { if (e.key === 'Escape' && current) closeProject(); });

// floating name pins over the landmarks
const pinsEl = $('pins');
const pins = landmarks.entries.map((e, i) => {
  const b = document.createElement('button'); b.className = 'pin'; b.innerHTML = '<i>' + (i + 1) + '</i>' + e.site.name;
  b.onclick = () => openProject(e); pinsEl.appendChild(b); return b;
});
const tmpV = new THREE.Vector3(), tmpN = new THREE.Vector3(), toCam = new THREE.Vector3();
function updatePins() {
  landmarks.entries.forEach((e, i) => {
    const s = e.site;
    tmpV.copy(s.n).multiplyScalar(R + SITE_LEVEL + s.bounds[1] * s.scale + 0.35).applyQuaternion(planet.quaternion);
    tmpN.copy(s.n).applyQuaternion(planet.quaternion);
    toCam.copy(camera.position).sub(tmpV).normalize();
    const facing = tmpN.dot(toCam);
    let op = rig.mode === 'overview' ? THREE.MathUtils.smoothstep(facing, 0.15, 0.45) : (focus.entry === e ? 0 : THREE.MathUtils.smoothstep(facing, 0.3, 0.6) * 0.8);
    tmpV.project(camera);
    if (tmpV.z > 1) op = 0;
    const el = pins[i];
    el.style.opacity = op.toFixed(2); el.style.pointerEvents = op > 0.3 ? 'auto' : 'none';
    el.style.transform = 'translate(' + ((tmpV.x * 0.5 + 0.5) * innerWidth).toFixed(1) + 'px,' + ((-tmpV.y * 0.5 + 0.5) * innerHeight).toFixed(1) + 'px) translate(-50%,-100%)';
  });
}

// ---------- loop ----------
addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight, false);
  const oldDistance = overviewDistance; overviewDistance = fullPlanetDistance();
  if (rig.mode === 'overview' && rig.distTarget >= oldDistance * 0.9) rig.distTarget = overviewDistance;
});
const clock = new THREE.Clock();
let shadowSpan = 0, shadowOutfit = '', shadowRoof = true;
const shadowQ = new THREE.Quaternion(), shadowLook = new THREE.Vector3(), shadowAvatar = new THREE.Vector3();
const viewLocal = new THREE.Vector3(), invQ = new THREE.Quaternion();
let time = 0, frames = 0, fpsT = 0, fps = 0;
const perf = { fps: 0, cpuMs: 0, shadowUpdates: 0 };
function debugLook(dir, dist = 9, elev = 0.5, yaw = 0) {
  const fr = tangentFrame(dir);
  const entry = { site: { n: dir.clone().normalize(), frame: fr, kind: 'prop', stand: dir.clone().normalize(), hd: null }, debug: true };
  rig.mode = 'focus'; focus.entry = entry; focus.follow = false; rig.distTarget = dist; rig.focusElev = elev; rig.yawTarget = yaw; rig.offsetTarget = 0;
}
window.__planet = { SEA_LINE, T, bootMs: Math.round(performance.now()), debugLook, LAKE, heightAt, renderer, scene, camera, perf, stats: () => ({ ...stats(12000), veg: veg.counts, vegTris: veg.tris }), avatar, rig, landmarks, projectVisit, openProject: i => openProject(landmarks.entries[i]) };
function frame() {
  const cpu0 = performance.now();
  // Resizing clears WebGL's drawing buffer: apply it before this frame, never after rendering.
  if (nextPixelRatio !== pixelRatio) {
    pixelRatio = nextPixelRatio; renderer.setPixelRatio(pixelRatio); renderer.setSize(innerWidth, innerHeight, false);
  }
  const dt = Math.min(clock.getDelta(), 0.05);
  time += reduceMotion ? 0 : dt;
  rig.idle += dt;
  avatar.update(dt, time);
  autoDressNearby();
  projectVisit.update(avatar.state);
  updateRig(dt);
  terrain.uniforms.uTime.value = time; veg.uTime.value = time;
  sky.update(time, SUN_DIR, pixelRatio);
  clouds.update(time, camera);
  landmarks.update(time, dt);
  // Only landmark models use horizon culling; planted scenery always keeps its fixed instances.
  {
    viewLocal.copy(camera.position).applyQuaternion(invQ.copy(planet.quaternion).invert());
    const D = viewLocal.length(); viewLocal.divideScalar(D);
    const limit = Math.min(0.9, R / D) - 0.3;
    for (const e of landmarks.entries) e.group.visible = e.site.n.dot(viewLocal) > limit - 0.12;
  }
  scene.updateMatrixWorld();
  water.update(time, SUN_DIR, planet);
  updatePins();
  frame.wasWalking = avatar.state.walking;
  // A moving world must use a shadow from the same frame. Cache only the settled view.
  const roofVisible = landmarks.byId.scholar.model.getObjectByName('roof').visible;
  const shadowDirty = shadowQ.angleTo(planet.quaternion) > 0.0000001
    || shadowLook.distanceToSquared(sun.target.position) > 0.0000000001
    || shadowAvatar.distanceToSquared(avatar.root.position) > 0.0000000001
    || shadowSpan !== sun.shadow.camera.right || shadowOutfit !== avatar.state.outfit
    || shadowRoof !== roofVisible || avatar.state.walking || avatar.state.pop > 0.001;
  if (shadowDirty) {
    renderer.shadowMap.needsUpdate = true;
    shadowQ.copy(planet.quaternion); shadowLook.copy(sun.target.position); shadowAvatar.copy(avatar.root.position);
    shadowSpan = sun.shadow.camera.right; shadowOutfit = avatar.state.outfit; shadowRoof = roofVisible;
    perf.shadowUpdates++;
  }
  renderer.render(scene, camera);
  perf.cpuMs = +(perf.cpuMs * 0.95 + (performance.now() - cpu0) * 0.05 || 0).toFixed(2);
  frames++; fpsT += dt;
  if (fpsT > 1) {
    perf.fps = Math.round(frames / fpsT); frames = 0; fpsT = 0; perf.calls = renderer.info.render.calls; perf.tris = renderer.info.render.triangles;
    // adaptive resolution keeps big screens smooth: trade a little sharpness for frame rate, recover when there is headroom
    const lowPR = Math.max(0.85, Math.min(1, maxPR));
    if (perf.fps < 48 && pixelRatio > lowPR + 0.01) { nextPixelRatio = Math.max(lowPR, pixelRatio - 0.15); }
    else if (perf.fps > 58 && pixelRatio < maxPR - 0.01) { nextPixelRatio = Math.min(maxPR, pixelRatio + 0.1); }
    perf.pr = +pixelRatio.toFixed(2);
  }
  requestAnimationFrame(frame);
}
// Prepare every landmark and outfit before entry, including those on the far side.
// This pays the shader compilation cost during loading rather than on the first approach.
updateRig(0.016); avatar.update(0, 0); scene.updateMatrixWorld();
const warmTarget = new THREE.WebGLRenderTarget(32, 32);
const culling = [];
scene.traverse(o => {
  if (!o.isMesh && !o.isPoints && !o.isSprite) return;
  culling.push([o, o.frustumCulled]); o.frustumCulled = false;
});
renderer.setRenderTarget(warmTarget);
await renderer.compileAsync(scene, camera);
await avatar.prewarm(renderer, camera, scene);
// The tiny offscreen frame uploads every hemisphere's buffers and textures before interaction.
for (const [object, value] of culling) object.frustumCulled = value;
renderer.setRenderTarget(null); warmTarget.dispose();
scene.updateMatrixWorld();
sky.update(0, SUN_DIR, pixelRatio);
renderer.shadowMap.needsUpdate = true;
renderer.render(scene, camera);
$('loading').classList.add('done');
clock.start();
requestAnimationFrame(frame);
