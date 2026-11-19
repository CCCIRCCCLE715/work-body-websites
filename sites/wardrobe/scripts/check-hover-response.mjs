import fs from 'node:fs';import zlib from 'node:zlib';import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
const {GARMENT_TURN,garmentEnvelope,initializeRail,arrangeRail}=await import('data:text/javascript;base64,'+Buffer.from(fs.readFileSync(root+'dist/cloth-rail.js')).toString('base64'));
const meta=JSON.parse(fs.readFileSync(root+'dist/assets/cloth-baked/collection.json')),buf=zlib.gunzipSync(fs.readFileSync(root+'dist/assets/cloth-baked/collection.bin.gz'));
const ids='emperor scholar survivor director planner drama_lead designer phone_steward programmer curator wizard racer'.split(' '),rest=68*Math.PI/180,half=Number(fs.readFileSync(root+'dist/config.js','utf8').match(/rackWidth:\s*([\d.]+)/)[1])/2-.025;
const spacing=Number(fs.readFileSync(root+'dist/config.js','utf8').match(/garmentSpacing:\s*([\d.]+)/)[1]);
const shapes=ids.map((id,i)=>{const m=meta[id],l=m.layout.rest;return {id,index:i,x:(i-5.5)*spacing,envelope:garmentEnvelope(new Float32Array(buf.buffer,buf.byteOffset+m.offset+l.offset,l.length),m.profile)};});
function measure(scale,index,degrees,fps){
 GARMENT_TURN.durationScale=scale;const k=GARMENT_TURN.stiffness/scale**2,c=GARMENT_TURN.damping/scale,dt=1/fps,target=degrees*Math.PI/180;
 const items=shapes.map(g=>({...g,railYaw:rest,rotation:{value:rest,velocity:0},pivot:{position:{x:g.x}}}));initializeRail(items,half);
 let first90,first95;
 for(let frame=1;frame<=fps*6;frame++){
  for(const g of items){const goal=g.index===index?target:rest;g.rotation.velocity+=(k*(goal-g.rotation.value)-c*g.rotation.velocity)*dt;g.rotation.value+=g.rotation.velocity*dt;}
  arrangeRail(items,items[index],half,dt);const fraction=Math.abs(items[index].railYaw-target)/Math.abs(rest-target);
  if(first90===undefined&&fraction<=.1)first90=frame/fps;
  if(first95===undefined&&fraction<=.05){first95=frame/fps;break;}
 }
 if(first95===undefined)throw Error('Turn did not complete');return {first90,first95};
}
const desired=GARMENT_TURN.durationScale,rows=[];
for(const fps of [30,60,120])for(let i=0;i<12;i++)for(const target of [-34,0,34]){
 const before=measure(1,i,target,fps),after=measure(desired,i,target,fps);rows.push({id:ids[i],fps,target,before,after,timeReduction:1-after.first95/before.first95});
}
GARMENT_TURN.durationScale=desired;
const perFps=[30,60,120].map(fps=>{const a=rows.filter(r=>r.fps===fps);return {fps,averageReductionPercent:100*a.reduce((sum,r)=>sum+r.timeReduction,0)/a.length,minReductionPercent:100*Math.min(...a.map(r=>r.timeReduction)),maxReductionPercent:100*Math.max(...a.map(r=>r.timeReduction))};});
const result={durationScale:desired,perFps,rows};console.log(perFps);if(perFps.some(r=>r.averageReductionPercent<34||r.averageReductionPercent>46))throw Error('Turn timing outside requested range');fs.writeFileSync(root+'docs/hover-response/timing.json',JSON.stringify(result,null,2));
