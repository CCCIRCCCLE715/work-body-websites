import * as THREE from './vendor/three.module.js';
import { fittedSupport, supportDepth } from './cloth-support.js?v=huangbai-portfolio-1';

// Read the original alpha silhouette. The source product images remain unchanged.
function silhouette(image, profile) {
  const width = 256, height = 336;
  const canvas = new OffscreenCanvas(width,height);
  canvas.width = width; canvas.height = height;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if(profile.atlas){
    const {front,fit}=profile.atlas;
    context.drawImage(image,...front,fit[0]*width,fit[1]*height,fit[2]*width,fit[3]*height);
  }else context.drawImage(image, 0, 0, width, height);
  const pixels = context.getImageData(0, 0, width, height).data;
  context.clearRect(0,0,width,height);
  const {back,fit}=profile.atlas;context.drawImage(image,...back,fit[0]*width,fit[1]*height,fit[2]*width,fit[3]*height);
  const backPixels=context.getImageData(0,0,width,height).data;
  const mask = new Uint8Array(width * height), distance = new Float32Array(mask.length);
  const topAt = u => {
    const a = Math.abs(u - .5);
    return profile.neck[0] + Math.max(0, a - .12) * .34 + profile.neck[1] * Math.exp(-((a / .078) ** 2));
  };
  const opening=profile.neckOpening||[.5,.143,.098,.031];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x, p = i * 4, u = x / (width - 1), v = y / (height - 1);
      const hanger = !profile.atlas && v < .22 && Math.abs(u - .5) < .22 && pixels[p] + pixels[p+1] + pixels[p+2] < 90;
      const collarOpening=profile.atlas&&((u-opening[0])/opening[2])**2+((v-opening[1])/opening[3])**2<1;
      mask[i] = pixels[p+3] > 100 && (profile.atlas||v >= topAt(u)) && !hanger && !collarOpening ? 1 : 0;
    }
  }
  if(profile.atlas){
    // Ignore detached alpha flecks when turning a catalog cutout into a cloth pattern.
    const seen=new Uint8Array(mask.length),queue=new Int32Array(mask.length);let largest=[];
    for(let seed=0;seed<mask.length;seed++){
      if(!mask[seed]||seen[seed])continue;
      let head=0,tail=1;queue[0]=seed;seen[seed]=1;
      while(head<tail){const i=queue[head++],x=i%width;for(const j of [x>0?i-1:-1,x<width-1?i+1:-1,i-width,i+width])if(j>=0&&j<mask.length&&mask[j]&&!seen[j]){seen[j]=1;queue[tail++]=j;}}
      if(tail>largest.length)largest=Array.from(queue.subarray(0,tail));
    }
    mask.fill(0);for(const i of largest)mask[i]=1;
  }
  const rows=[];
  for(let y=0;y<height;y++){
    const ranges=[];let start=-1;
    for(let x=0;x<width;x++){
      const i=y*width+x;
      if (mask[i] && start < 0) start = x;
      if (start >= 0 && (!mask[i] || x === width - 1)) { ranges.push([start / (width-1), (mask[i] ? x : x-1) / (width-1)]); start = -1; }
    }
    rows.push(ranges);
  }
  for (let y=0;y<height;y++) for (let x=0;x<width;x++) {
    const i=y*width+x, value=mask[i];
    const boundary=x===0||y===0||x===width-1||y===height-1||mask[i-1]!==value||mask[i+1]!==value||mask[i-width]!==value||mask[i+width]!==value;
    distance[i]=boundary?.5:10000;
  }
  for(let y=1;y<height;y++) for(let x=1;x<width-1;x++) {
    const i=y*width+x;distance[i]=Math.min(distance[i],distance[i-1]+1,distance[i-width]+1,distance[i-width-1]+Math.SQRT2,distance[i-width+1]+Math.SQRT2);
  }
  for(let y=height-2;y>=0;y--) for(let x=width-2;x>0;x--) {
    const i=y*width+x;distance[i]=Math.min(distance[i],distance[i+1]+1,distance[i+width]+1,distance[i+width+1]+Math.SQRT2,distance[i+width-1]+Math.SQRT2);
  }
  for(let i=0;i<distance.length;i++) if(!mask[i])distance[i]*=-1;
  function at(u,v) {
    const x=THREE.MathUtils.clamp(u*(width-1),0,width-1),y=THREE.MathUtils.clamp(v*(height-1),0,height-1),ix=Math.floor(x),iy=Math.floor(y),jx=Math.min(ix+1,width-1),jy=Math.min(iy+1,height-1);
    return THREE.MathUtils.lerp(THREE.MathUtils.lerp(distance[iy*width+ix],distance[iy*width+jx],x-ix),THREE.MathUtils.lerp(distance[jy*width+ix],distance[jy*width+jx],x-ix),y-iy)-(profile.edgeInset||0);
  }
  let support;
  function depth(u,v,side=0) {
    const ranges=rows[Math.round(THREE.MathUtils.clamp(v,0,1)*(height-1))];
    let best=ranges[0],error=Infinity;
    for(const range of ranges){const d=Math.max(range[0]-u,0,u-range[1]);if(d<error){error=d;best=range;}}
    if(!best)return profile.thickness*.5;
    const horizontal=Math.max(0,Math.min(u-best[0],best[1]-u))*profile.width;
    const distanceToEdge=Math.max(0,at(u,v))*profile.width/width;
    let volume=profile.loft*(1-Math.exp(-distanceToEdge/.022));
    const hemGate=THREE.MathUtils.smoothstep(v,.82,.96),hoodGate=!profile.atlas&&profile.kind==='hoodie'&&Math.abs(u-.5)<.25?Math.exp(-Math.pow((v-.745)/.045,2)):0;
    const openVolume=profile.loft*(1-Math.exp(-horizontal/.025));
    volume=THREE.MathUtils.lerp(volume,openVolume,Math.max(hemGate,hoodGate));
    const collar=Math.exp(-Math.pow((v-.215)/.045,2))*Math.exp(-Math.pow((u-.5)/.19,4))*profile.loft*.32;
    const folds=(Math.sin(u*47+v*8)+.35*Math.sin(u*83-v*13))*.002*Math.sin(v*Math.PI)*Math.min(1,distanceToEdge/.025);
    let construction=0;
    if(profile.construction){
      const {collar,pockets,yoke}=profile.construction;
      construction=Math.exp(-(((v-collar[1])/collar[3])**2))*Math.exp(-(((u-collar[0])/collar[2])**4))*collar[4];
      if(side===0)for(const [x,y,rx,ry,z] of pockets)construction+=z*Math.exp(-(((u-x)/rx)**6)-((v-y)/ry)**6);
      if(yoke){const [y,arch,width,z]=yoke;construction+=z*Math.exp(-(((v-y-arch*Math.cos((u-.5)*9))/.025)**2)-((u-.5)/width)**8);}
    }
    return Math.max(profile.thickness*.5+Math.max(0,volume+collar+folds+construction),supportDepth((u-.5)*profile.width,-v*profile.height,support));
  }
  const shoulder=new Float32Array(width).fill(1);
  for(let x=0;x<width;x++)for(let y=0;y<height;y++)if(mask[y*width+x]){shoulder[x]=y/(height-1);break;}
  support=fittedSupport({shoulder,at},profile);
  return {at,depth,topAt,shoulder,support,pixels,backPixels,width,height};
}

