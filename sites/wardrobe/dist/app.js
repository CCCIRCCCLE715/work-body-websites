import * as THREE from 'three';
import { STORE } from './config.js?v=huangbai-portfolio-1';
import { WORKS } from './works.js?v=work-covers-2';
import { clothMaterials, garmentHanger, hangerHook } from './cloth-material.js?v=hood-hanger-1';
import { wallMountedRail, fitHangerSupport } from './store-hardware.js?v=hood-hanger-1';
import { AmmoCloth } from './cloth-physics.js?v=huangbai-portfolio-1';
import { openNeckline } from './cloth-neckline.js?v=neckline-1';
import { garmentEnvelope, garmentMotion, initializeRail, resolveRailActive, arrangeRail, GARMENT_TURN } from './cloth-rail.js?v=adjacent-switch-1';
window.moduleStarted = true;
const $ = s => document.querySelector(s);
const clamp = THREE.MathUtils.clamp;
const lerp = THREE.MathUtils.lerp;
const radians = THREE.MathUtils.degToRad;
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
const world = $('#world'), hero = $('#hero'), roomUI = $('#room-ui');
const pointer = new THREE.Vector2(0, 0), rayPointer = new THREE.Vector2(0, 0);
const layers = [...document.querySelectorAll('.layer')];
const cartKey = 'loops-archive-selection-v1';
const cart = JSON.parse(localStorage.getItem(cartKey) || '[]');
const state = { ready:false, progress:0, lead:0, committed:false, overview:true, rack:-1, yaw:0, yawLead:0, pitch:0, hover:null, selection:null, focus:null, drag:false, frame:0, frames:0 };
const springs = [],frameWork=[];
class Spring {
  constructor(value=0, stiffness=100, damping=19) {this.value=value;this.target=value;this.velocity=0;this.k=stiffness;this.c=damping;springs.push(this)}
  update(dt) {this.velocity+=(this.k*(this.target-this.value)-this.c*this.velocity)*dt;this.value+=this.velocity*dt;const active=Math.abs(this.velocity)>.00003||Math.abs(this.target-this.value)>.00003;if(!active){this.value=this.target;this.velocity=0}return active}
  set(v) {this.value=this.target=v;this.velocity=0}
}
const zoom = new Spring(0,70,16);
const gazeX = new Spring(0,12,6.2), gazeY = new Spring(0,12,6.2);
const heroX = new Spring(0,45,12.7), heroY = new Spring(0,45,12.7);
const parallax = STORE.motion.parallax.map(()=>({x:new Spring(0,90,18),y:new Spring(0,90,18)}));
const flightLead = new Spring(0,65,16), flight = new Spring(0,65,16);
const rackFocusX = new Spring(0,55,15),rackDistance=new Spring(2.6,55,15),rackFov=new Spring(45,55,15);
const tabL = new Spring(0,180,26), tabR = new Spring(453,110,21);
let renderer, scene, camera, lastTime=0, grainDirty=true, textures, envTarget, clothSystem, clothTemplates;
const racks=[], garments=[], hitTargets=[], rackButtons=[];
const heroPos=new THREE.Vector3(.67,1.6,.99), overviewPos=new THREE.Vector3(0,1.57,.75);
const flyPos=new THREE.Vector3(), viewPos=new THREE.Vector3(), lookPoint=new THREE.Vector3();
const tmpV=new THREE.Vector3(), tmpQ=new THREE.Quaternion(), raycaster=new THREE.Raycaster();
const stage = new THREE.Group();
let pointerOnWorld=false,hitTestPending=true,chosenProduct=null, downX=0, downY=0, downAt=0, lastDragX=0;
const loadingProgress = n => window.setLoading(n);

