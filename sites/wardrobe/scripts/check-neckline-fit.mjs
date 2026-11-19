import assert from 'node:assert/strict';
import fs from 'node:fs';
import zlib from 'node:zlib';
import * as THREE from '../dist/vendor/three.module.js';
const code=fs.readFileSync(new URL('../dist/cloth-neckline.js',import.meta.url),'utf8').replace("from 'three'",`from '${new URL('../dist/vendor/three.module.js',import.meta.url).href}'`);
const {openNeckline}=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
const meta=JSON.parse(fs.readFileSync(new URL('../dist/assets/cloth-baked/collection.json',import.meta.url))),buf=zlib.gunzipSync(fs.readFileSync(new URL('../dist/assets/cloth-baked/collection.bin.gz',import.meta.url))),results=[];
const ray=new THREE.Raycaster(),material=new THREE.MeshBasicMaterial({side:THREE.DoubleSide});
const surface=(geometry,x,y)=>{const mesh=new THREE.Mesh(geometry,material);mesh.updateMatrixWorld();ray.set(new THREE.Vector3(x,y,1),new THREE.Vector3(0,0,-1));return ray.intersectObject(mesh)[0]?.point.z;};
for(const [id,m] of Object.entries(meta)){
  const arrays={};for(const [key,a] of Object.entries(m.layout)){const Type={Float32Array,Uint16Array,Uint8Array}[a.type];arrays[key]=new Type(buf.buffer,buf.byteOffset+m.offset+a.offset,a.length).slice();}
  const geometry=new THREE.BufferGeometry();for(const [key,size] of [['position',3],['normal',3],['uv',2]])geometry.setAttribute(key,new THREE.BufferAttribute(arrays[key],size));geometry.setIndex(new THREE.BufferAttribute(arrays.index,1));for(const g of m.groups)geometry.addGroup(g.start,g.count,g.materialIndex);
  const before=surface(geometry,0,-.18),t={...m,geometry,rest:arrays.rest,coarse:arrays.coarse,triangles:arrays.triangles,renderRim:arrays.renderRim,binding:{vertices:arrays.vertices,weights:arrays.weights,detail:arrays.detail}},originalCoarse=t.coarse.slice();
  openNeckline(t,id);assert.deepEqual(t.coarse,originalCoarse,'Original shoulder pins and simulation topology must stay fixed');
  let maxBindingError=0;for(let i=0;i<t.rest.length;i+=3)for(let axis=0;axis<3;axis++){let p=t.binding.detail[i+axis];for(let k=0;k<3;k++)p+=t.coarse[t.binding.vertices[i+k]*3+axis]*t.binding.weights[i+k];maxBindingError=Math.max(maxBindingError,Math.abs(p-t.rest[i+axis]));}
  assert(maxBindingError<1e-6);assert(t.rest.every(Number.isFinite));assert(t.geometry.index.array.every(i=>i<t.rest.length/3));
  const after=surface(geometry,0,-.18);
  if(id==='designer'){assert(before>0,'Reproduce the original panel hiding the hanger');assert(after<0,'The neckline must expose the rear lining behind the hanger');assert(surface(geometry,.14,-.21)>0,'The shoulder must still cover the wooden arm');}
  results.push({id,before,after,addedVertices:t.rest.length/3-arrays.rest.length/3,triangleChange:(geometry.index.count-arrays.index.length)/3,maxBindingError});
}
console.log(JSON.stringify(results,null,2));
