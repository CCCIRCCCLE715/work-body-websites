import * as THREE from 'three';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { R, SITES, LAKE_LEVEL, heightAt, lakeCoords, PATH_HASH, angleBetween, reliefAt, shoreMargin } from './planet-surface.js';
import { createNoise3D, smoothstep, clamp } from './noise.js';

const nTint = createNoise3D(71);
const C = hex => new THREE.Color(hex);
// grass greens at 70% of their original saturation (softer, less candy-like)
const G = hex => { const c = new THREE.Color(hex); const hsl = {}; c.getHSL(hsl); return c.setHSL(hsl.h, hsl.s * 0.7, hsl.l * 0.86); };
const PAL = {
  deep: C(0x23708f), shelf: C(0x4fb2b4), shallow: C(0x9fe0cf), wetSand: C(0xe6cf98), sand: C(0xf7e6b6),
  grassA: G(0xa6e070), grassB: G(0x7cce62), grassC: G(0x59b65c), hill: G(0x4c9d5a), moss: G(0xc4e483),
  rock: C(0xbcb3a4), path: C(0xf0dba8), plaza: C(0xf3e7cc), lakeBed: C(0x8fd6bd), mud: C(0xd9c58f),
  dryGrass: C(0xd8cf9a), bareGround: C(0xe6d9b4),
};

export function createTerrain(detail = 92) {
  let geo = new THREE.IcosahedronGeometry(1, detail);
  geo.deleteAttribute('normal'); geo.deleteAttribute('uv');
  geo = mergeVertices(geo, 1e-5);
  const pos = geo.attributes.position;
  const count = pos.count;
  const heights = new Float32Array(count);
  const d = new THREE.Vector3();
  for (let i = 0; i < count; i++) {
    d.fromBufferAttribute(pos, i).normalize();
    const h = heightAt(d);
    heights[i] = h;
    pos.setXYZ(i, d.x * (R + h), d.y * (R + h), d.z * (R + h));
  }
  geo.computeVertexNormals();
  const nrm = geo.attributes.normal;
  const colors = new Float32Array(count * 3);
  const col = new THREE.Color(), n = new THREE.Vector3();
  for (let i = 0; i < count; i++) {
    d.fromBufferAttribute(pos, i).normalize();
    n.fromBufferAttribute(nrm, i);
    const h = heights[i];
    const slope = 1 - clamp(n.dot(d), 0, 1);
    const t1 = nTint(d.x * 1.05, d.y * 1.05, d.z * 1.05), t2 = nTint(d.x * 4 + 5, d.y * 4, d.z * 4);
    const margin = shoreMargin(d); // how far above the shoreline this point sits
    const lk = lakeCoords(d);
    if (h < 0) {
      col.copy(PAL.shallow).lerp(PAL.shelf, smoothstep(0.02, 0.35, -h)).lerp(PAL.deep, smoothstep(0.3, 1.2, -h));
    } else {
      // Three related greens form broad connected meadows with soft boundaries.
      col.copy(PAL.grassB)
        .lerp(PAL.grassA, smoothstep(-0.02, 0.40, t1) * 0.75)
        .lerp(PAL.grassC, (1 - smoothstep(-0.42, -0.12, t1)) * 0.5);
      col.lerp(PAL.hill, smoothstep(0.65, 1.35, h) * 0.20);
      const dry = smoothstep(0.35, 0.65, nTint(d.x * 1.1 + 11, d.y * 1.1, d.z * 1.1 - 6))
        * (1 - smoothstep(0.35, 0.7, reliefAt(d)));
      if (h > 0.1) col.lerp(PAL.dryGrass, dry * 0.12);
    // beach and wet sand near the sea
      // beach is a narrow band measured from the shoreline, so flat inland ground stays green
      const beachK = 1 - smoothstep(0.012, 0.05, margin + 0.008 * t2);
      col.lerp(PAL.sand, beachK);
      col.lerp(PAL.wetSand, 1 - smoothstep(0.0, 0.012, margin));
      col.lerp(PAL.rock, smoothstep(0.2, 0.42, slope) * 0.85);
    }
    // lake bed and muddy, reedy bank
    if (lk.u < 1.6) {
      if (lk.u < 1) col.copy(PAL.lakeBed).lerp(PAL.shelf, smoothstep(0.6, 0.0, lk.u) * 0.45);
      else { col.lerp(PAL.wetSand, 1 - smoothstep(1.0, 1.1, lk.u)); col.lerp(PAL.sand, (1 - smoothstep(1.08, 1.42, lk.u)) * 0.92); } // sandy lake beach
    }
    // footpaths
    if (h > 0.02) {
      const near = PATH_HASH.nearest(d, 0.05);
      if (near.item) col.lerp(PAL.path, (1 - smoothstep(0.012, 0.026 + 0.004 * t2, near.dist)) * 0.9);
    }
    // plazas under the props, foundations under buildings
    for (const s of SITES) {
      const a = angleBetween(d, s.n);
      if (a < s.core + 0.02) {
        const w = 1 - smoothstep(s.core - 0.03, s.core + 0.015, a);
        col.lerp(s.kind === 'building' ? PAL.moss : PAL.plaza, w * (s.kind === 'building' ? 0.35 : 0.9));
      }
    }
    colors.set([col.r, col.g, col.b], i * 3);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.computeBoundingSphere();

  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.92, metalness: 0, envMapIntensity: 0.35 });
  const uniforms = { uTime: { value: 0 } };
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = uniforms.uTime;
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vObjPos;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvObjPos = position;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
varying vec3 vObjPos; uniform float uTime;
float hash13(vec3 p){ p = fract(p*0.1031); p += dot(p, p.zyx+31.32); return fract((p.x+p.y)*p.z); }
float vnoise(vec3 p){ vec3 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
  return mix(mix(mix(hash13(i),hash13(i+vec3(1,0,0)),f.x),mix(hash13(i+vec3(0,1,0)),hash13(i+vec3(1,1,0)),f.x),f.y),
             mix(mix(hash13(i+vec3(0,0,1)),hash13(i+vec3(1,0,1)),f.x),mix(hash13(i+vec3(0,1,1)),hash13(i+vec3(1,1,1)),f.x),f.y),f.z); }
`)
      .replace('#include <color_fragment>', `#include <color_fragment>
{
  float hgt = length(vObjPos) - ${R.toFixed(1)};
  float grain = vnoise(vObjPos*7.0)*0.6 + vnoise(vObjPos*23.0)*0.4;
  diffuseColor.rgb *= 0.99 + 0.02*grain;
  // soft dappled caustics on the shallow sea floor
  if (hgt < 0.0) {
    vec3 q = vObjPos*2.6 + vec3(uTime*0.25, -uTime*0.18, uTime*0.12);
    float c = abs(vnoise(q) - vnoise(q*1.7 + 3.1));
    float caust = pow(1.0 - clamp(c*3.0, 0.0, 1.0), 4.0);
    diffuseColor.rgb += caust * 0.22 * (1.0 - smoothstep(0.0, 0.45, -hgt));
  }
}
`);
  };
  const mesh = new THREE.Mesh(geo, mat);
  mesh.receiveShadow = true;
  mesh.name = 'terrain';
  return { mesh, uniforms, heights };
}