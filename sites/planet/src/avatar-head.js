import * as THREE from 'three';

// Keep only the head of the scanned GLB: everything below the neck line is trimmed away and the
// opening is capped, so the code-built body takes over from the shoulders down.
export const HEAD_CUT_Y = 0.638;      // model units (scan scale, total 0.98 tall)
export const HEAD_TOP_Y = 0.98;
export const HEAD_CENTER_Y = 0.80;
export const HEAD_RADIUS = 0.185;

const HAIR_GLSL = "#include <map_fragment>\n{\n  vec3 c = diffuseColor.rgb;\n  float l = dot(c, vec3(0.2126, 0.7152, 0.0722));\n  float warm = smoothstep(0.004, 0.03, c.r - c.b);\n  float dark = 1.0 - smoothstep(0.07, 0.2, l);\n  diffuseColor.rgb = mix(c, vec3(0.018, 0.019, 0.025) + vec3(l) * 0.32, warm * dark);\n}";

export function extractHead(gltfScene, renderer) {
  const root = new THREE.Group();
  root.name = 'head';
  const aniso = renderer ? renderer.capabilities.getMaxAnisotropy() : 8;
  gltfScene.updateMatrixWorld(true);
  gltfScene.traverse(o => {
    if (!o.isMesh) return;
    const geo = o.geometry.clone();
    geo.applyMatrix4(o.matrixWorld);
    const src = geo.index ? geo.toNonIndexed() : geo;
    const pos = src.attributes.position, uv = src.attributes.uv, nrm = src.attributes.normal;
    const keep = { p: [], n: [], u: [] };
    const ring = [];
    const cut = HEAD_CUT_Y, eps = 1e-6;
    const tri = new THREE.Triangle(), a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
    const above = (v) => v.y >= cut;
    for (let i = 0; i < pos.count; i += 3) {
      a.fromBufferAttribute(pos, i); b.fromBufferAttribute(pos, i + 1); c.fromBufferAttribute(pos, i + 2);
      const na = above(a), nb = above(b), nc = above(c);
      if (na && nb && nc) {
        for (const [v, k] of [[a, i], [b, i + 1], [c, i + 2]]) {
          keep.p.push(v.x, v.y, v.z);
          if (nrm) keep.n.push(nrm.getX(k), nrm.getY(k), nrm.getZ(k));
          if (uv) keep.u.push(uv.getX(k), uv.getY(k)); else keep.u.push(0, 0);
        }
      } else if (na || nb || nc) {
        // clip the triangle against y = cut, keeping the upper part (simple: barycentric edge split)
        const verts = [[a, i], [b, i + 1], [c, i + 2], [a, i]];
        const out = [];
        for (let k = 0; k < 3; k++) {
          const [v0, i0] = verts[k], [v1, i1] = verts[k + 1];
          const n0 = v0.y >= cut, n1 = v1.y >= cut;
          if (n0) out.push({ p: v0.clone(), n: new THREE.Vector3().fromBufferAttribute(nrm, i0), uv: new THREE.Vector2().fromBufferAttribute(uv, i0) });
          if (n0 !== n1) {
            const t = (cut - v0.y) / (v1.y - v0.y);
            const p = v0.clone().lerp(v1, t); p.y = cut;
            out.push({ p, n: new THREE.Vector3().fromBufferAttribute(nrm, i0).lerp(new THREE.Vector3().fromBufferAttribute(nrm, i1), t).normalize(), uv: new THREE.Vector2().fromBufferAttribute(uv, i0).lerp(new THREE.Vector2().fromBufferAttribute(uv, i1), t) });
            ring.push(p.clone());
          }
        }
        for (let k = 1; k < out.length - 1; k++) {
          for (const v of [out[0], out[k], out[k + 1]]) {
            keep.p.push(v.p.x, v.p.y, v.p.z);
            keep.n.push(v.n.x, v.n.y, v.n.z);
            keep.u.push(v.uv.x, v.uv.y);
          }
        }
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(keep.p, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(keep.n, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(keep.u, 2));
    g.computeBoundingSphere();
    const m = o.material.clone();
    if (m.map) { m.map = m.map.clone(); m.map.anisotropy = aniso; m.map.needsUpdate = true; }
    m.metalness = Math.min(m.metalness ?? 0, 0.2); m.envMapIntensity = 0.7; m.roughness = Math.min(m.roughness ?? 1, 0.85);
    // the scan's hair is warm dark brown: push dark warm texels to soft black so it reads black
    m.onBeforeCompile = sh => {
      sh.fragmentShader = sh.fragmentShader.replace('#include <map_fragment>', HAIR_GLSL);
    };
    m.customProgramCacheKey = () => 'avatar-black-hair';
    const mesh = new THREE.Mesh(g, m);
    mesh.castShadow = true; mesh.receiveShadow = true;
    root.add(mesh);
  });
  // cap the neck opening with a skin disc so the hollow shell never shows from below
  if (root.children.length) {
    const capGeo = new THREE.CircleGeometry(0.062, 32);
    capGeo.rotateX(Math.PI / 2);
    const cap = new THREE.Mesh(capGeo, new THREE.MeshStandardMaterial({ color: 0xf3cdb6, roughness: 0.72 }));
    cap.position.y = HEAD_CUT_Y - 0.002;
    root.add(cap);
  }
  // recentre on the head origin used by the body rig
  root.position.y = -HEAD_CENTER_Y;
  return root;
}