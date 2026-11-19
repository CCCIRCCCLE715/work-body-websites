import * as THREE from 'three';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { R, LAKES, LAKE_LEVEL, heightAt, lakeCoords, moveAlong } from './planet-surface.js';

// Shading follows the open-source three.js Water.js approach (MIT): several scrolled samples of a
// tiling normal map, Fresnel sky reflection and a tight sun glint. Here the samples are triplanar
// so they flow seamlessly around a sphere, swells are gentle Gerstner-style sums, and the shoreline
// fades through animated foam using per-vertex water depth.

function makeWaterNormals(size = 512) {
  // periodic value noise -> tiling height field -> normal map
  const rnd = (x, y, p) => { const s = Math.sin(((x % p + p) % p) * 127.1 + ((y % p + p) % p) * 311.7 + p * 17.3) * 43758.5453; return s - Math.floor(s); };
  const vn = (x, y, p) => {
    const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
    const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    const a = rnd(xi, yi, p), b = rnd(xi + 1, yi, p), c = rnd(xi, yi + 1, p), d = rnd(xi + 1, yi + 1, p);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  };
  const H = new Float32Array(size * size);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    let h = 0, amp = 1, per = 8;
    for (let o = 0; o < 5; o++) { h += amp * vn(x / size * per, y / size * per, per); amp *= 0.5; per *= 2; }
    H[y * size + x] = h;
  }
  const data = new Uint8Array(size * size * 4);
  const k = 2.2;
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const l = H[y * size + ((x - 1 + size) % size)], r = H[y * size + ((x + 1) % size)];
    const dn = H[((y - 1 + size) % size) * size + x], up = H[((y + 1) % size) * size + x];
    let nx = (l - r) * k, ny = (dn - up) * k, nz = 1; const len = Math.hypot(nx, ny, nz);
    nx /= len; ny /= len; nz /= len;
    const i = (y * size + x) * 4;
    data[i] = (nx * 0.5 + 0.5) * 255; data[i + 1] = (ny * 0.5 + 0.5) * 255; data[i + 2] = (nz * 0.5 + 0.5) * 255; data[i + 3] = 255;
  }
  const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter; tex.magFilter = THREE.LinearFilter; tex.anisotropy = 8;
  tex.needsUpdate = true;
  return tex;
}

const vertexShader = /* glsl */`
attribute float depth;
uniform float uTime; uniform float uAmp;
varying vec3 vObjPos; varying vec3 vWorldPos; varying vec3 vNormalW; varying float vDepth;
#include <common>
void main(){
  vec3 n = normalize(position);
  float shoreDamp = smoothstep(-0.02, 0.25, depth);
  float a = uAmp * (0.55 + 0.45*smoothstep(0.0, 1.0, depth)) * shoreDamp;
  vec3 p = position;
  float w = sin(dot(p, vec3(0.61, 0.13, 0.78))*1.7 + uTime*0.9)*0.5
          + sin(dot(p, vec3(-0.35, 0.86, 0.36))*2.6 - uTime*1.25)*0.3
          + sin(dot(p, vec3(0.2, -0.5, 0.84))*4.3 + uTime*1.7)*0.2;
  vec3 displaced = p + n * w * a;
  vObjPos = position; vDepth = depth;
  vec4 wp = modelMatrix * vec4(displaced, 1.0);
  vWorldPos = wp.xyz;
  vNormalW = normalize(mat3(modelMatrix) * n);
  gl_Position = projectionMatrix * viewMatrix * wp;
}`;