function applyContent(){
  document.documentElement.style.setProperty('--accent',STORE.accent);
  STORE.atmosphere.forEach((c,i)=>document.documentElement.style.setProperty('--tone-'+i,c));
  $('#brand-name').textContent=STORE.brand; $('h1 sup').textContent=STORE.suffix;
  $('#headline-a').textContent=STORE.headline[0];$('#headline-b').textContent=STORE.headline[1];
  document.querySelectorAll('.chips span').forEach((e,i)=>e.textContent=STORE.chips[i]);
  document.querySelectorAll('.notes span').forEach((e,i)=>e.textContent=STORE.notes[i]);
  $('#enter-link').firstChild.textContent=STORE.link+' ';
  const allOption=document.createElement('option');allOption.value='';allOption.textContent='全部十二件作品';$('#piece-select').append(allOption);
  STORE.products.forEach(p=>{const option=document.createElement('option');option.value=p.id;option.textContent=(p.gender==='men'?'M / ':'W / ')+p.role+' / '+p.name;$('#piece-select').append(option);});
  const ns='http://www.w3.org/2000/svg';const defs=document.querySelector('.filter-defs defs');
  STORE.products.forEach(p=>{const filter=document.createElementNS(ns,'filter');filter.id='tint-'+p.id;const transfer=document.createElementNS(ns,'feComponentTransfer');const color=new THREE.Color(p.color);['R','G','B'].forEach((channel,i)=>{const fn=document.createElementNS(ns,'feFunc'+channel);fn.setAttribute('type','linear');fn.setAttribute('slope',[color.r,color.g,color.b][i]);transfer.append(fn)});filter.append(transfer);defs.append(filter)});
}
// Interpolate the CSS atmosphere stops at equal perceptual lightness in OKLab.
function linearToLab(c){const l=Math.cbrt(.4122214708*c.r+.5363325363*c.g+.0514459929*c.b),m=Math.cbrt(.2119034982*c.r+.6806995451*c.g+.1073969566*c.b),s=Math.cbrt(.0883024619*c.r+.2817188376*c.g+.6299787005*c.b);return [.2104542553*l+.793617785*m-.0040720468*s,1.9779984951*l-2.428592205*m+.4505937099*s,.0259040371*l+.7827717662*m-.808675766*s]}
function labToLinear([L,a,b]){const l=(L+.3963377774*a+.2158037573*b)**3,m=(L-.1055613458*a-.0638541728*b)**3,s=(L-.0894841775*a-1.291485548*b)**3;return new THREE.Color().setRGB(4.0767416621*l-3.3077115913*m+.2309699292*s,-1.2684380046*l+2.6097574011*m-.3413193965*s,-.0041960863*l-.7034186147*m+1.707614701*s)}
let toneLabs;
function paletteAt(t){const a=toneLabs[0],b=toneLabs.at(-1);return labToLinear([lerp(a[0],b[0],t),lerp(a[1],b[1],t),lerp(a[2],b[2],t)])}
function buildPalette(){const css=getComputedStyle(document.documentElement);toneLabs=STORE.atmosphere.map((_,i)=>linearToLab(new THREE.Color(css.getPropertyValue('--tone-'+i).trim())));const data=new Float32Array(256*4);for(let i=0;i<256;i++){const c=paletteAt(i/255);data.set([c.r,c.g,c.b,1],i*4)}const tex=new THREE.DataTexture(data,256,1,THREE.RGBAFormat,THREE.FloatType);tex.magFilter=THREE.LinearFilter;tex.minFilter=THREE.LinearFilter;tex.needsUpdate=true;return tex}
function roomMaterial(lut,floor=false,side=0){return new THREE.ShaderMaterial({uniforms:{uMap:{value:lut},uFloor:{value:floor?1:0},uSide:{value:side},uSize:{value:STORE.room.size/2}},vertexShader:`varying vec3 vWorld;void main(){vWorld=(modelMatrix*vec4(position,1.)).xyz;gl_Position=projectionMatrix*viewMatrix*vec4(vWorld,1.);}`,fragmentShader:`uniform sampler2D uMap;uniform float uFloor,uSide,uSize;varying vec3 vWorld;
void main(){vec3 p=vWorld;float wall=clamp(1.-pow(max(p.y,0.)/2.95,.84),0.,1.);float corner=mix(uSize-min(abs(p.x),abs(p.z)),min(uSize-abs(p.x),uSize-abs(p.z)),uFloor);float crease=exp(-max(corner,0.)*4.2);float floorTone=.66+.30*pow(clamp(max(abs(p.x),abs(p.z))/uSize,0.,1.),2.);float t=mix(wall*.94-.045*exp(-p.y*9.)-.10*crease,floorTone-.08*crease,uFloor);t+=uSide*.035;vec3 c=texture2D(uMap,vec2(clamp(t,0.,1.),.5)).rgb;gl_FragColor=vec4(c,1.);
#include <colorspace_fragment>
}`})}
function makeEnvironment(){
  const w=512,h=256,data=new Float32Array(w*h*4);
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){
    const u=x/w,v=y/h;
    const ceiling=2.3*Math.exp(-(((v-.24)/.16)**2));
    const softbox=(6*Math.exp(-(((u-.18)/.036)**8))+3.8*Math.exp(-(((u-.68)/.09)**8)))*Math.exp(-(((v-.47)/.31)**8));
    const negativeFill=1.-.97*Math.exp(-(((v-.55)/.065)**8)),level=.018+(ceiling+softbox)*negativeFill;
    data.set([level*.98,level,level*1.015,1],(y*w+x)*4);
  }
  const tx=new THREE.DataTexture(data,w,h,THREE.RGBAFormat,THREE.FloatType);tx.mapping=THREE.EquirectangularReflectionMapping;tx.needsUpdate=true;
  const pm=new THREE.PMREMGenerator(renderer);envTarget=pm.fromEquirectangular(tx);scene.environment=envTarget.texture;tx.dispose();pm.dispose();
}
function lightCollection(){
  const lighting=STORE.lighting;
  scene.add(new THREE.HemisphereLight(lighting.sky,lighting.ground,lighting.ambient));
  for(const name of ['key','fill','rim']){
    const spec=lighting[name],light=new THREE.DirectionalLight(spec.color,spec.intensity);light.name=name;
    light.position.fromArray(spec.position);light.target.position.set(0,1.2,-STORE.room.size/2+STORE.room.rackInset);
    scene.add(light,light.target);
  }
}
function buildRoom(lut){
  const size=STORE.room.size,h=STORE.room.height;
  const floor=new THREE.Mesh(new THREE.PlaneGeometry(size,size),roomMaterial(lut,true));floor.rotation.x=-Math.PI/2;scene.add(floor);
  [[0,-size/2,0],[size/2,0,-Math.PI/2],[0,size/2,Math.PI],[-size/2,0,Math.PI/2]].forEach(([x,z,r],i)=>{const wall=new THREE.Mesh(new THREE.PlaneGeometry(size,h),roomMaterial(lut,false,[.3,-1,-.6,1][i]));wall.position.set(x,h/2,z);wall.rotation.y=r;scene.add(wall)});
  const ceiling=new THREE.Mesh(new THREE.PlaneGeometry(size,size),new THREE.MeshBasicMaterial({color:STORE.atmosphere[0]}));ceiling.rotation.x=Math.PI/2;ceiling.position.y=h;scene.add(ceiling);
  for(let i=0;i<1;i++){
    const group=new THREE.Group();const d=size/2-STORE.room.rackInset;group.position.set([0,d,0,-d][i],0,[-d,0,d,0][i]);group.rotation.y=[0,-Math.PI/2,Math.PI,Math.PI/2][i];scene.add(group);
    const rodY=STORE.room.rackHeight;
    group.add(wallMountedRail(STORE.room.rackWidth,rodY,-STORE.room.rackInset));
    // Soft wall contact shadows sit behind the garments.
    const shadowMat=new THREE.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{uOpacity:{value:.23}},vertexShader:`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,fragmentShader:`varying vec2 vUv;uniform float uOpacity;void main(){vec2 p=(vUv-.5)*2.;float s=exp(-p.x*p.x*2.-p.y*p.y*7.)*smoothstep(0.,.18,vUv.x)*smoothstep(0.,.18,1.-vUv.x)*smoothstep(0.,.18,vUv.y)*smoothstep(0.,.18,1.-vUv.y);gl_FragColor=vec4(.05,.07,.09,s*uOpacity);}`});
    const hit=new THREE.Mesh(new THREE.PlaneGeometry(STORE.room.rackWidth+.25,2),new THREE.MeshBasicMaterial({visible:false,side:THREE.DoubleSide}));hit.position.set(0,1,0);hit.userData.rack=i;group.add(hit);hitTargets.push(hit);
    const items=[];
    const rackProducts=STORE.products;
    rackProducts.forEach((product,j)=>{
      const pivot=new THREE.Group();pivot.position.set((j-(rackProducts.length-1)/2)*STORE.room.garmentSpacing,rodY,0);group.add(pivot);
      const template=clothTemplates[product.image],profile=template.profile;
      const mesh=new THREE.Mesh(template.geometry.clone(),clothMaterials(textures[product.frontTexture||product.image],product,profile));
      const pickGeometry=new THREE.BufferGeometry();pickGeometry.setAttribute('position',new THREE.BufferAttribute(template.coarse.slice(),3));pickGeometry.setIndex(new THREE.BufferAttribute(template.triangles,1));pickGeometry.boundingSphere=template.geometry.boundingSphere.clone();
      const pick=new THREE.Mesh(pickGeometry,new THREE.MeshBasicMaterial({side:THREE.DoubleSide}));pick.visible=false;
      const hook=hangerHook(),joint=new THREE.Group(),turn=new THREE.Group();joint.position.y=-.112;turn.position.y=.112;turn.add(garmentHanger(template.support),mesh,pick);joint.add(turn);pivot.add(hook,joint);
      const g={pivot,hook,joint,turn,mesh,pick,product,index:j,rack:i,x:pivot.position.x,motion:garmentMotion(profile),envelope:garmentEnvelope(template.rest,profile),railYaw:radians(STORE.cloth.restAngle),rotation:new Spring(radians(STORE.cloth.restAngle),GARMENT_TURN.stiffness/GARMENT_TURN.durationScale**2,GARMENT_TURN.damping/GARMENT_TURN.durationScale),swing:new Spring(0,12,2.8),hover:new Spring(0,100,20)};
      turn.rotation.y=radians(STORE.cloth.restAngle);mesh.userData.garment=g;pick.userData.garment=g;clothSystem.bind(g,template);items.push(g);garments.push(g);
      const wallShadow=new THREE.Mesh(new THREE.PlaneGeometry(.6,1.35),shadowMat.clone());wallShadow.position.set(pivot.position.x+.14,1.04,-.47);wallShadow.material.uniforms.uOpacity.value=.12;group.add(wallShadow);
    });
    initializeRail(items,STORE.room.rackWidth/2-.025);
    racks.push({group,items,label:'The collection'});
    
  }
}
async function loadTextures(){const loader=new THREE.TextureLoader();const urls=[...new Set(STORE.products.flatMap(p=>[p.image,p.frontTexture,p.backTexture].filter(Boolean)))];let done=0;const count=urls.length;const load=async path=>{const tx=await loader.loadAsync(path);tx.anisotropy=Math.min(renderer.capabilities.getMaxAnisotropy(),8);done++;loadingProgress(22+done/count*43);return tx};const results=await Promise.all([...urls.map(async url=>{const product=STORE.products.find(p=>p.image===url),tx=await load(product?.previewImage||url);tx.colorSpace=THREE.SRGBColorSpace;return [url,tx]})]);return Object.fromEntries(results)}
function resize(){const w=innerWidth,h=innerHeight;renderer.setPixelRatio(Math.min(devicePixelRatio,1.35,Math.sqrt(2200000/(w*h))));camera.aspect=w/h;camera.updateProjectionMatrix();renderer.setSize(w,h);const grain=$('#grain');grain.width=Math.ceil(w);grain.height=Math.ceil(h);grainDirty=true;if(racks.length){frameRail();if(!state.focus){rackDistance.target=racks[0].distance;rackFov.target=racks[0].fov;}}layoutTabs();wake()}
function layoutTabs(){const active=$('#tabs button[aria-selected=true]');if(!active)return;tabL.target=active.offsetLeft;tabR.target=active.offsetLeft+active.offsetWidth;wake()}
function frameRail(){
  const rack=racks[0],tan=Math.tan(radians(45)/2),ideal=Math.max((STORE.room.rackWidth+.2)/(2*tan*camera.aspect*.86),1.7/(2*tan*.82));
  rack.distance=Math.min(3.8,ideal);rack.fov=Math.max(45,THREE.MathUtils.radToDeg(2*Math.atan((STORE.room.rackWidth+.2)/(2*rack.distance*camera.aspect*.86))));
}
function setTab(name){document.querySelectorAll('#tabs button').forEach(b=>b.setAttribute('aria-selected',String(b.dataset.tab===name)));layoutTabs();if(name==='store')exit();else goRack(0);}
function enter(){if(!state.ready)return;goRack(0);}
function exit(){clearSelection();state.committed=false;state.lead=0;zoom.target=0;rackFocusX.target=0;rackDistance.target=racks[0].distance;rackFov.target=racks[0].fov;setHover(null);roomUI.inert=true;$('#back').classList.remove('visible');wake();}
function goRack(index){pointerOnWorld=false;clearSelection();$('#piece-select').value='';state.committed=true;state.lead=1;zoom.target=1;state.rack=0;state.overview=false;state.yaw=state.yawLead=0;rackFocusX.target=0;rackDistance.target=racks[0].distance;rackFov.target=racks[0].fov;if(reduced){rackFocusX.set(0);rackDistance.set(rackDistance.target);rackFov.set(rackFov.target);}flightLead.set(1);flight.set(1);$('#back').classList.add('visible');roomUI.classList.add('at-rack');$('#room-title').textContent='黄白的作品衣橱';document.querySelectorAll('#tabs button').forEach(b=>b.setAttribute('aria-selected',String(b.dataset.tab==='collection')));layoutTabs();wake();}
function goOverview(){goRack(0);}
let detailTimer;const detailLoads=new Map();
function ensureDetail(g){if(detailLoads.has(g.product.image))return;const job=new THREE.TextureLoader().loadAsync(g.product.image).then(tx=>{tx.colorSpace=THREE.SRGBColorSpace;tx.anisotropy=Math.min(renderer.capabilities.getMaxAnisotropy(),8);for(const m of g.mesh.material)if(m.map){m.map=tx;m.needsUpdate=true;}wake();});detailLoads.set(g.product.image,job);}
function setHover(g){if(state.hover===g)return;clearTimeout(detailTimer);if(g)detailTimer=setTimeout(()=>ensureDetail(g),180);if(state.hover)state.hover.swing.velocity+=reduced?.01:.10;state.hover=g;const cap=$('#caption');if(g)state.selection=g;cap.classList.toggle('visible',!!g||!!state.selection);if(g){$('#caption-name').textContent=g.product.role||g.product.name.toUpperCase();$('#piece-select').value=g.product.id;}wake()}
function focusPiece(id,{overview=false}={}){
  const g=garments.find(g=>g.product.id===(id==='island-utility'?'survivor':id));
  if(!g)return;
  ensureDetail(g);setTab('collection');setHover(null);state.focus=overview?null:g;state.selection=g;rackDistance.target=overview?racks[0].distance:Math.min(2.5,racks[0].distance);rackFov.target=overview?racks[0].fov:45;rackFocusX.target=overview?0:g.x;
  if(reduced){rackFocusX.set(rackFocusX.target);rackDistance.set(rackDistance.target);rackFov.set(rackFov.target);if(!overview)g.rotation.set(0);}
  $('#piece-select').value=g.product.id;$('#caption-name').textContent=g.product.role;
  $('#caption').classList.add('visible');wake();
}
function clearSelection(){state.focus=null;state.selection=null;setHover(null);$('#caption').classList.remove('visible');}
function pointRay(){raycaster.setFromCamera(rayPointer,camera)}
// A stationary pointer keeps its picked garment while the sleeve rotates away.
// Actual pointer movement resolves the next hit or releases the current anchor.
function hitTest(){if(!hitTestPending||!finePointer||!pointerOnWorld||state.progress<.98||state.drag||state.focus||document.querySelector('dialog[open]')||$('#caption').matches(':hover'))return;hitTestPending=false;pointRay();if(state.rack>=0){const meshes=racks[state.rack].items.map(g=>g.pick);const hits=raycaster.intersectObjects(meshes);setHover(hits[0]?.object.userData.garment||null)}else{const hits=raycaster.intersectObjects(hitTargets);world.style.cursor=hits.length?'pointer':'grab'}}
function updateCamera(){
  const p=zoom.value,p2=p*p,f=flight.value;
  state.progress=p;
  const hx=reduced?0:heroX.value,hy=reduced?0:heroY.value;
  const hpos=heroPos.clone().add(new THREE.Vector3(hx*.36,-hy*.18,0));
  // Keep the 14m anchor fixed while the hero camera translates.
  const heroYaw=radians(34),heroPitch=radians(-2.2);
  const anchor=heroPos.clone().add(new THREE.Vector3(-Math.sin(heroYaw)*14,Math.sin(heroPitch)*14,-Math.cos(heroYaw)*14));
  tmpV.copy(anchor).sub(hpos).normalize();const heroQuat=new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().lookAt(hpos,anchor,new THREE.Vector3(0,1,0)));
  const roomYaw=state.yaw+gazeX.value,roomPitch=gazeY.value;
  const roomQuat=new THREE.Quaternion().setFromEuler(new THREE.Euler(roomPitch,roomYaw,0,'YXZ'));
  viewPos.copy(overviewPos);
  if(state.rack>=0||f>.001){if(state.rack>=0){const r=racks[state.rack];flyPos.set(rackFocusX.value,1.28,rackDistance.value).applyMatrix4(r.group.matrixWorld);}viewPos.lerp(flyPos,f);if(state.rack>=0){const r=racks[state.rack];const target=r.group.localToWorld(new THREE.Vector3(rackFocusX.value,1.22,0));const rackQuat=new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().lookAt(flyPos,target,new THREE.Vector3(0,1,0)));roomQuat.slerp(rackQuat,f)}}
  camera.position.copy(hpos).lerp(viewPos,p2);camera.quaternion.copy(heroQuat).slerp(roomQuat,p2);camera.fov=lerp(55,rackFov.value,p2);camera.updateProjectionMatrix();camera.updateMatrixWorld();
  const clear=clamp(p/.85,0,1);world.style.filter=reduced||clear>=1?'none':`blur(${STORE.motion.heroBlur*(1-clear)}px)`;world.style.transform=`scale(${lerp(1.03,1,clear)})`;
  layers.forEach((layer,i)=>{const near=[.2,.35,.65,.5,.1][i];const out=clamp((p-.08)/(1-near*.35),0,1);const scale=reduced?1:1+p*2.6;const x=reduced?0:parallax[i].x.value,y=reduced?0:parallax[i].y.value;layer.style.transform=`translate3d(${x}px,${y}px,0) scale(${scale})`;layer.style.filter=reduced?'none':`blur(${Math.pow(out,2)*12}px)`;layer.style.opacity=1-clamp((out-.2)/.65,0,1)});
  hero.style.opacity=p>.995?'0':'1';hero.style.visibility=p>.995?'hidden':'visible';hero.inert=p>.3;hero.setAttribute('aria-hidden',String(p>.98));$('#hero-foot').inert=p>.1;hero.style.pointerEvents=p>.3?'none':'';$('#hero-foot').style.opacity=1-clamp(p*2,0,1);$('#hero-foot').style.pointerEvents=p>.1?'none':'';
  roomUI.classList.toggle('visible',p>.7);roomUI.inert=p<.98;$('#compass').style.setProperty('--heading',(-state.yaw*180/Math.PI)+'deg');
  rackButtons.forEach((b,i)=>{if(p<.98||state.rack>=0){b.hidden=true;return}const pos=racks[i].group.localToWorld(new THREE.Vector3(0,.31,.15));const dir=pos.clone().sub(camera.position);const facing=dir.dot(camera.getWorldDirection(tmpV));pos.project(camera);b.hidden=facing<0||Math.abs(pos.x)>.92||Math.abs(pos.y)>.9;if(!b.hidden){b.style.left=(pos.x*.5+.5)*innerWidth+'px';b.style.top=(-pos.y*.5+.5)*innerHeight+'px'}});
}
const noiseTile=document.createElement('canvas');noiseTile.width=noiseTile.height=128;
const noiseContext=noiseTile.getContext('2d');const noisePixels=noiseContext.createImageData(128,128);
function drawGrain(now){if(!grainDirty)return;grainDirty=false;const canvas=$('#grain'),ctx=canvas.getContext('2d');const a=noisePixels.data;for(let i=0;i<a.length;i+=4){const n=128+(Math.random()+Math.random()+Math.random()-1.5)*33;a[i]=a[i+1]=a[i+2]=n;a[i+3]=255}noiseContext.putImageData(noisePixels,0,0);ctx.fillStyle=ctx.createPattern(noiseTile,'repeat');ctx.fillRect(0,0,canvas.width,canvas.height)}

function updateGarments(dt){
  const requested=state.hover||state.focus;
  const active=resolveRailActive(racks[0].items,requested,STORE.room.rackWidth/2-.025,radians(STORE.cloth.hoverAngle));
  for(const g of garments){
    const hovered=g===active;
    let yaw=radians(STORE.cloth.restAngle);
    if(hovered){
      const center=g.pivot.localToWorld(new THREE.Vector3(0,-.66,0)).project(camera),edge=g.pivot.localToWorld(new THREE.Vector3(.46,-.66,0)).project(camera);
      const relative=clamp((pointer.x-center.x)/Math.max(.05,Math.abs(edge.x-center.x)),-1,1);
      yaw=state.focus===g?0:relative*radians(STORE.cloth.hoverAngle)*(reduced?.55:1);
    }
    g.rotation.target=yaw;g.hover.target=hovered?1:0;
  }
  let railMoving=false;
  for(const rack of racks)if(arrangeRail(rack.items,active,STORE.room.rackWidth/2-.025,dt))railMoving=true;
  for(const g of garments){
    const delta=g.railYaw-g.turn.rotation.y;
    g.swing.velocity+=delta*(reduced?.03:.30);
    const swingLimit=g.motion.swing*(reduced?.22:1);
    if(Math.abs(g.swing.value)>swingLimit){g.swing.value=clamp(g.swing.value,-swingLimit,swingLimit);if(g.swing.velocity*g.swing.value>0)g.swing.velocity*=.15;}
    g.turn.rotation.y=g.railYaw;
    g.joint.quaternion.setFromAxisAngle(tmpV.set(Math.sin(g.railYaw),0,Math.cos(g.railYaw)),g.swing.value);
    clothSystem.pose(g,g===state.hover||g===state.focus);
  }
  if(state.focus)rackFocusX.target=state.focus.pivot.position.x;
  const selected=requested||state.selection;
  if(selected){
    const pos=selected.pivot.localToWorld(new THREE.Vector3(0,-selected.cloth.template.profile.height-.07,.15)).project(camera),cap=$('#caption');
    cap.style.left=clamp((pos.x*.5+.5)*innerWidth,135,innerWidth-135)+'px';cap.style.top=clamp((-pos.y*.5+.5)*innerHeight,150,innerHeight-125)+'px';
  }
  if(state.rack>=0)world.style.cursor=active?'grab':'default';
  return railMoving;
}
function render(now){const workStart=performance.now();state.frame=0;const dt=Math.min((now-lastTime)/1000||1/60,1/30);lastTime=now;let active=false;
  if(state.ready&&state.progress>.98&&state.rack<0&&!state.drag&&!document.querySelector('dialog[open]')&&finePointer&&Math.abs(pointer.x)>.75){const speed=Math.sign(pointer.x)*((Math.abs(pointer.x)-.75)/.25)**1.6*radians(STORE.motion.maxEdgeTurn);state.yawLead-=speed*dt;active=true}
  state.yaw=lerp(state.yaw,state.yawLead,1-Math.exp(-dt*8));if(Math.abs(state.yaw-state.yawLead)>.00003)active=true;
  zoom.target=state.lead;flight.target=flightLead.value;
  if(reduced){zoom.set(state.lead);flightLead.set(flightLead.target);flight.set(flightLead.value)}
  for(const spring of springs)if(spring.update(dt))active=true;
  updateCamera();if(updateGarments(dt))active=true;if(clothSystem.step(dt))active=true;
  $('#tab-ink').style.transform=`translateX(${tabL.value}px) scaleX(${Math.max(1,tabR.value-tabL.value)/453})`;$('#tab-ink').style.transformOrigin='left';
  renderer.render(scene,camera);state.frames++;drawGrain(now);hitTest();frameWork.push(performance.now()-workStart);if(frameWork.length>180)frameWork.shift();
  if(active)wake();
}
function wake(){if(!renderer||state.frame||document.hidden)return;state.frame=requestAnimationFrame(render)}
function openProduct(g){
  const p=g.product,work=WORKS[p.id];chosenProduct=p;
  $('#product-index').textContent=String(STORE.products.indexOf(p)+1).padStart(2,'0');
  $('#product-role').textContent=p.role+' / HUANGBAI';$('#product-name').textContent=work.title;
  $('#product-garment').textContent=p.name+' / '+p.category;
  $('#product-description').textContent=p.description+' '+p.fabrics;
  const previous=$('#product-img'),img=new Image();img.id='product-img';
  img.alt=work.cover?work.title+' · 视频封面':p.role+' / '+p.name;img.style.visibility='hidden';
  img.onload=()=>{img.style.visibility='visible'};
  img.src=work.cover||p.frontTexture||p.image;img.style.filter=work.cover?'none':'url(#tint-'+p.id+')';
  previous.parentElement.classList.toggle('has-cover',!!work.cover);previous.replaceWith(img);
  $('#watch-video').href=work.url;$('#product-dialog').showModal();$('#product-dialog').scrollTop=0;setHover(null);
}
function updateCart(){
  localStorage.setItem(cartKey,JSON.stringify(cart));$('#cart-count').textContent=cart.length?'('+cart.length+')':'';
  const target=$('#cart-items');target.replaceChildren();
  if(!cart.length){const p=document.createElement('p');p.className='cart-empty';p.textContent='还没有收藏作品。\n去衣橱里看看吧。';target.append(p)}
  cart.forEach((item,i)=>{
    const p=STORE.products.find(p=>p.id===item.id);if(!p)return;const work=WORKS[p.id];
    const row=document.createElement('div');row.className='cart-row';const img=document.createElement('img');
    img.src=work.cover||p.frontTexture||p.image;img.alt=work.title;img.loading='lazy';img.style.filter=work.cover?'none':'url(#tint-'+p.id+')';
    const detail=document.createElement('div');const name=document.createElement('a');name.textContent=work.title;name.href=work.url;name.target='_blank';name.rel='noopener noreferrer';
    const meta=document.createElement('small');meta.textContent=p.role+' · 观看视频 ↗';detail.append(name,meta);
    const remove=document.createElement('button');remove.textContent='移除';remove.setAttribute('aria-label','移除收藏：'+work.title);remove.onclick=()=>{cart.splice(i,1);updateCart()};row.append(img,detail,remove);target.append(row)
  });
}
function bindEvents(){
  window.addEventListener('resize',resize);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden){lastTime=performance.now();wake()}});
  window.addEventListener('pointermove',e=>{hitTestPending=true;pointerOnWorld=e.target===renderer.domElement&&e.pointerType!=='touch';if(!pointerOnWorld)setHover(null);if(e.target===renderer.domElement)state.focus=null;pointer.set(e.clientX/innerWidth*2-1,e.clientY/innerHeight*2-1);rayPointer.set(pointer.x,-pointer.y);heroX.target=pointer.x;heroY.target=pointer.y;parallax.forEach((p,i)=>{p.x.target=-pointer.x*STORE.motion.parallax[i];p.y.target=-pointer.y*STORE.motion.parallax[i]});if(state.drag){if(Math.hypot(e.clientX-downX,e.clientY-downY)>5&&state.rack<0)state.yawLead-=(e.clientX-lastDragX)*.004;lastDragX=e.clientX}else{gazeX.target=state.rack<0?-pointer.x*radians(20):0;gazeY.target=state.rack<0?-pointer.y*radians(6):0}wake()});
  window.addEventListener('pointerleave',()=>{pointerOnWorld=false;pointer.set(0,0);heroX.target=heroY.target=gazeX.target=gazeY.target=0;parallax.forEach(p=>p.x.target=p.y.target=0);setHover(null);wake()});
  world.addEventListener('pointerdown',e=>{state.focus=null;pointer.set(e.clientX/innerWidth*2-1,e.clientY/innerHeight*2-1);rayPointer.set(pointer.x,-pointer.y);if(state.progress>.98&&state.rack>=0){pointRay();const hit=raycaster.intersectObjects(racks[state.rack].items.map(g=>g.pick))[0];if(hit)setHover(hit.object.userData.garment);}state.drag=true;downX=lastDragX=e.clientX;downY=e.clientY;downAt=performance.now();world.setPointerCapture(e.pointerId);wake()});
  world.addEventListener('pointerup',e=>{const distance=Math.hypot(e.clientX-downX,e.clientY-downY);state.drag=false;if(state.progress<.98){if(e.pointerType==='touch'&&downY-e.clientY>35)enter();return}if(distance<6&&performance.now()-downAt<700){pointRay();if(state.rack>=0){const hit=raycaster.intersectObjects(racks[state.rack].items.map(g=>g.pick))[0];if(hit){const g=hit.object.userData.garment;setHover(g);clothSystem.shake(g,reduced?.4:1,g.turn.worldToLocal(hit.point.clone()));g.swing.velocity+=reduced?.025:g.motion.structured?.30:.18;openProduct(g);}}else{const hit=raycaster.intersectObjects(hitTargets)[0];if(hit)goRack(hit.object.userData.rack)}}wake()});
  world.addEventListener('pointercancel',()=>{state.drag=false;wake()});
  window.addEventListener('wheel',e=>{if(document.querySelector('dialog[open]')||!state.ready)return;e.preventDefault();const delta=e.deltaY*(e.deltaMode===1?18:e.deltaMode===2?innerHeight:1);if(state.progress<.995||state.lead<1){if(state.committed)return;state.lead=clamp(state.lead+delta/(innerHeight*STORE.motion.scrollScreens),0,1);if(state.lead>=STORE.motion.commitAt)goRack(0)}else if(state.rack<0)state.yawLead+=(delta+e.deltaX)*.0015;wake()},{passive:false});
  document.addEventListener('keydown',e=>{if(document.querySelector('dialog[open]'))return;if(e.key==='Escape'){exit();return}if(e.target.closest('button,select'))return;if(['ArrowDown','PageDown',' '].includes(e.key)){e.preventDefault();enter()}if(state.progress>.98&&['ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();state.yawLead+=e.key==='ArrowLeft'?.35:-.35;wake()}});
  $('#view-piece').onclick=()=>{const g=state.hover||state.selection;if(g)openProduct(g);};
  $('#piece-select').onchange=e=>{if(e.target.value)focusPiece(e.target.value);else goRack(0);};
  $('#logo').onclick=exit;$('#enter-button').onclick=enter;$('#enter-link').onclick=enter;$('#back').onclick=exit;
  document.querySelectorAll('#tabs button').forEach(b=>b.onclick=()=>setTab(b.dataset.tab));
  $('#menu-button').onclick=()=>$('#menu-dialog').showModal();$('#cart-button').onclick=()=>{updateCart();$('#cart-dialog').showModal()};
  document.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>{b.closest('dialog').close();wake()});
  document.querySelectorAll('dialog').forEach(d=>{d.addEventListener('close',()=>{pointer.set(0,0);wake()});d.addEventListener('click',e=>{if(e.target===d){const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)d.close()}})});
  document.querySelectorAll('[data-collection]').forEach(b=>b.onclick=()=>{b.closest('dialog').close();goRack(0)});
  $('#add-cart').onclick=()=>{if(!cart.some(item=>item.id===chosenProduct.id))cart.push({id:chosenProduct.id});updateCart();$('#product-dialog').close();$('#cart-dialog').showModal()};
  $('#continue-shopping').onclick=()=>{$('#cart-dialog').close();enter()};updateCart();
}
async function loadClothTemplates(){
  const [metadata,buffer]=await Promise.all([fetch('assets/cloth-baked/collection.json?v=huangbai-portfolio-1').then(r=>r.json()),fetch('assets/cloth-baked/collection.bin.gz?v=huangbai-portfolio-1').then(r=>new Response(r.body.pipeThrough(new DecompressionStream('gzip'))).arrayBuffer())]);
  const types={Float32Array,Uint16Array,Uint8Array},templates={};
  for(const product of STORE.products){
    const t=metadata[product.id],arrays={};
    for(const [key,a] of Object.entries(t.layout))arrays[key]=new types[a.type](buffer,t.offset+a.offset,a.length);
    const geometry=new THREE.BufferGeometry();for(const [key,size] of [['position',3],['normal',3],['uv',2]])geometry.setAttribute(key,new THREE.BufferAttribute(arrays[key],size));
    geometry.setIndex(new THREE.BufferAttribute(arrays.index,1));for(const g of t.groups)geometry.addGroup(g.start,g.count,g.materialIndex);geometry.boundingSphere=new THREE.Sphere(new THREE.Vector3(0,-.62,0),.91);
    for(const key of ['shoulder','bar','stem'])t.support[key]=t.support[key].map(v=>new THREE.Vector3(...v));t.support.segments=t.support.segments.map(s=>s.map(v=>new THREE.Vector3(...v)));
    t.support=fitHangerSupport(t.support,t.profile);
    templates[product.image]={...t,geometry,rest:arrays.rest,coarse:arrays.coarse,triangles:arrays.triangles,renderRim:arrays.renderRim,coarseRim:arrays.coarseRim,binding:{vertices:arrays.vertices,weights:arrays.weights,detail:arrays.detail}};
    openNeckline(templates[product.image],product.id);
  }
  loadingProgress(78);return templates;
}
async function boot(){
  const timings={};applyContent();loadingProgress(18);
  renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance',alpha:false});renderer.setPixelRatio(Math.min(devicePixelRatio,1.35,Math.sqrt(2200000/(innerWidth*innerHeight))));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ReinhardToneMapping;renderer.toneMappingExposure=STORE.lighting.exposure;world.append(renderer.domElement);
  scene=new THREE.Scene();scene.background=new THREE.Color(STORE.atmosphere[3]);camera=new THREE.PerspectiveCamera(55,innerWidth/innerHeight,.05,50);scene.add(stage);
  clothSystem=new AmmoCloth({...STORE.cloth,airflow:reduced?0:STORE.cloth.airflow,motionScale:reduced?.30:1},wake);
  [textures,clothTemplates]=await Promise.all([loadTextures(),loadClothTemplates()]);timings.assets=timings.geometry=performance.now();
  lightCollection();
  const lut=buildPalette();makeEnvironment();buildRoom(lut);frameRail();state.rack=0;state.overview=false;flightLead.set(1);flight.set(1);rackDistance.set(racks[0].distance);rackFov.set(racks[0].fov);roomUI.classList.add('at-rack');$('#room-title').textContent='黄白的作品衣橱';loadingProgress(82);timings.room=performance.now();
  for(const tx of Object.values(textures)){renderer.initTexture(tx);await new Promise(resolve=>setTimeout(resolve,0));}renderer.initTexture(lut);loadingProgress(90);resize();updateCamera();await renderer.compileAsync(scene,camera);renderer.render(scene,camera);timings.compiled=performance.now();
  bindEvents();loadingProgress(100);$('#loader').classList.add('exiting');await new Promise(resolve=>setTimeout(resolve,reduced?100:200));document.body.classList.add('ready');state.ready=true;timings.ready=performance.now();state.timings=timings;wake();setTimeout(()=>$('#loader').setAttribute('aria-hidden','true'),350);
  // Read-only diagnostics for checking transitions and on-demand rendering.
  window.loops={get state(){return {ready:state.ready,progress:state.progress,rack:state.rack,flight:flight.value,yaw:state.yaw,frames:state.frames,renderPending:!!state.frame,garments:garments.length,three:THREE.REVISION,reducedMotion:reduced,spacing:STORE.room.garmentSpacing,timings:state.timings,drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles,pixelRatio:renderer.getPixelRatio(),renderWorkMs:{average:frameWork.reduce((a,b)=>a+b,0)/Math.max(1,frameWork.length),max:Math.max(0,...frameWork)}}},get cloth(){return {...clothSystem.diagnostics,topology:Object.fromEntries(Object.entries(clothTemplates).map(([image,t])=>[image,t.topology]))}},get garmentViews(){return garments.map(g=>{const pos=g.pivot.localToWorld(new THREE.Vector3(0,-.65,.04)).project(camera);return {rack:g.rack,index:g.index,id:g.product.id,role:g.product.role,name:g.product.name,x:(pos.x*.5+.5)*innerWidth,y:(-pos.y*.5+.5)*innerHeight,yaw:g.railYaw,railX:g.pivot.position.x,homeX:g.homeX,anchored:racks[g.rack].items.railAnchor?.garment===g,railZ:g.pivot.position.z,envelope:g.envelope,swing:g.swing.value,relaxation:g.cloth.relaxing?g.cloth.blend.value:1,motion:g.motion,hover:g===state.hover,shakes:g.cloth.shakes,vertices:g.mesh.geometry.attributes.position.count,triangles:g.mesh.geometry.index.count/3,physicsTriangles:g.cloth.template.triangles.length/3,physicsVertices:g.cloth.template.coarse.length/3,thickness:g.cloth.template.profile.thickness,loft:g.cloth.template.profile.loft,gender:g.product.gender,materialZones:g.cloth.template.materialZones,materials:g.mesh.material.map(m=>({name:m.name,weave:m.userData.weave,roughness:m.roughness,specular:m.specularIntensity??0,sheen:m.sheen??0,metalness:m.metalness??0,environment:m.envMapIntensity??0,alphaTest:m.alphaTest})),support:g.cloth.template.support.shoulder.map(p=>p.toArray()),deformation:g.cloth.peak};})},inspectAttachment(rack,index){
    const g=racks[rack].items[index],t=g.cloth.template,positions=g.pick.geometry.attributes.position.array;g.pivot.updateWorldMatrix(true,true);let maximum=0;
    for(const i of t.pins){const actual=g.pick.localToWorld(new THREE.Vector3().fromArray(positions,i*3)),expected=g.turn.localToWorld(new THREE.Vector3().fromArray(t.coarse,i*3));maximum=Math.max(maximum,actual.distanceTo(expected));}
    return {id:g.product.id,pins:t.pins.length,maximumPinnedErrorMm:maximum*1000,sharedTurn:g.mesh.parent===g.turn&&g.pick.parent===g.turn};
  },inspectHook(rack,index){
    const g=racks[rack].items[index];g.pivot.updateWorldMatrix(true,true);
    const socket=g.hook.localToWorld(new THREE.Vector3(0,-.112,0)),stem=g.turn.localToWorld(new THREE.Vector3(0,-.112,0));
    return {id:g.product.id,railZ:g.pivot.position.z,railY:g.pivot.position.y,hookRotation:g.hook.rotation.toArray().slice(0,3),crownClearanceMm:(.0215-.001-.0045-.016)*1000,swivelGapMm:socket.distanceTo(stem)*1000};
  },inspectFit(rack,index){
    const g=racks[rack].items[index],t=g.cloth.template,positions=g.mesh.geometry.attributes.position.array,indices=g.mesh.geometry.index.array;
    const local=[];for(let i=0;i<positions.length;i+=3)local.push(new THREE.Vector3().fromArray(positions,i));
    let minimum=Infinity,contact;const triangle=new THREE.Triangle(),nearest=new THREE.Vector3();
    for(const [a,b] of t.support.segments)for(let sample=0;sample<=4;sample++){
      const center=a.clone().lerp(b,sample/4);
      for(let i=0;i<indices.length;i+=3){triangle.set(local[indices[i]],local[indices[i+1]],local[indices[i+2]]);triangle.closestPointToPoint(center,nearest);const distance=center.distanceTo(nearest);if(distance<minimum){minimum=distance;contact={center:center.toArray(),surface:nearest.toArray(),face:i/3,points:[...triangle.a.toArray(),...triangle.b.toArray(),...triangle.c.toArray()]};}}
    }
    return {id:g.product.id,minimumSurfaceDistance:minimum,tubeRadius:t.support.radius,clearance:minimum-t.support.radius,contact,pins:t.pins.length,finite:positions.every(Number.isFinite),zones:t.materialZones};
  },readGarment(rack,index){return Array.from(racks[rack].items[index].mesh.geometry.attributes.position.array)},get views(){return racks.map((r,i)=>({index:i,label:r.label,world:r.group.position.toArray()}))}};
  const piece=new URLSearchParams(location.search).get('piece');
  if(piece)focusPiece(piece,{overview:true});
}
boot().catch(error=>{console.error(error);$('#loader').classList.add('exiting');$('#error-panel').hidden=false;$('#error-message').textContent=error.message;});
