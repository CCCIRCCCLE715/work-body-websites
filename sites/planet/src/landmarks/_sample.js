import * as THREE from 'three';
import { G, mat, glow, mesh, group, finalize, glowSprite } from './kit.js';
export function build() {
  const root = new THREE.Group();
  mesh(G.box(0.9, 0.08, 0.9, 0.03), mat(0xe9d8b4), { pos: [0, 0.04, 0], parent: root });
  mesh(G.cyl(0.08, 0.1, 0.6), mat(0xc9433a), { pos: [0, 0.38, 0], parent: root });
  const bulb = mesh(G.sphere(0.05), glow(0xffc070, 2.4), { pos: [0, 0.74, 0], parent: root, dynamic: true });
  const halo = glowSprite(0xffb060, 0.3); halo.position.set(0, 0.74, 0); root.add(halo);
  finalize(root);
  return { group: root, update(t) { bulb.material.emissiveIntensity = 2.2 + Math.sin(t * 3) * 0.3; } };
}
