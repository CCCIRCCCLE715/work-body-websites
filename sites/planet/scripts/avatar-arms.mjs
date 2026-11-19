import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { MeshoptDecoder } from 'meshoptimizer';
await MeshoptDecoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder });
const doc = await io.read('public/models/tripo/avatar_daily.glb');
const pts = [];
for (const node of doc.getRoot().listNodes()) { const mesh=node.getMesh(); if(!mesh) continue; const m=node.getWorldMatrix();
 for (const p of mesh.listPrimitives()) { const pos=p.getAttribute('POSITION'); const v=[0,0,0];
  for (let i=0;i<pos.getCount();i++){ pos.getElement(i,v);
   pts.push([m[0]*v[0]+m[4]*v[1]+m[8]*v[2]+m[12], m[1]*v[0]+m[5]*v[1]+m[9]*v[2]+m[13], m[2]*v[0]+m[6]*v[1]+m[10]*v[2]+m[14]]); } } }
// torso half-width per slice: x extent of points with |x| small gap analysis: histogram of x for left side
for (let y=0.28; y<0.62; y+=0.02) {
  const s = pts.filter(p => p[1]>=y && p[1]<y+0.02 && p[0] > 0);
  const xs = s.map(p=>p[0]).sort((a,b)=>a-b);
  // find largest gap in x (between torso and arm)
  let gap=0, gx=0; for (let i=1;i<xs.length;i++){ const g=xs[i]-xs[i-1]; if(g>gap){gap=g;gx=xs[i-1];} }
  const arm = s.filter(p=>p[0]>gx+gap/2);
  const ax = arm.length? arm.reduce((a,p)=>a+p[0],0)/arm.length:0, az = arm.length? arm.reduce((a,p)=>a+p[2],0)/arm.length:0;
  const ar = arm.length? Math.max(...arm.map(p=>Math.hypot(p[0]-ax,p[2]-az))):0;
  const torso = s.filter(p=>p[0]<=gx+1e-6);
  const tz = torso.length ? [Math.min(...torso.map(p=>p[2])), Math.max(...torso.map(p=>p[2]))] : [0,0];
  console.log(y.toFixed(2), 'gap', gap.toFixed(3), 'torsoMaxX', gx.toFixed(3), 'torsoZ', tz.map(v=>v.toFixed(3)).join('..'), 'arm', ax.toFixed(3), az.toFixed(3), ar.toFixed(3), 'maxX', xs.at(-1)?.toFixed(3));
}
