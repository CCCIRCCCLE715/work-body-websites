import * as THREE from 'three';

// Shared materials and merged meshes keep the twelve hangers inexpensive.
export function joinHardware(parts){
  let vertices=0,indices=0;
  for(const g of parts){vertices+=g.attributes.position.count;indices+=g.index?.count||g.attributes.position.count;}
  const positions=new Float32Array(vertices*3),normals=new Float32Array(vertices*3),faces=new Uint32Array(indices);
  let vertex=0,face=0;
  for(const g of parts){
    positions.set(g.attributes.position.array,vertex*3);normals.set(g.attributes.normal.array,vertex*3);
    const count=g.index?.count||g.attributes.position.count;
    for(let i=0;i<count;i++)faces[face++]=vertex+(g.index?g.index.array[i]:i);
    vertex+=g.attributes.position.count;g.dispose();
  }
  const merged=new THREE.BufferGeometry();merged.setAttribute('position',new THREE.BufferAttribute(positions,3));merged.setAttribute('normal',new THREE.BufferAttribute(normals,3));merged.setIndex(new THREE.BufferAttribute(faces,1));return merged;
}

const steel=new THREE.MeshStandardMaterial({name:'Polished stainless steel',color:'#d1d5d8',metalness:1,roughness:.13,envMapIntensity:.95});
const hookSteel=new THREE.MeshStandardMaterial({name:'Chrome hanger hook',color:'#c7cbd0',metalness:1,roughness:.21,envMapIntensity:.9});
const recess=new THREE.MeshStandardMaterial({name:'Recessed screw slots',color:'#22282d',metalness:.65,roughness:.4});
const walnut=new THREE.MeshPhysicalMaterial({name:'Satin walnut hanger',color:'#633017',metalness:0,roughness:.43,clearcoat:.24,clearcoatRoughness:.38,envMapIntensity:.4});
walnut.onBeforeCompile=shader=>{
  shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vWood;').replace('#include <begin_vertex>','#include <begin_vertex>\nvWood=position;');
  shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 vWood;').replace('#include <color_fragment>',`#include <color_fragment>
    float neck=1.-smoothstep(.018,.045,abs(vWood.x));
    float along=mix(vWood.x,vWood.y,neck),across=mix(vWood.y,vWood.x,neck);
    float bend=sin(along*19.+sin(along*42.)*.35)*.7+sin(along*8.)*.45;
    float grain=sin(across*1350.+bend*3.8+sin(across*370.+along*23.)*.7);
    float pores=pow(.5+.5*sin(across*3500.+bend*5.),12.);
    float broad=sin(across*170.+bend*1.8);
    diffuseColor.rgb*=.86+grain*.075+broad*.13-pores*.07;
  `);
};
walnut.customProgramCacheKey=()=> 'walnut-grain-1';

function cylinder(a,b,r,segments=20){
  const d=b.clone().sub(a),g=new THREE.CylinderGeometry(r,r,d.length(),segments),q=new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),d.clone().normalize());g.applyQuaternion(q);g.translate(...a.clone().addScaledVector(d,.5).toArray());return g;
}
function roundedBlock(width,height,depth,radius){
  const x=width/2,y=height/2,r=radius,s=new THREE.Shape();
  s.moveTo(-x+r,-y);s.lineTo(x-r,-y);s.quadraticCurveTo(x,-y,x,-y+r);s.lineTo(x,y-r);s.quadraticCurveTo(x,y,x-r,y);s.lineTo(-x+r,y);s.quadraticCurveTo(-x,y,-x,y-r);s.lineTo(-x,-y+r);s.quadraticCurveTo(-x,-y,-x+r,-y);
  return new THREE.ExtrudeGeometry(s,{depth,bevelEnabled:true,bevelThickness:.0008,bevelSize:.0008,bevelSegments:2,steps:1,curveSegments:5}).translate(0,0,-depth/2);
}

export function fitHangerSupport(support,profile){
  if(profile.kind!=='wizard')return support;
  // The robe's low cloth pins must not flatten the rigid hanger into its hood.
  // Keep the sleeve anchors, while raising the wooden crown inside the neck.
  const span=Math.max(...support.shoulder.map(p=>Math.abs(p.x)));
  const shoulder=support.shoulder.map(p=>new THREE.Vector3(p.x,p.y+.105*(1-Math.abs(p.x)/span),p.z));
  const stem=[support.stem[0],shoulder[10]],segments=[];
  for(const path of [shoulder,support.bar,stem])for(let i=1;i<path.length;i++)segments.push([path[i-1],path[i]]);
  return {...support,shoulder,stem,segments};
}

export function woodenHanger(support){
  const parts=[],radius=support.radius;
  // The shoulders stay inside the original support envelope and cloth pins.
  const outline=new THREE.Shape(),points=support.shoulder;
  points.forEach((p,i)=>{if(i)outline.lineTo(p.x,p.y+radius*.5);else outline.moveTo(p.x,p.y+radius*.5)});
  for(const p of [...points].reverse())outline.lineTo(p.x,p.y-radius*.5);
  outline.closePath();
  parts.push(new THREE.ExtrudeGeometry(outline,{depth:.006,bevelEnabled:true,bevelThickness:.0007,bevelSize:.0007,bevelSegments:2,steps:1}).translate(0,0,-.003));
  for(let i=1;i<support.bar.length;i++)parts.push(cylinder(support.bar[i-1],support.bar[i],radius*.75,12));
  const neck=new THREE.Shape(),bottom=support.stem.at(-1).y;
  neck.moveTo(-.010,-.112);neck.quadraticCurveTo(-.013,-.14,-.016,bottom+.022);neck.lineTo(-.025,bottom+.002);neck.quadraticCurveTo(0,bottom-.007,.025,bottom+.002);neck.lineTo(.016,bottom+.022);neck.quadraticCurveTo(.013,-.14,.010,-.112);neck.closePath();
  parts.push(new THREE.ExtrudeGeometry(neck,{depth:.010,bevelEnabled:true,bevelSize:.0015,bevelThickness:.0015,bevelSegments:3,curveSegments:8,steps:1}).translate(0,0,-.005));
  const group=new THREE.Group();group.name='Walnut hanger';group.add(new THREE.Mesh(joinHardware(parts),walnut));return group;
}

export function chromeHook(){
  const points=[],radius=.0215,wire=.0045;
  // Crown and socket match the existing 16 mm rail and shared swivel exactly.
  for(let i=0;i<=58;i++){const t=(-110+i*5)*Math.PI/180;points.push(new THREE.Vector3(0,-.001+radius*Math.cos(t),radius*Math.sin(t)));}
  const path=new THREE.CurvePath();for(let i=1;i<points.length;i++)path.add(new THREE.LineCurve3(points[i-1],points[i]));path.add(new THREE.LineCurve3(points.at(-1),new THREE.Vector3(0,-.112,0)));
  const wireGeometry=new THREE.TubeGeometry(path,88,wire,12),socket=new THREE.CylinderGeometry(.007,.007,.009,16).translate(0,-.110,0);
  const hook=new THREE.Mesh(joinHardware([wireGeometry,socket]),hookSteel);hook.name='Chrome swivel hook';return hook;
}

export function wallMountedRail(width,height,wallDepth){
  const group=new THREE.Group(),parts=[],slots=[],half=width/2,r=.016;
  parts.push(cylinder(new THREE.Vector3(-half,height,0),new THREE.Vector3(half,height,0),r,32));
  for(const sign of [-1,1]){
    const x=sign*half;
    parts.push(roundedBlock(.074,.154,.010,.012).translate(x,height,wallDepth+.009));
    parts.push(cylinder(new THREE.Vector3(x,height,wallDepth+.019),new THREE.Vector3(x,height,-.004),.012,20));
    parts.push(cylinder(new THREE.Vector3(x-.037,height,0),new THREE.Vector3(x+.037,height,0),.023,24));
    for(const side of [-1,1]){
      const ring=new THREE.TorusGeometry(.0223,.0016,6,24).rotateY(Math.PI/2).translate(x+side*.037,height,0);parts.push(ring);
      const y=height+side*.053,z=wallDepth+.018;
      parts.push(new THREE.SphereGeometry(.006,16,8).scale(1,1,.33).translate(x,y,z));
      slots.push(new THREE.BoxGeometry(.0067,.0011,.0007).rotateZ(.65).translate(x,y,z+.002));
    }
    parts.push(cylinder(new THREE.Vector3(x+sign*.037,height,0),new THREE.Vector3(x+sign*.041,height,0),.020,24));
  }
  group.name='Wall-mounted chrome rail';group.add(new THREE.Mesh(joinHardware(parts),steel),new THREE.Mesh(joinHardware(slots),recess));return group;
}