function panel(nx,ny,field,profile) {
  const points=[],positions=[],indices=[],byCell=Array.from({length:nx*ny},()=>[]),lookup=new Map();
  function vertex(p){const key=p.map(v=>Math.round(v*1e9)).join(':');let index=lookup.get(key);if(index===undefined){index=points.length;lookup.set(key,index);points.push(p);positions.push((p[0]-.5)*profile.width,-p[1]*profile.height,field.depth(...p));}return index;}
  function triangle(a,b,c,cell){
    const input=[a,b,c],polygon=[];
    for(let i=0;i<3;i++){
      const p=input[i],q=input[(i+1)%3],d=field.at(...p),e=field.at(...q);
      if(d>=0)polygon.push(p);
      if((d>=0)!==(e>=0)){const t=d/(d-e);polygon.push([THREE.MathUtils.lerp(p[0],q[0],t),THREE.MathUtils.lerp(p[1],q[1],t)]);}
    }
    for(let i=1;i<polygon.length-1;i++){
      const face=[vertex(polygon[0]),vertex(polygon[i]),vertex(polygon[i+1])];
      if(new Set(face).size<3)continue;
      byCell[cell].push(indices.length/3);indices.push(...face);
    }
  }
  for(let j=0;j<ny;j++)for(let i=0;i<nx;i++){
    const u=i/nx,v=.13+j/ny*.87,nextU=(i+1)/nx,nextV=.13+(j+1)/ny*.87,a=[u,v],b=[nextU,v],c=[u,nextV],d=[nextU,nextV],cell=j*nx+i;
    triangle(a,c,b,cell);triangle(b,c,d,cell);
  }
  const edges=new Map();
  for(let i=0;i<indices.length;i+=3)for(let k=0;k<3;k++){
    const a=indices[i+k],b=indices[i+(k+1)%3],key=[Math.min(a,b),Math.max(a,b)].join(':');
    const edge=edges.get(key);if(edge)edge.count++;else edges.set(key,{a,b,count:1});
  }
  const boundary=[...edges.values()].filter(e=>e.count===1);
  const open=(a,b)=>{
    const u=(points[a][0]+points[b][0])/2,v=(points[a][1]+points[b][1])/2;
    if(profile.kind==='vest'&&((v<.62&&Math.abs(u-.5)>.25)||(v<.31&&Math.abs(u-.5)<.13)))return true;
    if(['tee','jersey','shirt'].includes(profile.kind)&&v>.36&&v<.72&&Math.abs(u-.5)>.30)return true;
    const [neckU,neckV,neckWidth,neckHeight]=profile.neckOpening||[.5,.143,.098,.031];
    const neckline=v<neckV+neckHeight+.012&&Math.abs(u-neckU)<neckWidth+.012;
    return neckline||v>.89||(profile.atlas&&v>.80&&Math.abs(u-.5)<.27)||(!profile.atlas&&profile.kind==='hoodie'&&v>.70&&Math.abs(u-.5)<.29);
  };
  return {points,positions,indices,boundary,open,byCell,nx,ny,field};
}

