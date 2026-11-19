import * as THREE from 'three';

// Front-panel openings traced inside the existing collar/lapel stitching.
// Coordinates are fractions of the front catalog rectangle, not screen pixels.
const linings={
  emperor:[[-.05,.067],[.025,.067],[.085,0]],
  scholar:[[-.05,.060],[.025,.060],[.12,0]],
  survivor:[[-.05,.080],[.055,.080],[.23,0]],
  director:[[-.05,.080],[.055,.080],[.17,.060],[.41,0]],
  planner:[[-.05,.088],[.055,.088],[.125,0]],
  drama_lead:[[-.05,.066],[.025,.066],[.135,0]],
  designer:[[-.05,.097],[.05,.097],[.12,.074],[.25,0]],
  phone_steward:[[-.05,.17],[.12,.17],[.205,.115],[.22,0]],
  programmer:[[-.05,.115],[.045,.115],[.105,0]],
  curator:[[-.05,.080],[.06,.080],[.27,0]],
  wizard:[[-.05,.086],[.055,.086],[.25,0]],
  racer:[[-.05,.085],[.055,.085],[.09,0]]
};

export function openNeckline(t,id){
  const {width,height,atlas:{fit}}=t.profile,rows=linings[id];
  const outline=[...rows.map(([y,w])=>[.5-w,y]),...rows.slice().reverse().map(([y,w])=>[.5+w,y])].filter((p,i,all)=>!i||p[0]!==all[i-1][0]||p[1]!==all[i-1][1]);
  const polygon=outline.map(([x,y])=>[((x*fit[2]+fit[0])-.5)*width,-(y*fit[3]+fit[1])*height]);
  // The world-space Y flip makes the opening counterclockwise.
  const distance=(p,a,b)=>(b[0]-a[0])*(p[1]-a[1])-(b[1]-a[1])*(p[0]-a[0]);
  function clip(points,a,b,inside){
    const result=[];
    for(let i=0;i<points.length;i++){
      const p=points[i],q=points[(i+1)%points.length],d=distance(p,a,b),e=distance(q,a,b),pin=inside?d>=0:d<=0,qin=inside?e>=0:e<=0;
      if(pin)result.push(p);
      if(pin!==qin){const w=d/(d-e);result.push(p.map((n,j)=>n+(q[j]-n)*w));}
    }
    return result;
  }
  const positions=Array.from(t.rest),uv=Array.from(t.geometry.attributes.uv.array),vertices=Array.from(t.binding.vertices),weights=Array.from(t.binding.weights),detail=Array.from(t.binding.detail),rim=Array.from(t.renderRim),indices=[];
  const coarseFaces=[];
  for(let i=0;i<t.triangles.length;i+=3){const face=t.triangles.slice(i,i+3);if(face.every(j=>t.coarse[j*3+2]>0))coarseFaces.push(face);}
  function append(p){
    const index=positions.length/3;positions.push(...p.slice(0,3));uv.push(...p.slice(3));rim.push(0);
    let score=-Infinity,chosen,bary;
    for(const f of coarseFaces){
      const [a,b,c]=Array.from(f,j=>t.coarse.subarray(j*3,j*3+3)),den=(b[1]-c[1])*(a[0]-c[0])+(c[0]-b[0])*(a[1]-c[1]);
      if(Math.abs(den)<1e-12)continue;
      const u=((b[1]-c[1])*(p[0]-c[0])+(c[0]-b[0])*(p[1]-c[1]))/den,v=((c[1]-a[1])*(p[0]-c[0])+(a[0]-c[0])*(p[1]-c[1]))/den,w=1-u-v,min=Math.min(u,v,w);
      if(min>score){score=min;chosen=f;bary=[u,v,w];if(min>=-1e-7)break;}
    }
    const sum=bary.reduce((s,n)=>s+Math.max(0,n),0);bary=bary.map(n=>Math.max(0,n)/sum);
    vertices.push(...chosen);weights.push(...bary);
    for(let axis=0;axis<3;axis++)detail.push(p[axis]-chosen.reduce((s,j,k)=>s+t.coarse[j*3+axis]*bary[k],0));
    return index;
  }
  const groups=[];
  for(const group of t.geometry.groups){
    const start=indices.length;
    for(let i=group.start;i<group.start+group.count;i+=3){
      const face=Array.from(t.geometry.index.array.subarray(i,i+3));
      if(!face.every(j=>t.rest[j*3+2]>0)){indices.push(...face);continue;}
      const triangle=face.map(j=>[...t.rest.subarray(j*3,j*3+3),...t.geometry.attributes.uv.array.subarray(j*2,j*2+2)]);
      if(polygon.some((a,edge)=>triangle.every(p=>distance(p,a,polygon[(edge+1)%polygon.length])<=0))){indices.push(...face);continue;}
      let remaining=triangle;const pieces=[];
      for(let edge=0;edge<polygon.length&&remaining.length;edge++){
        const a=polygon[edge],b=polygon[(edge+1)%polygon.length];
        const outside=clip(remaining,a,b,false);if(outside.length>=3)pieces.push(outside);
        remaining=clip(remaining,a,b,true);
      }
      // Most faces do not touch the opening and retain their original indices.
      if(pieces.length===1&&pieces[0].length===3&&pieces[0].every((p,j)=>p===triangle[j])){indices.push(...face);continue;}
      for(const part of pieces){const ids=part.map(append);for(let j=1;j<ids.length-1;j++)indices.push(ids[0],ids[j],ids[j+1]);}
    }
    groups.push({start,count:indices.length-start,materialIndex:group.materialIndex});
  }
  t.rest=new Float32Array(positions);t.binding={vertices:new Uint16Array(vertices),weights:new Float32Array(weights),detail:new Float32Array(detail)};t.renderRim=new Uint8Array(rim);
  t.geometry.setAttribute('position',new THREE.BufferAttribute(t.rest.slice(),3));t.geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));t.geometry.setIndex(indices);t.geometry.clearGroups();for(const g of groups)t.geometry.addGroup(g.start,g.count,g.materialIndex);t.geometry.computeVertexNormals();
}
