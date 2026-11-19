import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { MeshoptDecoder } from 'meshoptimizer';
await MeshoptDecoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder });
const doc = await io.read('public/models/tripo/survivor.glb');
const pts = [];
for (const node of doc.getRoot().listNodes()) { const mesh=node.getMesh(); if(!mesh) continue; const m=node.getWorldMatrix();
 for (const p of mesh.listPrimitives()) { const pos=p.getAttribute('POSITION'); const v=[0,0,0];
  for (let i=0;i<pos.getCount();i++){ pos.getElement(i,v); pts.push([m[0]*v[0]+m[4]*v[1]+m[8]*v[2]+m[12], m[1]*v[0]+m[5]*v[1]+m[9]*v[2]+m[13], m[2]*v[0]+m[6]*v[1]+m[10]*v[2]+m[14]]); } } }
for (let y = 0.1; y < 0.87; y += 0.05) {
  const s = pts.filter(p => p[1] >= y && p[1] < y + 0.05);
  // central band to avoid side props: x in [-0.15,0.15] -> front z
  const c = s.filter(p => Math.abs(p[0]) < 0.15);
  const zc = c.length ? Math.max(...c.map(p => p[2])) : NaN;
  const sideBand = s.filter(p => Math.abs(p[2]) < 0.15);
  console.log(y.toFixed(2), 'x', Math.min(...s.map(p=>p[0])).toFixed(3), Math.max(...s.map(p=>p[0])).toFixed(3), 'z', Math.min(...s.map(p=>p[2])).toFixed(3), Math.max(...s.map(p=>p[2])).toFixed(3), 'frontZ@centre', zc.toFixed(3), 'sideX@mid', sideBand.length ? Math.max(...sideBand.map(p=>p[0])).toFixed(3) + '/' + Math.min(...sideBand.map(p=>p[0])).toFixed(3) : '');
}
