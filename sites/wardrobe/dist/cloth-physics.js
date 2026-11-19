import * as THREE from 'three';

// The UI only uploads worker results and interpolates them on the GPU.
export class AmmoCloth {
  constructor(settings,onUpdate){
    this.all=[];this.settings=settings;this.onUpdate=onUpdate;this.busy=false;this.ready=false;this.lastRequest=0;this.changed=false;this.shakes=[];this.stats={engine:'Ammo.js / Bullet soft body · Web Worker',active:0,bodies:0,steps:0,shakes:0};
    this.worker=new Worker(new URL('./cloth-simulation-worker.js?v=huangbai-portfolio-1',import.meta.url));
    this.worker.onmessage=({data})=>{
      if(data.type==='ready'){this.ready=true;onUpdate();return;}
      this.busy=false;this.stats=data.diagnostics;
      for(const update of data.updates){
        const g=this.all[update.id],geometry=g.mesh.geometry,c=g.cloth;
        if(update.relax&&c.relaxing)continue;
        if(c.relaxing||update.relax){
          for(const [previous,current] of [['clothPrevious','position'],['clothPreviousNormal','normal']]){const from=geometry.attributes[previous].array,to=geometry.attributes[current].array;for(let i=0;i<from.length;i++)from[i]+=(to[i]-from[i])*c.blend.value;}
        }else{
          geometry.attributes.clothPrevious.array.set(geometry.attributes.position.array);
          geometry.attributes.clothPreviousNormal.array.set(geometry.attributes.normal.array);
        }
        geometry.attributes.clothPrevious.needsUpdate=true;
        geometry.attributes.clothPreviousNormal.needsUpdate=true;
        geometry.attributes.position.array.set(update.position);geometry.attributes.position.needsUpdate=true;
        geometry.attributes.normal.array.set(update.normal);geometry.attributes.normal.needsUpdate=true;
        g.pick.geometry.attributes.position.array.set(update.pick);g.pick.geometry.attributes.position.needsUpdate=true;
        c.received=performance.now();c.relaxing=update.relax;c.blendDuration=update.relax?(settings.motionScale<1?100:450):34;c.shakes=update.shakes;c.peak=update.peak;c.body=update.body;
      }
      onUpdate();
    };
    this.worker.onerror=e=>{throw new Error('Cloth worker: '+e.message);};
    this.worker.postMessage({type:'init',settings});
  }
  bind(g,t){
    // Rigid rotation belongs to the shared hanger parent. Only local cloth
    // deformation is interpolated, so worker latency cannot detach the shoulders.
    const geometry=g.mesh.geometry;
    geometry.attributes.position.array.set(t.rest);
    geometry.attributes.normal.array.set(t.geometry.attributes.normal.array);
    g.pick.geometry.attributes.position.array.set(t.coarse);
    geometry.setAttribute('clothPrevious',new THREE.BufferAttribute(geometry.attributes.position.array.slice(),3));geometry.setAttribute('clothPreviousNormal',new THREE.BufferAttribute(geometry.attributes.normal.array.slice(),3));
    const blend={value:1};g.cloth={template:t,id:this.all.length,quaternion:g.turn.quaternion.clone(),interactive:false,blend,blendDuration:34,relaxing:false,received:0,body:false,shakes:0,peak:0};this.all.push(g);
    for(const material of g.mesh.material){
      material.onBeforeCompile=shader=>{
        shader.uniforms.clothBlend=blend;
        shader.vertexShader='attribute vec3 clothPrevious;\nattribute vec3 clothPreviousNormal;\nuniform float clothBlend;\n'+shader.vertexShader;
        shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','vec3 transformed = mix(clothPrevious,position,clothBlend);');
        shader.vertexShader=shader.vertexShader.replace('#include <beginnormal_vertex>','vec3 objectNormal = normalize(mix(clothPreviousNormal,normal,clothBlend));\n#ifdef USE_TANGENT\nvec3 objectTangent = vec3(tangent.xyz);\n#endif');
      };
      material.customProgramCacheKey=()=> 'cloth-worker-blend-v1';
    }
    const support={...t.support};for(const key of ['shoulder','bar','stem'])support[key]=support[key].map(v=>v.toArray());support.segments=support.segments.map(s=>s.map(v=>v.toArray()));
    this.worker.postMessage({type:'bind',id:g.cloth.id,quaternion:g.turn.quaternion.toArray(),template:{profile:t.profile,rest:t.rest,coarse:t.coarse,triangles:t.triangles,pins:t.pins,binding:t.binding,renderRim:t.renderRim,coarseRim:t.coarseRim,support,normals:t.geometry.attributes.normal.array,index:t.geometry.index.array}});
    return g.cloth;
  }
  pose(g,interactive){const c=g.cloth;if(c.quaternion.angleTo(g.turn.quaternion)>.00008||interactive!==c.interactive){this.changed=true;c.quaternion.copy(g.turn.quaternion);c.interactive=interactive;}}
  shake(g,strength=1,point){this.shakes.push({id:g.cloth.id,strength,point:point?.toArray()});this.changed=true;this.onUpdate();}
  step(){
    const now=performance.now();let blending=false;
    for(const g of this.all){const c=g.cloth;c.blend.value=Math.min(1,(now-c.received)/c.blendDuration);if(c.blend.value<1)blending=true;}
    if(this.ready&&!this.busy&&now-this.lastRequest>=30&&(this.changed||this.shakes.length||this.stats.active)){
      this.lastRequest=now;this.busy=true;this.changed=false;
      this.worker.postMessage({type:'frame',poses:this.all.map(g=>({id:g.cloth.id,quaternion:g.turn.quaternion.toArray(),interactive:g.cloth.interactive})),shakes:this.shakes.splice(0)});
    }
    return this.busy||this.changed||this.shakes.length>0||this.stats.active>0||blending;
  }
  get diagnostics(){return {...this.stats,worker:true,maxActive:2};}
}
