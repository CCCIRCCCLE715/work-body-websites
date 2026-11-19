import fs from 'node:fs';import zlib from 'node:zlib';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
const {garmentEnvelope,initializeRail,arrangeRail,GARMENT_TURN}=await import('data:text/javascript;base64,'+Buffer.from(fs.readFileSync(root+'/dist/cloth-rail.js')).toString('base64'));
const meta=JSON.parse(fs.readFileSync(root+'/dist/assets/cloth-baked/collection.json')),buf=zlib.gunzipSync(fs.readFileSync(root+'/dist/assets/cloth-baked/collection.bin.gz'));const ids='emperor scholar survivor director planner drama_lead designer phone_steward programmer curator wizard racer'.split(' '),rest=68*Math.PI/180;
const spacing=Number(fs.readFileSync(root+'/dist/config.js','utf8').match(/garmentSpacing:\s*([\d.]+)/)[1]);
const items=ids.map((id,i)=>{const m=meta[id],l=m.layout.rest,a=new Float32Array(buf.buffer,buf.byteOffset+m.offset+l.offset,l.length);return {id,index:i,x:(i-5.5)*spacing,envelope:garmentEnvelope(a,m.profile),railYaw:rest,rotation:{value:rest,velocity:0,target:rest},pivot:{position:{x:0}}};});
const railWidth=Number(fs.readFileSync(root+'/dist/config.js','utf8').match(/rackWidth:\s*([\d.]+)/)[1]),halfLength=railWidth/2-.025;
initializeRail(items,halfLength);
const stiffness=GARMENT_TURN.stiffness/GARMENT_TURN.durationScale**2,damping=GARMENT_TURN.damping/GARMENT_TURN.durationScale;
let minGap=Infinity,maxStep=0,railOverflow=0,constrained=0,maximumAnchorError=0;const previous=items.map(g=>g.x);
// Independent SAT check of every pair, not just nearest neighbors.
function clearance(a,b){const ax=a.railYaw,bx=b.railYaw,u=[Math.cos(ax),-Math.sin(ax)],v=[-u[1],u[0]],s=[Math.cos(bx),-Math.sin(bx)],t=[-s[1],s[0]],dot=(x,y)=>Math.abs(x[0]*y[0]+x[1]*y[1]);return Math.max(...[u,v,s,t].map(n=>Math.abs((b.pivot.position.x-a.pivot.position.x)*n[0])-a.envelope.width*dot(u,n)-a.envelope.depth*dot(v,n)-b.envelope.width*dot(s,n)-b.envelope.depth*dot(t,n)));}
for(let frame=0;frame<7200;frame++){
 const active=frame<600?null:items[Math.floor(frame/17)%12];
 for(const g of items){g.rotation.target=g===active?Math.sin(frame*.051)*34*Math.PI/180:rest;g.rotation.velocity+=(stiffness*(g.rotation.target-g.rotation.value)-damping*g.rotation.velocity)/60;g.rotation.value+=g.rotation.velocity/60;}
 const proposed=items.map(g=>g.rotation.value);arrangeRail(items,active,halfLength);
 if(active)maximumAnchorError=Math.max(maximumAnchorError,Math.abs(active.pivot.position.x-items.railAnchor.x));
 items.forEach((g,i)=>{if(frame>600)maxStep=Math.max(maxStep,Math.abs(previous[i]-g.pivot.position.x));previous[i]=g.pivot.position.x;railOverflow=Math.max(railOverflow,Math.abs(g.pivot.position.x)-(halfLength));if(Math.abs(g.railYaw-proposed[i])>1e-4)constrained++;});
 for(let i=0;i<12;i++)for(let j=i+1;j<12;j++)minGap=Math.min(minGap,clearance(items[i],items[j]));
}
const result={railWidth,frames:7200,seconds:120,pairChecks:7200*66,minimumEnvelopeClearanceMm:minGap*1000,maxFrameSlideMm:maxStep*1000,railOverflowMm:railOverflow*1000,constrainedFrames:constrained,maximumAnchorErrorMm:maximumAnchorError*1000};console.log(result);if(minGap<.0079||railOverflow>1e-6||maximumAnchorError>1e-8||maxStep>GARMENT_TURN.slideSpeed/GARMENT_TURN.durationScale/60+1e-7)throw Error('Clothes overlap or hook leaves rail');fs.writeFileSync(root+'/docs/rail-contact/rail-regression.json',JSON.stringify(result,null,2));
let maximumSettledYawError=0;
for(const active of items)for(const target of [-34,0,34]){
 // Check each full turn from the same canonical resting row.
 for(let frame=0;frame<300;frame++){
  for(const g of items){g.rotation.velocity+=(stiffness*(rest-g.rotation.value)-damping*g.rotation.velocity)/60;g.rotation.value+=g.rotation.velocity/60;}
  arrangeRail(items,null,halfLength);
 }
 for(let frame=0;frame<180;frame++){
  for(const g of items){g.rotation.target=g===active?target*Math.PI/180:rest;g.rotation.velocity+=(stiffness*(g.rotation.target-g.rotation.value)-damping*g.rotation.velocity)/60;g.rotation.value+=g.rotation.velocity/60;}
  arrangeRail(items,active,halfLength);
 }
 maximumSettledYawError=Math.max(maximumSettledYawError,Math.abs(active.railYaw-target*Math.PI/180));
 maximumAnchorError=Math.max(maximumAnchorError,Math.abs(active.pivot.position.x-items.railAnchor.x));
}
if(maximumSettledYawError>.005||maximumAnchorError>1e-8)throw Error('A garment moved or cannot complete its turn from the resting row');
result.maximumSettledYawErrorDegrees=maximumSettledYawError*180/Math.PI;console.log({all36TurnsComplete:true,maximumSettledYawErrorDegrees:result.maximumSettledYawErrorDegrees});fs.writeFileSync(root+'/docs/rail-contact/rail-regression.json',JSON.stringify(result,null,2));

