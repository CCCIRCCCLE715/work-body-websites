import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

// Measured on the normalized case: lug inner faces x = ±0.470,
// pin region y = ±1.015, z = -0.235. End links follow the case radius.
export function createBracelet() {
  const object = new THREE.Group(), detail = new THREE.Group();
  const silver = new THREE.MeshStandardMaterial({color:0xa6acb0,metalness:1,roughness:.26,envMapIntensity:1.05});
  const polished = new THREE.MeshStandardMaterial({color:0xc3c7ca,metalness:1,roughness:.20,envMapIntensity:1.12});
  const sideOutline=new THREE.Shape();
  const edge=[[-.1445,-.099],[-.046,-.099],[-.046,-.062],[.046,-.062],[.046,-.099],[.1445,-.099],[.1445,.099],[.046,.099],[.046,.062],[-.046,.062],[-.046,.099],[-.1445,.099]];
  edge.forEach(([x,y],i)=>i?sideOutline.lineTo(x,y):sideOutline.moveTo(x,y));sideOutline.closePath();
  const sideGeo=new THREE.ExtrudeGeometry(sideOutline,{depth:.108,bevelEnabled:true,bevelThickness:.011,bevelSize:.006,bevelSegments:3,steps:1});sideGeo.translate(0,0,-.065);
  const crown = (geometry,height,rise) => {
    const positions=geometry.attributes.position,normals=geometry.attributes.normal;
    const normal=new THREE.Vector3();
    for(let i=0;i<positions.count;i++){
      const y=positions.getY(i),z=positions.getZ(i);
      // A shallow convex metal face gives a continuous highlight across a rigid link.
      positions.setZ(i,z+rise*Math.max(0,1-(y/(height*.5))**2));
      normal.fromBufferAttribute(normals,i);normal.y+=2*rise*y/(height*.5)**2*normal.z;normal.normalize();normals.setXYZ(i,normal.x,normal.y,normal.z);
    }
    return geometry;
  };
  const centerGeo = crown(new RoundedBoxGeometry(.304,.209,.148,6,.019),.209,.042);
  const outerFaceGeo=crown(new RoundedBoxGeometry(.289,.198,.13,6,.019),.198,.031);
  const makeLink = (materials=[silver,polished],underside=false) => {
    const link=new THREE.Group();
    const center=new THREE.Mesh(centerGeo,materials[1]);link.add(center);
    for(const sign of [-1,1]){
      const side=new THREE.Mesh(underside?sideGeo:outerFaceGeo,materials[0]);side.position.set(sign*.305,0,-.009);link.add(side);
    }
    return link;
  };
  // Short female end piece: the central pocket leaves room for a hinged
  // first centre link. Neither the pocket nor the joint is filled with a cap.
  const outline=new THREE.Shape();
  outline.moveTo(-.447,1.023);outline.lineTo(-.169,1.023);
  outline.lineTo(-.169,.959);outline.lineTo(.169,.959);
  outline.lineTo(.169,1.023);outline.lineTo(.447,1.023);
  for(let i=0;i<=40;i++){
    const x=.447-i/40*.894;outline.lineTo(x,Math.sqrt(.936**2-x*x)-.007);
  }
  outline.closePath();
  const endGeo=new THREE.ExtrudeGeometry(outline,{depth:.064,bevelEnabled:true,bevelSegments:3,steps:1,bevelSize:.006,bevelThickness:.007,curveSegments:40});
  // The outer edge slopes down towards the hinge instead of forming a flat bridge.
  const endVertices=endGeo.attributes.position;
  for(let i=0;i<endVertices.count;i++){
    const x=endVertices.getX(i),y=endVertices.getY(i);
    const inner=Math.sqrt(.936**2-Math.min(.45,Math.abs(x))**2)-.007;
    endVertices.setZ(i,endVertices.getZ(i)-.246-.025*Math.max(0,Math.min(1,(y-inner)/(1.023-inner))));
  }
  endGeo.computeVertexNormals();
  const pinGeo=new THREE.CylinderGeometry(.021,.021,.972,20);pinGeo.rotateZ(Math.PI/2);
  const barrelGeo=new THREE.CylinderGeometry(.043,.043,.302,28);barrelGeo.rotateZ(Math.PI/2);
  for(const sign of [-1,1]){
    const end=new THREE.Mesh(endGeo,silver);end.name=sign>0?'upper-end-piece':'lower-end-piece';end.rotation.z=sign<0?Math.PI:0;object.add(end);
    const pin=new THREE.Mesh(pinGeo,polished);pin.position.set(0,sign*1.011,-.247);object.add(pin);
    const barrel=new THREE.Mesh(barrelGeo,polished);barrel.position.copy(pin.position);object.add(barrel);
  }
  // A draped, slightly asymmetric loop. All link bodies stay rigid; adjacent
  // links share a pin position, and both case attachment points remain fixed.
  const guide=[[1.011,-.247],[1.17,-.447],[1.39,-.77],[1.44,-1.23],[.91,-1.94],[-.15,-2.12],[-1.15,-1.80],[-1.58,-1.16],[-1.32,-.63],[-1.16,-.438],[-1.011,-.247]].map(([y,z])=>new THREE.Vector3(0,y,z));
  const curve=new THREE.CatmullRomCurve3(guide,false,'centripetal');
  const totalLength=curve.getLength(),count=Math.round(totalLength/.211);
  const firstLength=.112,bodyLength=(totalLength-2*firstLength)/(count-2);
  const lengths=Array.from({length:count},(_,i)=>i===0||i===count-1?firstLength:bodyLength);
  let distance=0;const base=[curve.getPointAt(0)];
  for(const length of lengths){distance+=length;base.push(curve.getPointAt(Math.min(1,distance/totalLength)));}
  const joints=base.map(v=>v.clone());
  const links=[],pins=[];
  const connectorGeo=new RoundedBoxGeometry(.302,firstLength-.016,.109,4,.022);
  const axleGeo=new THREE.CylinderGeometry(.018,.018,.84,16);axleGeo.rotateZ(Math.PI/2);
  for(let i=0;i<count;i++){
    const connector=i===0||i===count-1;
    const link=connector?new THREE.Group():makeLink();
    if(connector)link.add(new THREE.Mesh(connectorGeo,polished));
    link.name=connector?'articulated-first-link':'bracelet-link';
    const taper=1-.11*Math.sin(Math.PI*(i+.5)/count)**2;
    link.scale.set(taper,connector?1:(bodyLength-.017)/.209,1);
    object.add(link);links.push(link);
    if(i>0){const pin=new THREE.Mesh(axleGeo,polished);pin.scale.x=taper;object.add(pin);pins.push({pin,index:i});}
  }
  const delta=new THREE.Vector3();let sagY=0,sagZ=0,lastSagY=Infinity,lastSagZ=Infinity;
  const poseLinks=(gravityY=-1,gravityZ=0,instant=false)=>{
    // Pose-driven articulation, deliberately without an idle oscillation.
    const blend=instant?1:.12;
    sagY+=(-.065+gravityY*.07-sagY)*blend;
    sagZ+=(gravityZ*.10-sagZ)*blend;
    if(Math.abs(sagY-lastSagY)+Math.abs(sagZ-lastSagZ)<.00001)return;
    lastSagY=sagY;lastSagZ=sagZ;
    for(let i=0;i<=count;i++){
      const t=i/count,weight=Math.sin(Math.PI*t)**2;
      joints[i].copy(base[i]);joints[i].y+=sagY*weight;joints[i].z+=sagZ*weight;
    }
    // Distance constraints keep every pin-to-pin length fixed. Case pins are
    // anchors, so allowing articulation cannot reopen the original large gap.
    for(let pass=0;pass<120;pass++){
      for(let step=0;step<count;step++){
        const i=pass%2?count-1-step:step,a=joints[i],b=joints[i+1];
        delta.subVectors(b,a);const distance=delta.length();if(distance<1e-8)continue;
        delta.multiplyScalar((distance-lengths[i])/distance);
        if(i===0)b.sub(delta);else if(i===count-1)a.add(delta);
        else{a.addScaledVector(delta,.5);b.addScaledVector(delta,-.5);}
      }
    }
    links.forEach((link,i)=>{
      link.position.copy(joints[i]).add(joints[i+1]).multiplyScalar(.5);
      delta.subVectors(joints[i+1],joints[i]);link.rotation.x=Math.atan2(delta.z,delta.y);
    });
    for(const {pin,index} of pins)pin.position.copy(joints[index]);
  };
  poseLinks();
  const detailLinks=[];
  for(let i=0;i<21;i++){
    const materials=[silver.clone(),polished.clone()],link=makeLink(materials,false);link.rotation.z=-Math.PI/2;detail.add(link);detailLinks.push({link,materials});
  }
  detail.scale.setScalar(3.45);detail.rotation.x=-.32;
  return {
    object,detail,count,rig:{joints,lengths},
    update({opacity,detailOpacity,spread,focus,gravityY=-1,gravityZ=0,instant=false}){
      object.visible=opacity>.005;
      if(object.visible)poseLinks(gravityY,gravityZ,instant);
      for(const m of [silver,polished]){m.opacity=opacity;m.transparent=opacity<.999;}
      detail.visible=detailOpacity>.005;
      detail.rotation.z=focus*Math.PI/2;
      detail.rotation.y=-focus*.36;
      detailLinks.forEach(({link,materials},i)=>{
        const alpha=detailOpacity*(i===10?1:1-focus);
        link.visible=alpha>.005;
        materials.forEach(m=>{m.opacity=alpha;m.transparent=alpha<.999;});
        link.position.set((i-10)*(.214+spread*.05+focus*.2),0,Math.sin((i-10)*.14)*.04);
        link.children[0].position.z=spread*.11;
        link.children[1].position.x=-.305-spread*.20;
        link.children[2].position.x=.305+spread*.20;
      });
    },
  };
}