function shell(panel,profile,rims) {
  const n=panel.points.length,positions=[],uv=[],sources=[],sides=[],indices=[],pins=[];
  for(let side=0;side<2;side++)for(let i=0;i<n;i++){
    const [u,v]=panel.points[i];
    positions.push(panel.positions[i*3],panel.positions[i*3+1],panel.field.depth(u,v,side)*(side?-1:1));
    if(profile.atlas){
      const {size,fit}=profile.atlas,rect=side?profile.atlas.back:profile.atlas.front;
      uv.push((rect[0]+((side?1-u:u)-fit[0])/fit[2]*rect[2])/size[0],1-(rect[1]+(v-fit[1])/fit[3]*rect[3])/size[1]);
    }else uv.push(side?1-u:u,1-v);
    sources.push(i);sides.push(side);
    const a=Math.abs(u-.5);
    const supportIndex=Math.round((u-.24)/.026),supportPoint=panel.field.support.shoulder[Math.max(0,Math.min(20,supportIndex))];
    if(a>.14&&a<.25&&Math.abs(v+supportPoint.y/profile.height)<.014)pins.push(side*n+i);
  }
  indices.push(...panel.indices);const frontCount=indices.length;
  for(let i=0;i<panel.indices.length;i+=3)indices.push(n+panel.indices[i],n+panel.indices[i+2],n+panel.indices[i+1]);
  const backCount=indices.length-frontCount;
  for(const {a,b} of panel.boundary){
    if(!panel.open(a,b))indices.push(a,n+a,b,b,n+a,n+b);
    else if(rims)for(let side=0;side<2;side++){
      const ia=positions.length/3,sign=side?-1:1;
      for(const point of [a,b]){
        positions.push(panel.positions[point*3],panel.positions[point*3+1],panel.field.depth(...panel.points[point],side)*sign-profile.thickness*sign);
        const [u,v]=panel.points[point];uv.push(u,1-v);sources.push(point);sides.push(side);
      }
      const outerA=a+side*n,outerB=b+side*n;indices.push(outerA,ia,outerB,outerB,ia,ia+1);
    }
  }
  const closedBoundary=new Set(panel.boundary.filter(({a,b})=>!panel.open(a,b)).flatMap(({a,b})=>[a,b]));
  const rim=new Uint8Array(sources.map(source=>closedBoundary.has(source)?1:0));
  return {rim,positions:new Float32Array(positions),uv,indices,sources,sides,pins,frontCount,backCount};
}

function bind(render,coarsePanel,coarseShell) {
  const count=render.positions.length/3,vertices=new Uint16Array(count*3),weights=new Float32Array(count*3),detail=new Float32Array(count*3);
  const n=coarsePanel.points.length;
  for(let i=0;i<count;i++){
    const source=render.sources[i],p=render.panel.points[source],cx=Math.floor(p[0]*coarsePanel.nx),cy=Math.floor((p[1]-.13)/.87*coarsePanel.ny);
    let best=-Infinity,chosen,chosenWeights;
    for(let y=Math.max(0,cy-2);y<=Math.min(coarsePanel.ny-1,cy+2);y++)for(let x=Math.max(0,cx-2);x<=Math.min(coarsePanel.nx-1,cx+2);x++)for(const f of coarsePanel.byCell[y*coarsePanel.nx+x]){
      const ids=coarsePanel.indices.slice(f*3,f*3+3),[a,b,c]=ids.map(j=>coarsePanel.points[j]);
      const denominator=(b[1]-c[1])*(a[0]-c[0])+(c[0]-b[0])*(a[1]-c[1]);
      if(Math.abs(denominator)<1e-12)continue;
      const w0=((b[1]-c[1])*(p[0]-c[0])+(c[0]-b[0])*(p[1]-c[1]))/denominator,w1=((c[1]-a[1])*(p[0]-c[0])+(a[0]-c[0])*(p[1]-c[1]))/denominator,w2=1-w0-w1,score=Math.min(w0,w1,w2);
      if(score>best){best=score;chosen=ids;chosenWeights=[w0,w1,w2];}
    }
    const w=chosenWeights.map(v=>Math.max(0,v)),sum=w[0]+w[1]+w[2],offset=render.sides[i]*n;
    for(let k=0;k<3;k++){vertices[i*3+k]=chosen[k]+offset;weights[i*3+k]=w[k]/sum;}
    for(let axis=0;axis<3;axis++)detail[i*3+axis]=render.positions[i*3+axis]-chosen.reduce((value,j,k)=>value+coarseShell.positions[(j+offset)*3+axis]*w[k]/sum,0);
  }
  return {vertices,weights,detail};
}

