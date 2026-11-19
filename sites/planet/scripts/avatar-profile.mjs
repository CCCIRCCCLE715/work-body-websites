import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { MeshoptDecoder } from 'meshoptimizer';
await MeshoptDecoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder });
const doc = await io.read('public/models/tripo/avatar_daily.glb');
const N = 50; const sl = Array.from({length:N},()=>({minx:9,maxx:-9,minz:9,maxz:-9,n:0}));
for (const node of doc.getRoot().listNodes()) { const mesh=node.getMesh(); if(!mesh) continue; const m=node.getWorldMatrix();
 for (const p of mesh.listPrimitives()) { const pos=p.getAttribute('POSITION'); const v=[0,0,0];
  for (let i=0;i<pos.getCount();i++){ pos.getElement(i,v);
   const x=m[0]*v[0]+m[4]*v[1]+m[8]*v[2]+m[12], y=m[1]*v[0]+m[5]*v[1]+m[9]*v[2]+m[13], z=m[2]*v[0]+m[6]*v[1]+m[10]*v[2]+m[14];
   const k=Math.min(N-1,Math.max(0,Math.floor(y/0.98*N))); const s=sl[k]; s.n++;
   s.minx=Math.min(s.minx,x); s.maxx=Math.max(s.maxx,x); s.minz=Math.min(s.minz,z); s.maxz=Math.max(s.maxz,z);} } }
console.log(JSON.stringify(sl.map((s,k)=>[+(k*0.98/N).toFixed(3), +s.minx.toFixed(3), +s.maxx.toFixed(3), +s.minz.toFixed(3), +s.maxz.toFixed(3)])));
