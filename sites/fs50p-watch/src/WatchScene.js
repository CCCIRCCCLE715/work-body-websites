import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { createStudioEnvironment } from './studio';
import { createBracelet } from './bracelet';
import { shotAt, ramp, windowed } from './motion';
import { watchUrl, movementModelUrl, decoderPaths } from './assets';
import { prepareMovement } from './movementModel';

export async function createWatchScene(canvas, onLoad, onError, onPoster) {
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.65));
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.45; renderer.setClearColor(0, 0);
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(33, 1, .1, 60);
  camera.position.set(0, 0, 10.8); camera.lookAt(0, 0, 0);
  const environment = createStudioEnvironment(renderer);
  scene.environment = environment.texture; scene.environmentIntensity = 1;
  scene.add(new THREE.HemisphereLight(0xf4f6f7,0x20272b,.20));
  [[0xffffff,.85,-4,6,5],[0xffffff,.7,5,1,-2]].forEach(([color,power,x,y,z])=>{
    const light=new THREE.DirectionalLight(color,power);light.position.set(x,y,z);scene.add(light);
  });
  const root = new THREE.Group(), watch = new THREE.Group(); scene.add(root); root.add(watch);
  const parts = [], braceletAsset = createBracelet(), bracelet = braceletAsset.object;
  watch.add(bracelet);scene.add(braceletAsset.detail);
  const glassEdge=new THREE.Mesh(new THREE.TorusGeometry(.835,.006,8,112),new THREE.MeshBasicMaterial({color:0x74858e,transparent:true,opacity:0,depthWrite:false}));watch.add(glassEdge);
  const orbit = new THREE.Group(); scene.add(orbit); orbit.position.set(.65,0,-2.4);
  for(let j=0;j<3;j++) {
    const points = Array.from({length:101},(_,i)=> { const a=j*Math.PI*2/3+i/100*1.26; return new THREE.Vector3(2.48*Math.cos(a),2.48*Math.sin(a),0); });
    orbit.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points),new THREE.LineBasicMaterial({color:0x6d797d,transparent:true,opacity:.34})));
  }
  const sector=new THREE.Mesh(new THREE.CircleGeometry(2.48,64,.98,.92),new THREE.MeshBasicMaterial({color:0x6e7f88,transparent:true,opacity:.05,depthWrite:false,side:THREE.DoubleSide}));
  sector.userData.opacityScale=.19;sector.position.z=-.01;orbit.add(sector);
  const radial=new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0,0,0),new THREE.Vector3(0,2.48,0)]),new THREE.LineBasicMaterial({color:0x687d8a,transparent:true,opacity:.15}));
  radial.userData.opacityScale=.5;orbit.add(radial);
  const pointsCount = window.innerWidth<650?6000:15000, seeds = new Float32Array(pointsCount*3), pos = new Float32Array(pointsCount*3);
  let rng=146; const random=()=> { rng=(rng*1664525+1013904223)>>>0;return rng/4294967296; };
  for(let i=0;i<seeds.length;i++)seeds[i]=random();
  const particleGeo = new THREE.BufferGeometry(); particleGeo.setAttribute('position',new THREE.BufferAttribute(pos,3));
  const particleMat = new THREE.PointsMaterial({size:.009,color:0xddeaf0,transparent:true,opacity:0,depthWrite:false,blending:THREE.AdditiveBlending});
  const particles = new THREE.Points(particleGeo,particleMat); particles.position.z=-.7;scene.add(particles);
  const strandCount=mobileCount(),strandSteps=100;
  function mobileCount(){return window.innerWidth<650?36:72;}
  const threadPos=new Float32Array(strandCount*strandSteps*6);
  const threadGeo=new THREE.BufferGeometry();threadGeo.setAttribute('position',new THREE.BufferAttribute(threadPos,3));
  const threadMat=new THREE.LineBasicMaterial({color:0xc7e2ef,transparent:true,opacity:0,depthWrite:false,blending:THREE.AdditiveBlending});
  const threads=new THREE.LineSegments(threadGeo,threadMat);threads.position.copy(particles.position);scene.add(threads);
  const flow=(t,strand,u,phase,target,k)=>{
    const ribbon=Math.floor(strand/12),lane=(strand%12)/12;
    const width=(lane-.5)*.28+(u-.5)*.09;
    target[k]=Math.cos(t+ribbon*.12)*(4.25+width)+Math.sin(t*3+phase+ribbon*.47)*.65;
    target[k+1]=Math.sin(t+ribbon*.36)*1.5+Math.sin(t*2+phase+ribbon*.65)*.58+width;
    target[k]+=.16*Math.sin(t*7+phase+ribbon*.22)+.045*Math.sin(t*19-phase);
    target[k+1]+=.18*Math.sin(t*6-phase+ribbon*.13)+.055*Math.sin(t*15+phase);
    target[k+2]=Math.cos(t*2+phase+ribbon*.16)*.9+Math.sin(t)*.75;
  };
  let movement=null,movementAsset=null,disposed=false,studioTexture=null;
  const draco = new DRACOLoader();draco.setDecoderPath(decoderPaths);draco.setWorkerLimit(2);
  const loader = new GLTFLoader();loader.setDRACOLoader(draco);
  try {
    const progress={watch:0,movement:0};
    const report=(key,e)=>{progress[key]=e.total?e.loaded/e.total:.5;onLoad((progress.watch*.3+progress.movement*.7)*.9);};
    const [gltf,movementGltf]=await Promise.all([
      loader.loadAsync(watchUrl,e=>report('watch',e)),
      loader.loadAsync(movementModelUrl,e=>report('movement',e)),
    ]);
    if(disposed)return;
    movementAsset=prepareMovement(movementGltf.scene);movement=movementAsset.object;
    movementAsset.setOpacity(0);watch.add(movement);
    const nodes=[];gltf.scene.traverse(n=>{if(n.isMesh)nodes.push(n);});
    for(const mesh of nodes){
      if(/strap|stitches|buckle/i.test(mesh.name))continue;
      mesh.updateMatrix();mesh.geometry=mesh.geometry.clone().applyMatrix4(mesh.matrix);
      mesh.geometry.translate(0,-.0981888548,.0032);mesh.geometry.scale(20,20,20);
      mesh.position.set(0,0,0);mesh.rotation.set(0,0,0);mesh.scale.setScalar(1);mesh.material=mesh.material.clone();
      if(mesh.name==='Plane'){
        const map=mesh.material.map;
        mesh.material=new THREE.MeshBasicMaterial({map,transparent:true,side:THREE.DoubleSide,depthWrite:false,alphaTest:.02});
        mesh.geometry.translate(0,0,.006);mesh.renderOrder=2;
      }
      const m=mesh.material;
      if(mesh.name==='glass'){m.transmission=0;m.transparent=true;m.opacity=.075;m.depthWrite=false;m.color.set('#eef3f5');m.metalness=.05;m.roughness=.08;}
      else if(mesh.name==='clockface'){m.color.set('#090d10');m.metalness=.35;m.roughness=.32;}
      else if(m.name==='metal'||m.name==='metal_hands'){m.color.set('#bfc3c5');m.metalness=1;m.roughness=.18;}
      if(mesh.name==='Plane'){m.transparent=true;m.depthWrite=false;m.alphaTest=.03;}
      m.envMapIntensity=1.1;
      let offset=0;
      if(mesh.name==='glass')offset=2.4;else if(/hand|shaft/.test(mesh.name))offset=1.65;
      else if(/clockface|Plane|date/.test(mesh.name))offset=1;
      else if(mesh.name==='cover')offset=-1.3;else if(/case|crown|buttons/.test(mesh.name))offset=-.65;
      watch.add(mesh);parts.push({object:mesh,offset,opacity:m.opacity,transparent:m.transparent});
    }
    // Render a product card from the same model, once; no screenshot from the film is embedded.
    const cardTarget=new THREE.WebGLRenderTarget(320,400);
    cardTarget.texture.colorSpace=THREE.SRGBColorSpace;
    const cardCamera=new THREE.PerspectiveCamera(33,.8,.1,60);
    cardCamera.position.set(0,0,8.4);cardCamera.lookAt(0,0,-.35);
    root.rotation.set(.03,-.12,0);
    orbit.visible=false;braceletAsset.detail.visible=false;
    scene.background=new THREE.Color('#111b24');
    renderer.setRenderTarget(cardTarget);renderer.render(scene,cardCamera);
    const pixels=new Uint8Array(320*400*4),flipped=new Uint8ClampedArray(pixels.length);
    renderer.readRenderTargetPixels(cardTarget,0,0,320,400,pixels);
    for(let y=0;y<400;y++)flipped.set(pixels.subarray(y*320*4,(y+1)*320*4),(399-y)*320*4);
    const poster=document.createElement('canvas');poster.width=320;poster.height=400;
    poster.getContext('2d').putImageData(new ImageData(flipped,320,400),0,0);
    onPoster?.(poster.toDataURL('image/png'));
    renderer.setRenderTarget(null);scene.background=null;renderer.setClearColor(0,0);cardTarget.dispose();
    onLoad(1);
  }catch(error){onError(error);}
  let width=1,height=1,mobile=false;
  const resize=()=>{width=canvas.parentElement.clientWidth;height=canvas.parentElement.clientHeight;mobile=width<700;renderer.setSize(width,height,false);camera.aspect=width/height;camera.fov=mobile?41:33;camera.updateProjectionMatrix();};resize();
  const observer=new ResizeObserver(resize);observer.observe(canvas.parentElement);
  const pointer=new THREE.Vector2(),drift=new THREE.Vector2();
  const gravity=new THREE.Vector3(),inversePose=new THREE.Quaternion();
  const onPointer=e=>pointer.set((e.clientX/width-.5)*2,(e.clientY/height-.5)*2);window.addEventListener('pointermove',onPointer,{passive:true});
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  let frames=0,slow=0,last=performance.now();
  return {
    render(p,elapsed){
      if(disposed||document.hidden)return;
      if(reduced)elapsed=0;
      const shot=shotAt(p),dark=windowed(p,.29,.441,.025),card=Math.max(windowed(p,.814,.86,.012),windowed(p,.963,1.04,.012));drift.lerp(pointer,.045);
      root.visible=card<.99;
      root.position.set(shot.x*(mobile?.25:1),shot.y*(mobile?.75:1),0);root.scale.setScalar(shot.s*(mobile?.69:1));
      root.rotation.set(shot.rx+(reduced?0:drift.y*.025),shot.ry+(reduced?0:drift.x*.055),shot.rz);
      root.position.y+=reduced?0:Math.sin(elapsed*.6)*.018;
      if(mobile)root.position.y-=windowed(p,.14,.203,.02)*.9;
      for(const part of parts){part.object.position.z=part.offset*shot.explode;const opacity=part.opacity*(1-shot.isolate)*(1-shot.detail);part.object.visible=opacity>.006;part.object.material.transparent=opacity<.999||part.transparent;part.object.material.opacity=opacity;}
      glassEdge.position.z=.132+2.4*shot.explode;
      glassEdge.material.opacity=shot.explode*.65*(1-shot.isolate)*(1-shot.detail);
      glassEdge.visible=glassEdge.material.opacity>.005;
      bracelet.position.z=-.65*shot.explode;
      const linkFocus=ramp(p,.765,.791);
      inversePose.copy(root.quaternion).invert();gravity.set(0,-1,0).applyQuaternion(inversePose);
      braceletAsset.update({instant:reduced,gravityY:gravity.y,gravityZ:gravity.z,focus:linkFocus,opacity:(1-shot.isolate)*(1-shot.detail),detailOpacity:shot.detail,spread:shot.links});
      braceletAsset.detail.position.set(0,mobile?-.4:-.85,0);
      braceletAsset.detail.scale.setScalar(mobile?(1.35+linkFocus*.25):(2.8+linkFocus*1.95));
      if(movement){movementAsset.setOpacity(Math.max(shot.isolate,shot.explode)*(1-shot.detail));movement.position.z=-.17+shot.explode*.1;movement.rotation.z=Math.sin(elapsed*.18)*.08*shot.isolate;movement.rotation.y=Math.sin(elapsed*.2)*.08*shot.isolate;}
      orbit.rotation.z=p*1.8;orbit.visible=p<.055||(p>.86&&p<.965);orbit.scale.setScalar(mobile?.66:1);
      orbit.children.forEach(l=>{l.material.opacity=((1-ramp(p,.025,.06))*.35+windowed(p,.875,.94,.025)*.55)*(l.userData.opacityScale??1);l.material.color.set(p>.8?'#d8e8f0':'#6d797d');});
      particles.visible=dark>.015;
      threads.visible=particles.visible;
      if(particles.visible){
        const phase=elapsed*.09+p*4;
        particleMat.opacity=dark*.46;threadMat.opacity=dark*.13;
        for(let i=0;i<pointsCount;i++){const k=i*3;flow(seeds[k]*Math.PI*2,Math.floor(seeds[k+1]*strandCount),seeds[k+2],phase,pos,k);}
        for(let s=0;s<strandCount;s++)for(let j=0;j<strandSteps;j++){
          const k=(s*strandSteps+j)*6;flow(j/strandSteps*Math.PI*2,s,.5,phase,threadPos,k);flow((j+1)/strandSteps*Math.PI*2,s,.5,phase,threadPos,k+3);
        }
        particleGeo.attributes.position.needsUpdate=true;threadGeo.attributes.position.needsUpdate=true;
      }
      scene.environmentRotation.y=-.35+dark*.22;scene.environmentIntensity=1+dark*.2;renderer.toneMappingExposure=.98+dark*.08;renderer.render(scene,camera);
      frames++;const now=performance.now();if(now-last>25)slow++;last=now;if(frames===180&&slow>85)renderer.setPixelRatio(1);
    },
    dispose(){disposed=true;observer.disconnect();window.removeEventListener('pointermove',onPointer);draco.dispose();environment.dispose();studioTexture?.dispose();const geometries=new Set(),materials=new Set(),textures=new Set();scene.traverse(n=>{if(n.geometry)geometries.add(n.geometry);if(n.material)(Array.isArray(n.material)?n.material:[n.material]).forEach(m=>materials.add(m));});materials.forEach(m=>{Object.values(m).forEach(v=>{if(v?.isTexture)textures.add(v);});m.dispose();});geometries.forEach(g=>g.dispose());textures.forEach(t=>t.dispose());renderer.dispose();},
  };
}
