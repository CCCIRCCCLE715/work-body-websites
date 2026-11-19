import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { R } from './planet-surface.js';
import { mulberry32, createNoise3D } from './noise.js';

const rand = mulberry32(777);

export function createSky(renderer) {
  const group = new THREE.Group(); group.name = 'sky';
  // dome with soft nebulae
  const dome = new THREE.Mesh(new THREE.SphereGeometry(400, 48, 24), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false,
    uniforms: { uSun: { value: new THREE.Vector3(-0.5, 0.6, 0.6).normalize() } },
    vertexShader: `varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); gl_Position.z = gl_Position.w; }`,
    fragmentShader: `varying vec3 vDir; uniform vec3 uSun;
      float h(vec3 p){ p=fract(p*0.3183099+.1); p*=17.0; return fract(p.x*p.y*p.z*(p.x+p.y+p.z)); }
      float n(vec3 x){ vec3 i=floor(x), f=fract(x); f=f*f*(3.0-2.0*f);
        return mix(mix(mix(h(i),h(i+vec3(1,0,0)),f.x),mix(h(i+vec3(0,1,0)),h(i+vec3(1,1,0)),f.x),f.y),
                   mix(mix(h(i+vec3(0,0,1)),h(i+vec3(1,0,1)),f.x),mix(h(i+vec3(0,1,1)),h(i+vec3(1,1,1)),f.x),f.y),f.z); }
      float fbm(vec3 p){ float s=0.0, a=0.5; for(int i=0;i<5;i++){ s+=a*n(p); p*=2.03; a*=0.5; } return s; }
      void main(){
        vec3 d = normalize(vDir);
        vec3 top = vec3(0.001,0.0025,0.008), mid = vec3(0.002,0.005,0.014), low = vec3(0.003,0.007,0.018);
        vec3 col = mix(low, mid, smoothstep(-0.6, 0.1, d.y)); col = mix(col, top, smoothstep(0.1, 0.9, d.y));
        float band = exp(-pow(dot(d, normalize(vec3(0.35, 0.8, -0.45)))*3.2, 2.0));
        float neb = fbm(d*3.0 + vec3(2.0));
        float neb2 = fbm(d*5.5 - vec3(4.0));
        col += vec3(0.020, 0.035, 0.065) * pow(neb, 3.0) * 0.22 * (0.35 + band);
        col += vec3(0.025, 0.012, 0.040) * pow(neb2, 4.0) * 0.20 * band;
        col += vec3(0.012, 0.020, 0.040) * band * 0.015;
        // A wide, noise-softened colour sweep has no radial centre or ring edge.
        float sweep = d.x + 0.25*d.y + 0.18*(neb-0.5);
        float hue = smoothstep(-0.45, 0.60, sweep);
        vec3 nebulaTint = mix(vec3(0.020, 0.004, 0.033), vec3(0.027, 0.004, 0.014), hue);
        float density = (0.35 + neb*0.45 + neb2*0.20) * (0.65 + band*0.35);
        col += nebulaTint * density;
        float sun = max(dot(d, normalize(uSun)), 0.0);
        col += vec3(0.4, 0.52, 0.7) * (pow(sun, 30.0)*0.025 + pow(sun, 6.0)*0.004);
        gl_FragColor = vec4(col, 1.0);
        #include <colorspace_fragment>
      }`,
  }));
  dome.renderOrder = -10; dome.frustumCulled = false;
  // the nebula is static: render it once into a cubemap instead of running the noise per pixel every frame
  const bakeScene = new THREE.Scene(); bakeScene.add(dome);
  const rt = new THREE.WebGLCubeRenderTarget(1024, { type: THREE.HalfFloatType, generateMipmaps: true, minFilter: THREE.LinearMipmapLinearFilter });
  const cubeCam = new THREE.CubeCamera(1, 1000, rt);
  let baked = false;
  const bake = () => { cubeCam.update(renderer, bakeScene); baked = true; };

  // twinkling stars of mixed size and colour
  const N = 4200; const pos = new Float32Array(N * 3), col = new Float32Array(N * 3), size = new Float32Array(N), ph = new Float32Array(N);
  const tints = [[0.92, 0.96, 1], [0.82, 0.9, 1], [0.96, 0.97, 1], [1, 0.94, 0.86], [0.89, 0.9, 1]];
  for (let i = 0; i < N; i++) {
    const u = rand() * 2 - 1, th = rand() * Math.PI * 2, r = Math.sqrt(1 - u * u);
    pos.set([r * Math.cos(th) * 300, u * 300, r * Math.sin(th) * 300], i * 3);
    const t = tints[Math.floor(rand() * tints.length)]; col.set(t, i * 3);
    size[i] = rand() < 0.04 ? 5 + rand() * 4 : 1.6 + Math.pow(rand(), 2.5) * 3.2; ph[i] = rand() * 100;
  }
  const sg = new THREE.BufferGeometry();
  sg.setAttribute('position', new THREE.BufferAttribute(pos, 3)); sg.setAttribute('color', new THREE.BufferAttribute(col, 3));
  sg.setAttribute('size', new THREE.BufferAttribute(size, 1)); sg.setAttribute('phase', new THREE.BufferAttribute(ph, 1));
  const starMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uTime: { value: 0 }, uPR: { value: 1 } },
    vertexShader: `attribute float size; attribute float phase; attribute vec3 color; uniform float uTime; uniform float uPR;
      varying vec3 vC; varying float vA;
      void main(){ vC = color; vA = 0.55 + 0.45*sin(uTime*(0.6 + fract(phase)*1.8) + phase);
        vec4 mv = modelViewMatrix*vec4(position,1.0); gl_Position = projectionMatrix*mv; gl_Position.z = gl_Position.w*0.9999; gl_PointSize = size*uPR*(0.85+0.3*vA); }`,
    fragmentShader: `varying vec3 vC; varying float vA;
      void main(){ vec2 p = gl_PointCoord-0.5; float d = length(p);
        float core = smoothstep(0.5, 0.0, d); float cross = max(smoothstep(0.06,0.0,abs(p.x))*smoothstep(0.5,0.1,abs(p.y)), smoothstep(0.06,0.0,abs(p.y))*smoothstep(0.5,0.1,abs(p.x)));
        gl_FragColor = vec4(vC*(core*core + cross*0.35), (core + cross*0.3)*vA*0.72); }`,
  });
  const stars = new THREE.Points(sg, starMat); stars.frustumCulled = false; stars.renderOrder = -9;
  group.add(stars);

  // soft sun glow sprite
  const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d');
  const grd = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  grd.addColorStop(0, 'rgba(220,230,245,0.8)'); grd.addColorStop(0.12, 'rgba(180,202,235,0.5)'); grd.addColorStop(0.35, 'rgba(120,150,195,0.1)'); grd.addColorStop(1, 'rgba(90,120,170,0)');
  g.fillStyle = grd; g.fillRect(0, 0, 256, 256);
  const sunTex = new THREE.CanvasTexture(c); sunTex.colorSpace = THREE.SRGBColorSpace;
  const sun = new THREE.Sprite(new THREE.SpriteMaterial({ map: sunTex, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
  sun.scale.setScalar(35); sun.material.opacity = 0.18; sun.renderOrder = -8;
  group.add(sun);

  // Small, opaque worlds sit well behind the main planet; perspective sets their apparent size.
  const distantPlanets = createDistantPlanets(); group.add(distantPlanets);

  return {
    group,
    background: rt.texture,
    update(time, sunDir, pr) { if (!baked) { dome.material.uniforms.uSun.value.copy(sunDir); bake(); } starMat.uniforms.uTime.value = time; starMat.uniforms.uPR.value = pr; sun.position.copy(sunDir).multiplyScalar(280); },
  };
}

function createDistantPlanets() {
  const group = new THREE.Group(); group.name = 'distant-planets';
  const defs = [
    { position: [-43, 26, -100], radius: 1.6, color: 0xc9bce7, seed: 51 },
    { position: [48, 12, -125], radius: 2.0, color: 0xbce3d3, seed: 83 },
    { position: [-58, -16, -145], radius: 2.1, color: 0xf1c9bc, seed: 97 },
  ];
  for (const def of defs) {
    const geometry = new THREE.SphereGeometry(def.radius, 40, 24);
    const noise = createNoise3D(def.seed), p = geometry.attributes.position;
    const colors = new Float32Array(p.count * 3), base = new THREE.Color(def.color);
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i) / def.radius, y = p.getY(i) / def.radius, z = p.getZ(i) / def.radius;
      const broad = noise(x * 3, y * 3, z * 3);
      const detail = noise(x * 16, y * 16, z * 16);
      const shade = 0.90 + broad * 0.10 + detail * 0.035;
      base.clone().multiplyScalar(shade).toArray(colors, i * 3);
    }
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    const material = new THREE.ShaderMaterial({
      vertexColors: true,
      uniforms: { uLight: { value: new THREE.Vector3(-0.55, 0.66, 0.52).normalize() } },
      vertexShader: `varying vec3 vN; varying vec3 vColor;
        void main(){ vN = normalize(mat3(modelMatrix)*normal); vColor = color;
          gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
      fragmentShader: `uniform vec3 uLight; varying vec3 vN; varying vec3 vColor;
        void main(){ float light = smoothstep(-0.18, 0.85, dot(normalize(vN), uLight));
          gl_FragColor = vec4(vColor*(0.22 + 0.72*light), 1.0);
          #include <colorspace_fragment>
        }`,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = 'distant-planet-' + def.seed; mesh.position.fromArray(def.position);
    group.add(mesh);
  }
  return group;
}

// Two solid, puffy clouds drifting around the planet with flat bellies facing the ground.
export function createClouds() {
  const group = new THREE.Group(); group.name = 'clouds';
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, metalness: 0, emissive: 0xf3eeff, emissiveIntensity: 0.18, transparent: true, opacity: 1 });
  const clouds = [];
  const defs = [
    { axis: new THREE.Vector3(0.3, 1, 0.2).normalize(), start: 0.4, speed: 0.022, height: 4.4, scale: 1.0 },
    { axis: new THREE.Vector3(-0.6, 0.4, 0.7).normalize(), start: 2.9, speed: -0.016, height: 5.1, scale: 0.82 },
  ];
  for (const def of defs) {
    const parts = [];
    const puffs = [[0, 0.35, 0, 0.75], [0.75, 0.2, 0.1, 0.58], [-0.75, 0.18, -0.05, 0.6], [0.3, 0.62, -0.1, 0.55], [-0.35, 0.55, 0.15, 0.5], [1.3, 0.05, 0, 0.4], [-1.3, 0.02, 0.1, 0.42], [0.1, 0.15, 0.55, 0.5], [0.0, 0.12, -0.55, 0.48]];
    for (const [x, y, z, r] of puffs) {
      const g = new THREE.IcosahedronGeometry(r, 3); g.deleteAttribute('uv'); g.translate(x, y, z);
      const p = g.attributes.position; const col = new Float32Array(p.count * 3);
      for (let i = 0; i < p.count; i++) {
        let py = p.getY(i); if (py < 0) { p.setY(i, py * 0.25); py *= 0.25; } // flatten belly
        const t = Math.min(1, Math.max(0, (py + 0.1) / 1.1));
        col.set([0.83 + 0.17 * t, 0.84 + 0.16 * t, 0.97 + 0.03 * t], i * 3);
      }
      g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.computeVertexNormals();
      parts.push(g);
    }
    const mesh = new THREE.Mesh(mergeGeometries(parts), mat.clone());
    mesh.castShadow = true; mesh.scale.setScalar(def.scale * 1.05);
    const pivot = new THREE.Group(); pivot.add(mesh);
    // initial direction perpendicular to the orbit axis
    const ref = Math.abs(def.axis.y) < 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0);
    const dir0 = ref.sub(def.axis.clone().multiplyScalar(ref.dot(def.axis))).normalize();
    clouds.push({ mesh, pivot, def, dir0 });
    group.add(pivot);
  }
  const q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), w = new THREE.Vector3();
  return {
    group, clouds,
    update(time, camera) {
      for (const c of clouds) {
        q.setFromAxisAngle(c.def.axis, c.def.start + time * c.def.speed);
        const dir = c.dir0.clone().applyQuaternion(q);
        c.mesh.position.copy(dir).multiplyScalar(R + c.def.height + Math.sin(time * 0.5 + c.def.start) * 0.12);
        c.mesh.quaternion.setFromUnitVectors(up, dir);
        // fade a cloud that drifts between the camera and a close-up view
        c.mesh.getWorldPosition(w);
        const dist = w.distanceTo(camera.position);
        c.mesh.material.opacity = Math.min(1, Math.max(0.0, (dist - 2.5) / 3));
        c.mesh.visible = c.mesh.material.opacity > 0.02;
        c.mesh.material.depthWrite = c.mesh.material.opacity > 0.98;
      }
    },
  };
}