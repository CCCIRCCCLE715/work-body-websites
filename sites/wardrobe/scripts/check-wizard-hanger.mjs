import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from '../dist/vendor/three.module.js';
const source=fs.readFileSync(new URL('../dist/store-hardware.js',import.meta.url),'utf8').replace("from 'three'",`from '${new URL('../dist/vendor/three.module.js',import.meta.url).href}'`);
const {woodenHanger,fitHangerSupport}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
const data=JSON.parse(fs.readFileSync(new URL('../dist/assets/cloth-baked/collection.json',import.meta.url))).wizard,support={...data.support};
for(const key of ['shoulder','bar','stem'])support[key]=support[key].map(p=>new THREE.Vector3(...p));
const fitted=fitHangerSupport(support,data.profile),hanger=woodenHanger(fitted);hanger.updateMatrixWorld(true);
assert.equal(fitted.bar,support.bar,'The lower support and cloth anchors remain fixed');
const ray=new THREE.Raycaster();
for(const x of [-.045,.045]){
 ray.set(new THREE.Vector3(x,-.218,1),new THREE.Vector3(0,0,-1));
 assert(ray.intersectObject(hanger,true).length>0,'The open hood needs a visible sloping wooden shoulder on both sides, not just a vertical stem');
}
console.log('Wizard hanger: both raised shoulder arms visible inside the open hood');
