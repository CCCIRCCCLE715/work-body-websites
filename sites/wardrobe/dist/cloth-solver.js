import * as THREE from './vendor/three.module.js';
import { garmentMotion } from './cloth-rail.js?v=huangbai-portfolio-1';
import { projectSupport } from './cloth-support.js?v=huangbai-portfolio-1';

export class AmmoCloth {
  constructor(ammo,settings){
    this.A=ammo;this.settings=settings;this.active=new Set();this.all=[];this.time=0;this.steps=0;
    const A=ammo,config=new A.btSoftBodyRigidBodyCollisionConfiguration(),dispatcher=new A.btCollisionDispatcher(config),broadphase=new A.btDbvtBroadphase(),solver=new A.btSequentialImpulseConstraintSolver(),softSolver=new A.btDefaultSoftBodySolver();
    this.world=new A.btSoftRigidDynamicsWorld(dispatcher,broadphase,solver,config,softSolver);
    const gravity=new A.btVector3(0,-settings.gravity,0);this.world.setGravity(gravity);this.world.getWorldInfo().set_m_gravity(gravity);this.helper=new A.btSoftBodyHelpers();this.vector=new THREE.Vector3();this.localVelocity=new THREE.Vector3();this.corrected=new THREE.Vector3();this.inverse=new THREE.Quaternion();this.delta=new THREE.Quaternion();this.follow=new THREE.Quaternion();
  }
  bind(g,template){
    const motion=garmentMotion(template.profile),scale=this.settings.motionScale??1;for(const key of ['x','y','z'])motion[key]*=scale;
    g.cloth={template,motion,quaternion:new THREE.Quaternion(),interactive:false,body:null,lastMoved:0,shakes:0,peak:0,speed:0};this.all.push(g);this.staticPose(g);return g.cloth;
  }
  staticPose(g){
    const c=g.cloth,positions=g.mesh.geometry.attributes.position.array,rest=c.template.rest,normals=g.mesh.geometry.attributes.normal.array,restNormals=c.template.geometry.attributes.normal.array;
    for(let i=0;i<positions.length;i+=3){this.vector.fromArray(rest,i).applyQuaternion(g.turn.quaternion).toArray(positions,i);this.vector.fromArray(restNormals,i).applyQuaternion(g.turn.quaternion).toArray(normals,i);}
    const pick=g.pick.geometry.attributes.position;for(let i=0;i<pick.array.length;i+=3)this.vector.fromArray(c.template.coarse,i).applyQuaternion(g.turn.quaternion).toArray(pick.array,i);pick.needsUpdate=true;
    c.quaternion.copy(g.turn.quaternion);g.mesh.geometry.attributes.position.needsUpdate=true;g.mesh.geometry.attributes.normal.needsUpdate=true;
  }
  createBody(g){
    const A=this.A,c=g.cloth,t=c.template,p=t.profile,positions=t.coarse.slice();
    for(let i=0;i<positions.length;i+=3)this.vector.fromArray(t.coarse,i).applyQuaternion(g.turn.quaternion).toArray(positions,i);
    // Bullet copies these arrays. Reuse native upload buffers for the page's lifetime;
    // this Ammo build's WebIDL array cache calls an unexported _free on its next use.
    if(!this.upload){
      const vertices=Math.max(...this.all.map(g=>g.cloth.template.coarse.length)),triangles=Math.max(...this.all.map(g=>g.cloth.template.triangles.length));
      this.upload={vertices:A._malloc(vertices*4),triangles:A._malloc(triangles*4)};
    }
    A.HEAPF32.set(positions,this.upload.vertices/4);A.HEAP32.set(t.triangles,this.upload.triangles/4);
    const body=this.helper.CreateFromTriMesh(this.world.getWorldInfo(),this.upload.vertices,this.upload.triangles,t.triangles.length/3,true),config=body.get_m_cfg();
    config.set_viterations(4);config.set_piterations(8);config.set_kDP(c.motion.damping);config.set_collisions(0);
    const stretch=body.get_m_materials().at(0);stretch.set_m_kLST(p.stretch);stretch.set_m_kAST(.25);
    const bending=body.appendMaterial();bending.set_m_kLST(c.motion.bending);bending.set_m_kAST(c.motion.bending);body.generateBendingConstraints(2,bending);
    body.setTotalMass(p.mass,false);for(const index of t.pins)body.setMass(index,0);body.setActivationState(4);
    const array=body.get_m_nodes(),count=array.size();c.nodes=Array.from({length:count},(_,i)=>array.at(i));c.positions=c.nodes.map(n=>n.get_m_x());c.previous=c.nodes.map(n=>n.get_m_q());c.velocities=c.nodes.map(n=>n.get_m_v());c.pinned=new Uint8Array(count);for(const i of t.pins)c.pinned[i]=1;
    c.sample=new Float32Array(count*3);c.flex=new Float32Array(count);c.wave=new Float32Array(count);c.sleeve=new Float32Array(count);
    for(let i=0;i<count;i++){const x=t.coarse[i*3],y=-t.coarse[i*3+1],sleeve=c.motion.structured?0:THREE.MathUtils.smoothstep(Math.abs(x)/p.width,.22,.40)*THREE.MathUtils.smoothstep(y,.20,.40);c.sleeve[i]=c.pinned[i]?0:sleeve;c.flex[i]=c.pinned[i]?0:Math.max(THREE.MathUtils.smoothstep(y,.24,.92),sleeve*.95);c.wave[i]=x*8+y*5;}
    c.phase=g.index*.73+g.rack*.51;c.body=body;c.quaternion.copy(g.turn.quaternion);this.wake(g);
  }
  retire(g){
    const c=g.cloth;this.world.removeSoftBody(c.body);this.active.delete(g);for(const v of c.velocities)v.setValue(0,0,0);c.retired=true;c.peak=0;this.staticPose(g);
  }
  wake(g){
    const c=g.cloth;
    if(!this.active.has(g)){
      if(this.active.size>=2)this.retire([...this.active].sort((a,b)=>a.cloth.lastMoved-b.cloth.lastMoved)[0]);
      if(c.retired){
        for(let i=0;i<c.nodes.length;i++){this.vector.fromArray(c.template.coarse,i*3).applyQuaternion(g.turn.quaternion);c.positions[i].setValue(this.vector.x,this.vector.y,this.vector.z);c.previous[i].setValue(this.vector.x,this.vector.y,this.vector.z);c.velocities[i].setValue(0,0,0);}
        c.quaternion.copy(g.turn.quaternion);c.retired=false;
      }
      this.world.addSoftBody(c.body,1,-1);this.active.add(g);
    }
    c.lastMoved=this.time;
  }
  pose(g,interactive){
    const c=g.cloth,changed=c.quaternion.angleTo(g.turn.quaternion)>.00008,entered=interactive&&!c.interactive;c.interactive=interactive;
    if(entered&&c.body)this.wake(g);
    if(!c.body){if(interactive)this.createBody(g);else if(changed)this.staticPose(g);}
    if(c.body&&!this.active.has(g)&&!interactive){if(changed)this.staticPose(g);return;}
    if(c.body&&changed){
      // Preserve a little local fabric inertia; the visible garment and hanger
      // already share the same immediate parent rotation on the UI thread.
      this.inverse.copy(c.quaternion).invert();this.delta.copy(g.turn.quaternion).multiply(this.inverse);
      for(let i=0;i<c.nodes.length;i++){
        const scale=this.settings.motionScale??1,follow=c.motion.structured?.94-c.flex[i]*.12*scale:.98-(c.flex[i]*.58+c.sleeve[i]*.16)*scale;
        this.follow.identity().slerp(this.delta,follow);
        for(const value of [c.positions[i],c.previous[i],c.velocities[i]]){this.vector.set(value.x(),value.y(),value.z()).applyQuaternion(this.follow);value.setValue(this.vector.x,this.vector.y,this.vector.z);}
      }
      this.wake(g);c.quaternion.copy(g.turn.quaternion);
    }
  }
  shake(g,strength=1,point=[0,-.65,0]){
    const c=g.cloth;if(!c.body)this.createBody(g);this.wake(g);c.shakes++;
    const kick=new THREE.Vector3();
    for(let i=0;i<c.nodes.length;i++){
      if(c.pinned[i])continue;
      const x=c.template.coarse[i*3]-point[0],y=c.template.coarse[i*3+1]-point[1],sleeve=c.sleeve[i],weight=c.flex[i]*(.42+.58*Math.exp(-x*x/.10-y*y/.20));
      kick.set(Math.sign(c.template.coarse[i*3])*.12*sleeve,.035,this.settings.impulse*c.motion.kick*(1+sleeve*.4)).applyQuaternion(g.turn.quaternion).multiplyScalar(strength*weight);
      const v=c.velocities[i];v.setValue(v.x()+kick.x,v.y()+kick.y,v.z()+kick.z);
    }

  }
  step(dt){
    this.time+=dt;if(!this.active.size)return false;
    for(const g of this.active){
      const c=g.cloth,air=this.settings.airflow*c.motion.wind*Math.exp(-(this.time-c.lastMoved)/1.35);
      this.vector.set(0,0,1).applyQuaternion(g.turn.quaternion);
      for(let i=0;i<c.nodes.length;i++){const force=air*c.flex[i]*(1+c.sleeve[i])*(Math.sin(this.time*3.4+c.wave[i]+c.phase)+.35*Math.sin(this.time*5.7-c.wave[i]))*dt,v=c.velocities[i];v.setValue(v.x()+this.vector.x*force,v.y()+this.vector.y*force,v.z()+this.vector.z*force);}
      for(const i of c.template.pins){this.vector.fromArray(c.template.coarse,i*3).applyQuaternion(g.turn.quaternion);c.positions[i].setValue(this.vector.x,this.vector.y,this.vector.z);c.previous[i].setValue(this.vector.x,this.vector.y,this.vector.z);c.velocities[i].setValue(0,0,0);}
    }
    this.world.stepSimulation(dt,2,1/60);this.steps++;
    for(const g of this.active){
      const c=g.cloth,t=c.template;c.speed=0;
      this.inverse.copy(g.turn.quaternion).invert();
      for(let i=0;i<c.nodes.length;i++){
        if(c.pinned[i])continue;
        const p=c.positions[i];this.vector.set(p.x(),p.y(),p.z()).applyQuaternion(this.inverse);
        // A hanging garment keeps its tailored width. Allow more motion normal to
        // the fabric than along it; an unconstrained closed shell can fold flat.
        const j=i*3,flex=c.flex[i],rx=t.coarse[j],ry=t.coarse[j+1],rz=t.coarse[j+2];
        const dx=this.vector.x-rx,dy=this.vector.y-ry,dz=this.vector.z-rz;
        const softness=Math.max(flex,c.sleeve[i]),limitX=.006+(c.motion.x-.006)*softness,limitY=.006+(c.motion.y-.006)*softness,limitZ=.006+(c.motion.z-.006)*softness;
        const x=THREE.MathUtils.clamp(dx,-limitX,limitX),y=THREE.MathUtils.clamp(dy,-limitY,limitY),z=THREE.MathUtils.clamp(dz,-limitZ,limitZ);
        const limited=x!==dx||y!==dy||z!==dz;
        this.vector.set(rx+x,ry+y,rz+z);
        const localVelocity=this.localVelocity.set(c.velocities[i].x(),c.velocities[i].y(),c.velocities[i].z()).applyQuaternion(this.inverse);
        localVelocity.x-=(this.vector.x-rx)*22*dt;localVelocity.y-=(this.vector.y-ry)*22*dt;localVelocity.z-=(this.vector.z-rz)*(c.motion.structured?14:c.motion.robe?3.8:6)*dt;
        // A gravity limit must not erase the tangent velocity that carries a
        // fabric wave. Only remove outward velocity on the constrained axis.
        if(x!==dx&&localVelocity.x*dx>0)localVelocity.x*=.1;
        if(y!==dy&&localVelocity.y*dy>0)localVelocity.y*=.1;
        if(z!==dz&&localVelocity.z*dz>0)localVelocity.z*=.1;
        localVelocity.applyQuaternion(g.turn.quaternion);c.velocities[i].setValue(localVelocity.x,localVelocity.y,localVelocity.z);
        const corrected=this.corrected.copy(this.vector);
        if(projectSupport(this.vector,t.support,Math.sign(t.coarse[i*3+2]),t.coarseRim[i])){
          this.vector.applyQuaternion(g.turn.quaternion);p.setValue(this.vector.x,this.vector.y,this.vector.z);c.previous[i].setValue(this.vector.x,this.vector.y,this.vector.z);
          const v=c.velocities[i];this.vector.set(v.x(),v.y(),v.z()).applyQuaternion(this.inverse);this.vector.z=0;this.vector.applyQuaternion(g.turn.quaternion);v.setValue(this.vector.x,this.vector.y,this.vector.z);
        }else if(limited){corrected.applyQuaternion(g.turn.quaternion);p.setValue(corrected.x,corrected.y,corrected.z);c.previous[i].setValue(corrected.x,corrected.y,corrected.z);}
      }
      for(let i=0;i<c.nodes.length;i++){const p=c.positions[i],v=c.velocities[i];c.sample[i*3]=p.x();c.sample[i*3+1]=p.y();c.sample[i*3+2]=p.z();c.speed=Math.max(c.speed,Math.abs(v.x()),Math.abs(v.y()),Math.abs(v.z()));}
      this.draw(g);const age=this.time-c.lastMoved;
      if((age>2.5&&c.speed<.018)||age>this.settings.settleSeconds)this.retire(g);
    }
    return this.active.size>0;
  }
  draw(g){
    const c=g.cloth,t=c.template,{vertices,weights,detail}=t.binding,positions=g.mesh.geometry.attributes.position.array;c.peak=0;this.inverse.copy(g.turn.quaternion).invert();
    for(let i=0;i<positions.length;i+=3){
      this.vector.fromArray(detail,i).applyQuaternion(g.turn.quaternion);
      const a=vertices[i]*3,b=vertices[i+1]*3,d=vertices[i+2]*3,w0=weights[i],w1=weights[i+1],w2=weights[i+2];
      positions[i]=c.sample[a]*w0+c.sample[b]*w1+c.sample[d]*w2+this.vector.x;
      positions[i+1]=c.sample[a+1]*w0+c.sample[b+1]*w1+c.sample[d+1]*w2+this.vector.y;
      positions[i+2]=c.sample[a+2]*w0+c.sample[b+2]*w1+c.sample[d+2]*w2+this.vector.z;
      this.vector.fromArray(positions,i).applyQuaternion(this.inverse);
      projectSupport(this.vector,t.support,Math.sign(t.rest[i+2]),t.renderRim[i/3]);
      this.vector.applyQuaternion(g.turn.quaternion).toArray(positions,i);
      this.vector.applyQuaternion(this.inverse);c.peak=Math.max(c.peak,Math.hypot(this.vector.x-t.rest[i],this.vector.y-t.rest[i+1],this.vector.z-t.rest[i+2]));
    }
    g.pick.geometry.attributes.position.array.set(c.sample);g.pick.geometry.attributes.position.needsUpdate=true;
    g.mesh.geometry.attributes.position.needsUpdate=true;g.mesh.geometry.computeVertexNormals();
  }
  get diagnostics(){return {engine:'Ammo.js / Bullet soft body',active:this.active.size,bodies:this.all.filter(g=>g.cloth.body).length,steps:this.steps,shakes:this.all.reduce((n,g)=>n+g.cloth.shakes,0)};}
}