export function createClothTemplate(image,profile) {
  const field=silhouette(image,profile),coarsePanel=panel(18,24,field,profile),coarse=shell(coarsePanel,profile,false),renderPanel=panel(84,110,field,profile),render=shell(renderPanel,profile,true);
  render.panel=renderPanel;
  const binding=bind(render,coarsePanel,coarse);
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(render.positions.slice(),3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(render.uv,2));geometry.setIndex(render.indices);
  const zones=profile.fabricZones,buckets=Array.from({length:zones.length*2+1},()=>[]);
  const zoneAt=(u,v,side)=>{
    const pixels=side?field.backPixels:field.pixels;if(side)u=1-u;
    const x=Math.round(u*(field.width-1)),y=Math.round(v*(field.height-1)),i=(y*field.width+x)*4;
    const rgb=[pixels[i],pixels[i+1],pixels[i+2]].map(n=>n/255),max=Math.max(...rgb),min=Math.min(...rgb),delta=max-min,l=(max+min)/2,s=delta?delta/(1-Math.abs(2*l-1)):0;
    let h=0;if(delta){h=max===rgb[0]?((rgb[1]-rgb[2])/delta)%6:max===rgb[1]?(rgb[2]-rgb[0])/delta+2:(rgb[0]-rgb[1])/delta+4;h=(h*60+360)%360;}
    let result=0;
    zones.forEach((z,index)=>{if(!index||z.side==='front'&&side)return;if(z.region&&(u<z.region[0]||v<z.region[1]||u>z.region[2]||v>z.region[3]))return;for(const [key,value] of [['h',h],['s',s],['l',l]])if(z[key]&&(value<z[key][0]||value>z[key][1]))return;result=index;});
    return result;
  };
  for(let i=0;i<render.indices.length;i+=3){
    const face=render.indices.slice(i,i+3);
    let slot=zones.length*2;
    if(i<render.frontCount+render.backCount){const pts=face.map(j=>renderPanel.points[render.sources[j]]),u=pts.reduce((s,p)=>s+p[0],0)/3,v=pts.reduce((s,p)=>s+p[1],0)/3;slot=(i<render.frontCount?0:zones.length)+zoneAt(u,v,i>=render.frontCount);}
    buckets[slot].push(...face);
  }
  const slots=zones.map((_,i)=>[...buckets[i],...buckets[i+zones.length]]);slots.push(buckets.at(-1));
  const grouped=new Uint16Array(render.indices.length);let start=0;
  slots.forEach((indices,slot)=>{geometry.addGroup(start,indices.length,slot);grouped.set(indices,start);start+=indices.length;});geometry.setIndex(new THREE.BufferAttribute(grouped,1));
  const materialZones=zones.map((z,i)=>({...z,frontFaces:buckets[i].length/3,backFaces:buckets[i+zones.length].length/3}));
  geometry.computeVertexNormals();geometry.boundingSphere=new THREE.Sphere(new THREE.Vector3(0,-.62,0),.91);
  const parent=Array.from({length:coarse.positions.length/3},(_,i)=>i);
  const root=i=>{while(parent[i]!==i){parent[i]=parent[parent[i]];i=parent[i];}return i;};
  for(let i=0;i<coarse.indices.length;i+=3){const a=root(coarse.indices[i]);parent[root(coarse.indices[i+1])]=a;parent[root(coarse.indices[i+2])]=a;}
  const components=new Map();for(let i=0;i<parent.length;i++){const r=root(i);components.set(r,(components.get(r)||0)+1);}
  return {geometry,rest:render.positions,coarse:coarse.positions,triangles:coarse.indices,pins:coarse.pins,binding,profile,renderRim:render.rim,coarseRim:coarse.rim,support:field.support,materialZones,topology:{components:[...components.values()].sort((a,b)=>b-a),pins:coarse.pins.length,shoulderSeams:render.panel.boundary.filter(({a,b})=>{const u=(render.panel.points[a][0]+render.panel.points[b][0])/2,v=(render.panel.points[a][1]+render.panel.points[b][1])/2;return v<.32&&Math.abs(u-.5)>.13&&!render.panel.open(a,b);}).length}};
}
