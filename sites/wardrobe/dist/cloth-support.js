import * as THREE from './vendor/three.module.js';

// The visible support and cloth contact use exactly the same local-space segments.
export function fittedSupport(field,profile){
  const shoulder=[];
  for(let i=0;i<=20;i++){
    const u=.24+i*.026,top=field.shoulder[Math.round(u*255)];
    let v=Math.max(top+.016/profile.height,.17+Math.abs(u-.5)*.28,profile.pinFloor||0);
    while(field.at(u,v)*profile.width/256<.016&&v<.5)v+=.003;
    shoulder.push(new THREE.Vector3((u-.5)*profile.width,-v*profile.height,0));
  }
  const left=shoulder[0],right=shoulder.at(-1),y=Math.min(left.y,right.y)-.024;
  const bar=[left,new THREE.Vector3(left.x+.012,y,0),new THREE.Vector3(right.x-.012,y,0),right];
  const stem=[new THREE.Vector3(0,-.112,0),shoulder[10]];
  const segments=[];
  for(const path of [shoulder,bar,stem])for(let i=1;i<path.length;i++)segments.push([path[i-1],path[i]]);
  const minY=Math.min(...segments.flatMap(s=>s.map(p=>p.y)))-.026,maxY=-.085,halfWidth=profile.width*.26+.026;
  return {shoulder,bar,stem,segments,minY,maxY,halfWidth,radius:.006,clearance:.006+profile.thickness*.5+.004};
}

export function supportDepth(x,y,support){
  if(y<support.minY||y>support.maxY||Math.abs(x)>support.halfWidth)return 0;
  let depth=0;
  for(const [a,b] of support.segments){
    const dx=b.x-a.x,dy=b.y-a.y,t=THREE.MathUtils.clamp(((x-a.x)*dx+(y-a.y)*dy)/(dx*dx+dy*dy),0,1);
    const distance=Math.hypot(x-a.x-dx*t,y-a.y-dy*t);
    // Broad contact envelope keeps interpolated triangles clear of the round tube.
    if(distance<.025)depth=Math.max(depth,support.clearance*Math.exp(-distance*distance/.00032));
  }
  return depth;
}

export function projectSupport(point,support,sign,rim=false){
  if(point.y<support.minY||point.y>support.maxY||Math.abs(point.x)>support.halfWidth)return false;
  let corrected=false;
  if(rim)for(const [a,b] of support.segments){
    const dx=b.x-a.x,dy=b.y-a.y,t=THREE.MathUtils.clamp(((point.x-a.x)*dx+(point.y-a.y)*dy)/(dx*dx+dy*dy),0,1);
    const x=point.x-a.x-dx*t,y=point.y-a.y-dy*t,distance=Math.hypot(x,y),limit=support.radius+.006;
    if(distance<limit){point.x+=x*(limit/distance-1);point.y+=y*(limit/distance-1);corrected=true;}
  }
  const depth=supportDepth(point.x,point.y,support);
  if(point.z*sign<depth){point.z=sign*depth;return true;}
  return corrected;
}