// Exercise the full hover lifecycle without rebuilding the rack. Every leave
// must restore the same canonical slots; fast re-entry must still finish turning.
let maximumHomeError=0,maximumReentryYawError=0,leaves=0;
function step(active,target=0){
 for(const g of items){const goal=g===active?target*Math.PI/180:rest;g.rotation.velocity+=(stiffness*(goal-g.rotation.value)-damping*g.rotation.velocity)/60;g.rotation.value+=g.rotation.velocity/60;}
 arrangeRail(items,active,halfLength);
 if(active)maximumAnchorError=Math.max(maximumAnchorError,Math.abs(active.pivot.position.x-items.railAnchor.x));
 for(let i=0;i<12;i++)for(let j=i+1;j<12;j++)minGap=Math.min(minGap,clearance(items[i],items[j]));
 if(items.some((g,i)=>i&&g.pivot.position.x<=items[i-1].pivot.position.x))throw Error('Garment order changed');
}
for(let cycle=0;cycle<72;cycle++){
 const piece=items[(cycle*7)%12],target=[-34,0,34][cycle%3];
 for(let f=0;f<90;f++)step(piece,target);
 for(let f=0;f<8;f++)step(null);
 // Re-enter while neighbors are still returning.
 for(let f=0;f<180;f++)step(piece,-target);
 maximumReentryYawError=Math.max(maximumReentryYawError,Math.abs(piece.railYaw+target*Math.PI/180));
 for(let f=0;f<180;f++)step(null);
 maximumHomeError=Math.max(maximumHomeError,...items.map(g=>Math.abs(g.pivot.position.x-g.homeX)));leaves++;
}
// Uninterrupted rapid changes must also recover after the final leave.
for(let f=0;f<1800;f++)step(items[Math.floor(f/7)%12],Math.sin(f*.13)*34);
for(let f=0;f<240;f++)step(null);
maximumHomeError=Math.max(maximumHomeError,...items.map(g=>Math.abs(g.pivot.position.x-g.homeX)));
if(maximumHomeError>.00001||maximumReentryYawError>.005||maximumAnchorError>1e-8||minGap<.0079)throw Error('Hover lifecycle failed');
Object.assign(result,{leaveCycles:leaves,rapidSwitches:Math.ceil(1800/7),maximumHomeErrorMm:maximumHomeError*1000,maximumReentryYawErrorDegrees:maximumReentryYawError*180/Math.PI,minimumEnvelopeClearanceMm:minGap*1000});
console.log({lifecycle:result});fs.writeFileSync(root+'/docs/rail-contact/rail-regression.json',JSON.stringify(result,null,2));
// Hold each new pick until it has turned, without any return-to-home interval.
let uninterruptedYawError=0;
for(let cycle=0;cycle<72;cycle++){
 const g=items[(cycle*7)%12],target=[-34,0,34][cycle%3];
 for(let f=0;f<180;f++)step(g,target);
 uninterruptedYawError=Math.max(uninterruptedYawError,Math.abs(g.railYaw-target*Math.PI/180));
}
for(let f=0;f<240;f++)step(null);
maximumHomeError=Math.max(maximumHomeError,...items.map(g=>Math.abs(g.pivot.position.x-g.homeX)));
if(uninterruptedYawError>.005||maximumHomeError>.00001)throw Error('Uninterrupted re-entry failed');
Object.assign(result,{uninterruptedCompleteTurns:72,uninterruptedYawErrorDegrees:uninterruptedYawError*180/Math.PI,maximumHomeErrorMm:maximumHomeError*1000});
console.log({uninterruptedCompleteTurns:72,yawErrorDegrees:result.uninterruptedYawErrorDegrees});fs.writeFileSync(root+'/docs/rail-contact/rail-regression.json',JSON.stringify(result,null,2));