const fragmentShader = /* glsl */`
uniform float uTime; uniform sampler2D uNormals; uniform vec3 uSunDir; uniform vec3 uSunColor;
uniform vec3 uShallow; uniform vec3 uDeep; uniform vec3 uSkyLow; uniform vec3 uSkyHigh;
uniform float uDepthScale; uniform float uFlow; uniform mat3 uObjToWorld;
varying vec3 vObjPos; varying vec3 vWorldPos; varying vec3 vNormalW; varying float vDepth;
#include <common>

vec3 tri(vec3 p, vec3 w, vec2 off, float scale){
  vec3 a = texture2D(uNormals, p.yz*scale + off).xyz*2.0-1.0;
  vec3 b = texture2D(uNormals, p.zx*scale + off.yx).xyz*2.0-1.0;
  vec3 c = texture2D(uNormals, p.xy*scale - off).xyz*2.0-1.0;
  // swizzle each tangent-space normal onto its projection plane
  return vec3(0.0, a.x, a.y)*w.x + vec3(b.y, 0.0, b.x)*w.y + vec3(c.x, c.y, 0.0)*w.z;
}
void main(){
  if (vDepth < -0.04) discard;
  vec3 nObj = normalize(vObjPos);
  vec3 w = pow(abs(nObj), vec3(4.0)); w /= (w.x+w.y+w.z);
  float t = uTime * uFlow;
  // four scrolled samples in the spirit of Water.js getNoise()
  vec3 bump = tri(vObjPos, w, vec2(t*0.021, t*0.013), 0.11)
            + tri(vObjPos, w, vec2(-t*0.017, t*0.024), 0.19) * 0.8
            + tri(vObjPos, w, vec2(t*0.031, -t*0.027), 0.5) * 0.55;
  vec3 bumpW = uObjToWorld * bump;
  vec3 N0 = normalize(vNormalW);
  float detailFade = 1.0 - smoothstep(18.0, 60.0, length(cameraPosition - vWorldPos));
  vec3 N = normalize(N0 + (bumpW - dot(bumpW, N0)*N0) * (0.24 * (0.35 + 0.65*detailFade)));
  vec3 V = normalize(cameraPosition - vWorldPos);
  vec3 L = normalize(uSunDir);

  float depth = max(vDepth, 0.0) * uDepthScale;
  vec3 body = mix(uShallow, uDeep, smoothstep(0.0, 0.85, depth));
  float ndl = max(dot(N0, L), 0.0);
  body *= 0.5 + 0.65*ndl;

  float fres = 0.02 + 0.98*pow(1.0 - max(dot(N, V), 0.0), 5.0);
  vec3 Rv = reflect(-V, N);
  vec3 sky = mix(uSkyLow, uSkyHigh, smoothstep(-0.1, 0.8, dot(Rv, N0)));
  vec3 col = mix(body, sky, clamp(fres*0.85, 0.0, 0.9));

  vec3 H = normalize(L + V);
  float nh = max(dot(N, H), 0.0);
  col += uSunColor * (pow(nh, 600.0)*1.6 + pow(nh, 60.0)*0.06) * smoothstep(0.0, 0.2, ndl);

  // shoreline foam: a soft rim plus slow bands rolling toward the beach
  float fn = clamp(bump.x*0.35 + bump.z*0.35 + 0.5, 0.0, 1.0);
  float rim = 1.0 - smoothstep(0.0, 0.05 + 0.03*fn, depth);
  float bands = smoothstep(0.6, 0.92, sin(depth*48.0 - uTime*1.4 + fn*5.0)*0.5+0.5) * (1.0 - smoothstep(0.03, 0.2, depth));
  float foam = clamp(rim*0.8 + bands*0.45, 0.0, 1.0) * smoothstep(0.25, 0.6, fn + 0.3);
  col = mix(col, vec3(1.0, 0.99, 0.96), foam*0.85);

  float alpha = mix(0.5, 0.93, smoothstep(0.0, 0.7, depth));
  alpha = max(alpha, fres*0.9);
  alpha *= smoothstep(-0.04, 0.02, vDepth);
  alpha = max(alpha, foam*0.9*smoothstep(-0.04, 0.0, vDepth));
  gl_FragColor = vec4(col, alpha);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

function waterMaterial(normals, opts) {
  return new THREE.ShaderMaterial({
    vertexShader, fragmentShader, transparent: true, depthWrite: false,
    uniforms: {
      uTime: { value: 0 }, uNormals: { value: normals }, uSunDir: { value: new THREE.Vector3(0, 1, 0) },
      uSunColor: { value: new THREE.Color(0xfff2d8) },
      uShallow: { value: new THREE.Color(opts.shallow) }, uDeep: { value: new THREE.Color(opts.deep) },
      uSkyLow: { value: new THREE.Color(0xd9ecff) }, uSkyHigh: { value: new THREE.Color(0x8fb6ef) },
      uAmp: { value: opts.amp }, uDepthScale: { value: opts.depthScale }, uFlow: { value: opts.flow },
      uObjToWorld: { value: new THREE.Matrix3() },
    },
  });
}

function filterTriangles(geo, keep) {
  const idx = geo.index.array; const out = [];
  for (let i = 0; i < idx.length; i += 3) if (keep(idx[i], idx[i + 1], idx[i + 2])) out.push(idx[i], idx[i + 1], idx[i + 2]);
  geo.setIndex(out);
  return geo;
}

export function createWater(terrain) {
  const normals = makeWaterNormals();
  // ocean shell built on the terrain's own vertices, so heights are reused and the shoreline matches exactly
  const geo = new THREE.BufferGeometry();
  const tpos = terrain.mesh.geometry.attributes.position;
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(tpos.array), 3));
  geo.setIndex(new THREE.BufferAttribute(terrain.mesh.geometry.index.array.slice(), 1));
  const pos = geo.attributes.position; const depth = new Float32Array(pos.count); const d = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    d.fromBufferAttribute(pos, i).normalize();
    const h = terrain.heights[i];
    const lk = lakeCoords(d);
    depth[i] = lk.u < 2.2 ? Math.min(-h, -0.2) : -h; // never let the sea leak into the lake basin
    pos.setXYZ(i, d.x * R, d.y * R, d.z * R);
  }
  geo.setAttribute('depth', new THREE.BufferAttribute(depth, 1));
  filterTriangles(geo, (a, b, c) => Math.max(depth[a], depth[b], depth[c]) > -0.06);
  const oceanMat = waterMaterial(normals, { shallow: 0x7fe6dc, deep: 0x1e6fb0, amp: 0.05, depthScale: 1.0, flow: 1.0 });
  const ocean = new THREE.Mesh(geo, oceanMat);
  ocean.name = 'ocean'; ocean.renderOrder = 2;

  // lakes: a polar patch per lake on the lake level, gentler and greener
  const lakeMat = waterMaterial(normals, { shallow: 0x8fe8dc, deep: 0x2a8fb0, amp: 0.012, depthScale: 3.2, flow: 0.6 });
  const lakes = LAKES.map((L, k) => {
    const rings = 28, segs = 112, maxA = L.base * 1.9;
    const lp = [], ld = [], li = [];
    const { c, frame } = L;
    for (let r = 0; r <= rings; r++) for (let s = 0; s < segs; s++) {
      const a = maxA * Math.pow(r / rings, 0.9), phi = s / segs * Math.PI * 2;
      const t = frame.r.clone().multiplyScalar(Math.cos(phi)).addScaledVector(frame.f, Math.sin(phi));
      const dir = r === 0 ? c.clone() : moveAlong(c, t, a);
      lp.push(dir.x * (R + LAKE_LEVEL), dir.y * (R + LAKE_LEVEL), dir.z * (R + LAKE_LEVEL));
      ld.push(LAKE_LEVEL - heightAt(dir));
    }
    for (let r = 0; r < rings; r++) for (let s = 0; s < segs; s++) {
      const a = r * segs + s, b = r * segs + (s + 1) % segs, c2 = (r + 1) * segs + s, d2 = (r + 1) * segs + (s + 1) % segs;
      li.push(a, c2, b, b, c2, d2);
    }
    const lgeo = new THREE.BufferGeometry();
    lgeo.setAttribute('position', new THREE.Float32BufferAttribute(lp, 3));
    lgeo.setAttribute('depth', new THREE.Float32BufferAttribute(ld, 1));
    lgeo.setIndex(li);
    filterTriangles(lgeo, (a, b, c3) => Math.max(ld[a], ld[b], ld[c3]) > -0.05);
    const lake = new THREE.Mesh(lgeo, lakeMat);
    lake.name = 'lake-' + k; lake.renderOrder = 2;
    return lake;
  });

  const mats = [oceanMat, lakeMat];
  return {
    ocean, lakes,
    update(time, sunDirWorld, planet) {
      const m3 = new THREE.Matrix3().setFromMatrix4(planet.matrixWorld);
      for (const m of mats) { m.uniforms.uTime.value = time; m.uniforms.uSunDir.value.copy(sunDirWorld); m.uniforms.uObjToWorld.value.copy(m3); }
    },
  };
}