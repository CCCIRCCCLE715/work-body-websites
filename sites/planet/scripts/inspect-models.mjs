import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { MeshoptDecoder } from 'meshoptimizer';
import { readdirSync } from 'node:fs';
await MeshoptDecoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder });
const dir = 'public/models/tripo/';
const out = {};
for (const f of readdirSync(dir).filter(f => f.endsWith('.glb')).sort()) {
  const doc = await io.read(dir + f);
  const root = doc.getRoot();
  let min=[1e9,1e9,1e9], max=[-1e9,-1e9,-1e9], tris=0, prims=0;
  for (const scene of root.listScenes()) scene.traverse(node => {
    const mesh = node.getMesh(); if (!mesh) return;
    const m = node.getWorldMatrix();
    for (const p of mesh.listPrimitives()) {
      prims++;
      const pos = p.getAttribute('POSITION'); const idx = p.getIndices();
      tris += (idx ? idx.getCount() : pos.getCount())/3;
      const v=[0,0,0];
      for (let i=0;i<pos.getCount();i++){ pos.getElement(i,v);
        const x=m[0]*v[0]+m[4]*v[1]+m[8]*v[2]+m[12], y=m[1]*v[0]+m[5]*v[1]+m[9]*v[2]+m[13], z=m[2]*v[0]+m[6]*v[1]+m[10]*v[2]+m[14];
        const w=[x,y,z]; for(let k=0;k<3;k++){min[k]=Math.min(min[k],w[k]);max[k]=Math.max(max[k],w[k]);} }
    }
  });
  const tex = root.listTextures().map(t => { const s=t.getSize(); return (s?s.join('x'):'?')+':'+t.getMimeType(); });
  const mats = root.listMaterials().map(m => ({ name:m.getName(), base:m.getBaseColorFactor().map(x=>+x.toFixed(2)), metal:m.getMetallicFactor(), rough:m.getRoughnessFactor(), alpha:m.getAlphaMode(), ds:m.getDoubleSided(), ext: m.listExtensions().map(e=>e.extensionName) }));
  out[f] = { min:min.map(x=>+x.toFixed(3)), max:max.map(x=>+x.toFixed(3)), tris, prims, nodes: root.listNodes().length, tex, mats };
}
console.log(JSON.stringify(out, null, 1));
