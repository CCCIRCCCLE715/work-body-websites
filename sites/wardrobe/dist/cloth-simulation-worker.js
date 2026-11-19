// Bullet and fine-mesh reconstruction run outside the UI thread.
importScripts('./vendor/ammo.wasm.js');
const ready=Promise.all([Ammo({locateFile:name=>new URL('./vendor/'+name,self.location).href}),import('./cloth-solver.js?v=huangbai-portfolio-1'),import('./vendor/three.module.js')]);
let system,THREE;const garments=new Map(),dirty=new Set();
self.onmessage=async({data})=>{
  const [ammo,module,three]=await ready;THREE=three;
  if(data.type==='init'){
    system=new module.AmmoCloth(ammo,data.settings);
    for(const name of ['staticPose','draw']){const original=system[name].bind(system);system[name]=g=>{original(g);dirty.add(g);};}
    self.postMessage({type:'ready'});return;
  }
  if(data.type==='bind'){
    const t=data.template,geometry=new THREE.BufferGeometry();
    geometry.setAttribute('position',new THREE.BufferAttribute(t.rest.slice(),3));geometry.setAttribute('normal',new THREE.BufferAttribute(t.normals,3));geometry.setIndex(new THREE.BufferAttribute(t.index,1));t.geometry=geometry;
    for(const key of ['shoulder','bar','stem'])t.support[key]=t.support[key].map(v=>new THREE.Vector3(...v));t.support.segments=t.support.segments.map(s=>s.map(v=>new THREE.Vector3(...v)));
    const pick=new THREE.BufferGeometry();pick.setAttribute('position',new THREE.BufferAttribute(t.coarse.slice(),3));
    const g={id:data.id,index:data.id,rack:0,turn:{quaternion:new THREE.Quaternion(...data.quaternion)},mesh:{geometry:geometry.clone()},pick:{geometry:pick}};garments.set(data.id,g);system.bind(g,t);return;
  }
  if(data.type==='frame'){
    for(const pose of data.poses){const g=garments.get(pose.id);g.turn.quaternion.fromArray(pose.quaternion);system.pose(g,pose.interactive);}
    for(const kick of data.shakes)system.shake(garments.get(kick.id),kick.strength,kick.point);
    system.step(1/30);
    const vector=new THREE.Vector3();
    const updates=[...dirty].map(g=>{
      const inverse=g.turn.quaternion.clone().invert();
      const local=array=>{const out=array.slice();for(let i=0;i<out.length;i+=3)vector.fromArray(array,i).applyQuaternion(inverse).toArray(out,i);return out;};
      return {id:g.id,position:local(g.mesh.geometry.attributes.position.array),normal:local(g.mesh.geometry.attributes.normal.array),pick:local(g.pick.geometry.attributes.position.array),relax:!!g.cloth.retired,shakes:g.cloth.shakes,peak:g.cloth.peak,body:!!g.cloth.body};
    });dirty.clear();
    self.postMessage({type:'frame',updates,diagnostics:system.diagnostics},updates.flatMap(u=>[u.position.buffer,u.normal.buffer,u.pick.buffer]));
  }
};
