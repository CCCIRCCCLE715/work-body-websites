import * as THREE from 'three';

const weaves=new Map();
function cottonWeave(kind){
  if(weaves.has(kind))return weaves.get(kind);
  const size=128,pixels=new Uint8Array(size*size*4);
  const spacing={mesh:9,knit:7,rib:8,canvas:5,twill:4,poplin:3,jersey:5,fleece:4,brushed:4}[kind];
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    const warp=Math.cos(x*Math.PI*2/spacing),weft=Math.cos(y*Math.PI*2/spacing);
    let value=128+warp*18+weft*14;
    if(kind==='twill')value=128+Math.cos((x+y)*Math.PI*2/spacing)*28;
    if(kind==='rib'||kind==='knit')value=128+warp*32+Math.cos((y+Math.sin(x)*2)*Math.PI/spacing)*9;
    if(kind==='mesh')value=128-80*Math.max(0,warp)*Math.max(0,weft);
    if(kind==='fleece'||kind==='brushed')value=128+(((x*37+y*79+x*y*11)%29)/29-.5)*36;
    const i=(y*size+x)*4;pixels[i]=pixels[i+1]=pixels[i+2]=value;pixels[i+3]=255;
  }
  const map=new THREE.DataTexture(pixels,size,size);map.wrapS=map.wrapT=THREE.RepeatWrapping;map.repeat.set(8,12);map.generateMipmaps=true;map.minFilter=THREE.LinearMipmapLinearFilter;map.magFilter=THREE.LinearFilter;map.anisotropy=4;map.needsUpdate=true;weaves.set(kind,map);return map;
}
export function clothMaterials(texture,product,profile){
  const common={color:product.color,side:THREE.DoubleSide,envMap:null,reflectivity:0,envMapIntensity:0};
  const material=(zone,map)=>{
    const m=new THREE.MeshLambertMaterial({...common,map,bumpMap:cottonWeave(zone.weave),bumpScale:{mesh:.0008,rib:.0008,knit:.00065,canvas:.00052,twill:.0004,poplin:.00018,jersey:.00042,fleece:.00075,brushed:.00058}[zone.weave]});
    m.name=zone.name;m.userData.weave=zone.weave;return m;
  };
  const front=profile.fabricZones.map(z=>material(z,texture));
  // Geometry defines the openings. Opaque fabric stops semi-transparent atlas edges
  // from exposing the support through the cotton surface.
  const edge=new THREE.MeshLambertMaterial({...common,color:profile.base,bumpMap:cottonWeave('canvas'),bumpScale:.0003});edge.name='棉布缝边';
  return [...front,edge];
}

export { woodenHanger as garmentHanger, chromeHook as hangerHook } from './store-hardware.js?v=hood-hanger-1';
