import * as THREE from 'three';
import { R, SITES, SITE_LEVEL } from './planet-surface.js';

export function siteQuaternion(site) {
  const m = new THREE.Matrix4().makeBasis(site.frame.r, site.frame.n, site.frame.f);
  return new THREE.Quaternion().setFromRotationMatrix(m);
}

export function prepareModel(root, renderer, { cast = true } = {}) {
  const aniso = renderer.capabilities.getMaxAnisotropy();
  root.traverse(o => {
    if (!o.isMesh) return;
    o.castShadow = cast; o.receiveShadow = true;
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    for (const m of mats) {
      for (const k of ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'emissiveMap']) if (m[k]) { m[k].anisotropy = aniso; m[k].needsUpdate = true; }
      // Tripo exports metallic=1 with a packed map; tame it so clay-like props keep their true colours
      if ('metalness' in m) m.metalness = Math.min(m.metalness, 0.55);
      m.envMapIntensity = 0.75;
      m.side = THREE.FrontSide;
      m.needsUpdate = true;
    }
  });
  return root;
}

export function createLandmarks(planet) {
  const entries = SITES.map(site => {
    const group = new THREE.Group(); group.name = 'site-' + site.id;
    group.position.copy(site.n).multiplyScalar(R + SITE_LEVEL - 0.012);
    group.quaternion.copy(siteQuaternion(site));
    const content = new THREE.Group(); content.scale.setScalar(site.scale); group.add(content);
    const [bx, by, bz] = site.bounds;
    const proxy = new THREE.Mesh(new THREE.BoxGeometry(bx * 2, by, bz * 2), new THREE.MeshBasicMaterial());
    proxy.position.y = by / 2; proxy.visible = false; proxy.userData.siteId = site.id; content.add(proxy);
    const rad = site.core * R * (site.kind === 'building' ? 1.02 : 0.95);
    const ring = new THREE.Mesh(new THREE.RingGeometry(rad - 0.08, rad, 72), new THREE.MeshBasicMaterial({ color: 0xfff1b8, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide }));
    ring.rotation.x = -Math.PI / 2; ring.position.y = 0.05; ring.renderOrder = 3; group.add(ring);
    planet.add(group);
    return { site, group, content, proxy, ring, model: null, anim: null, hover: 0, active: 0 };
  });
  return {
    entries,
    byId: Object.fromEntries(entries.map(e => [e.site.id, e])),
    proxies: entries.map(e => e.proxy),
    setModel(entry, root, anim) {
      if (entry.model) { entry.content.remove(entry.model); disposeTree(entry.model); }
      entry.model = root; entry.anim = anim || null; entry.content.add(root);
      // Keep local lamps in the planet light list even when their building is behind the
      // horizon. Changing light counts would compile new PBR shader variants mid-orbit.
      entry.group.updateWorldMatrix(true, true);
      const lamps = []; root.traverse(o => { if (o.isLight) lamps.push(o); });
      for (const lamp of lamps) planet.attach(lamp);
    },
    update(time, dt) {
      for (const e of entries) {
        const target = Math.max(e.hover * 0.55, e.active * 0.9);
        const op = e.ring.material.opacity + (target * (0.75 + 0.25 * Math.sin(time * 3)) - e.ring.material.opacity) * Math.min(1, dt * 6);
        e.ring.material.opacity = op; e.ring.visible = op > 0.01 && e.group.visible;
        if (e.anim && e.group.visible) e.anim(time, dt);
      }
    },
  };
}

export function disposeTree(root) {
  root.traverse(o => {
    if (o.geometry) o.geometry.dispose();
    const mats = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : [];
    for (const m of mats) { for (const k in m) if (m[k] && m[k].isTexture) m[k].dispose(); m.dispose(); }
  });
}
