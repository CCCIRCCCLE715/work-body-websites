import assert from 'node:assert/strict';
import {createEngine} from './portrait-harness.mjs';
const source=new URL('../src/portrait-engine.js',import.meta.url).pathname;
const results=[];
function test(name,run){try{const details=run();results.push({name,passed:true,details});}catch(error){results.push({name,passed:false,error:error.message});}}
test('Unattended expressions never apply local mesh deformation',()=>{
 const e=createEngine(source);let checked=0;
 for(const name of e.rotationNames){e.start(name);for(let frame=0;frame<540;frame++){e.tick();let peak=0;for(let k=0;k<e.sx.length;k++)peak=Math.max(peak,Math.hypot(e.sx[k],e.sy[k]));assert.ok(peak<.000001,`${name} deformed the idle face by ${peak}`);checked++;}}
 return {actions:e.rotationNames.length,frames:checked};
});
test('Ending an interrupted idle action clears its eye and lean controls',()=>{
 const e=createEngine(source);e.start('doze');for(let i=0;i<240;i++)e.tick();e.end();e.tick();
 assert.equal(e.state().brush,null);assert.deepEqual(e.state().wantLean,[0,0]);assert.equal(e.state().wantEyes,null);
});
test('An automatic gesture interrupted by manual input leaves no residual pull',()=>{
 const e=createEngine(source);e.start('gum');for(let i=0;i<85;i++)e.tick();e.event('keydown');for(let i=0;i<720;i++)e.tick();
 assert.equal(e.state().brush,null);assert.ok(e.geometry().maxDisplacement<.0001,`Residual displacement ${e.geometry().maxDisplacement}`);
});
for (const interruption of ['pointercancel','lostpointercapture','blur','hidden']) test(`Interrupted manual drag releases on ${interruption}`,()=>{
 const e=createEngine(source);e.wrapEvent('pointerdown');e.event('pointermove',{clientX:560,clientY:460});for(let i=0;i<30;i++)e.tick();
 if(interruption==='hidden'){e.visibility(true);e.advanceClock(60000);e.visibility(false);}else if(interruption==='lostpointercapture')e.wrapEvent(interruption);else e.event(interruption);
 assert.equal(e.state().pressed,false,`Stuck drag after ${interruption}`);assert.equal(e.state().brush,null);
 for(let i=0;i<720;i++)e.tick();assert.ok(e.geometry().maxDisplacement<.0001);
});
test('A second touch cannot steal or release the active drag',()=>{
 const e=createEngine(source);e.wrapEvent('pointerdown',{pointerId:1,clientX:320,clientY:420});const before=e.state().brush;
 e.wrapEvent('pointerdown',{pointerId:2,clientX:440,clientY:400});e.event('pointerup',{pointerId:2});
 assert.equal(e.state().pressed,true);assert.equal(e.state().brush.u,before.u);e.event('pointerup',{pointerId:1});assert.equal(e.state().pressed,false);
});
test('Rapid repeated re-grabs preserve every triangle orientation',()=>{
 const e=createEngine(source),xy=(u,v)=>({clientX:((u-.5)/1.7+.5)*680,clientY:((v-.5)/1.7+.5)*680});let minRatio=1;
 for(let n=0;n<12;n++){const u=[.335,.5,.665][n%3],v=[.5,.67,.8][n%3];e.wrapEvent('pointerdown',xy(u,v));
  for(let i=0;i<30;i++){const angle=n*Math.PI/4+(i%8>3?.6:0);e.event('pointermove',xy(u+Math.cos(angle)*1.5,v+Math.sin(angle)*1.5));e.tick();const g=e.geometry();assert.ok(g.finite);assert.equal(g.inverted,0);minRatio=Math.min(minRatio,g.minRatio);}
  e.event('pointerup');for(let i=0;i<4;i++)e.tick();
 }
 assert.ok(minRatio>=.079);return {minRatio};
});
const pointerAt=(u,v)=>({clientX:((u-.5)/1.7+.5)*680,clientY:((v-.5)/1.7+.5)*680});
test('Blush grows during pulling and peaks at the first return',()=>{
 const e=createEngine(source);e.wrapEvent('pointerdown',pointerAt(.335,.67));
 e.event('pointermove',pointerAt(.13,.69));e.tick();const early=e.state().blush.amount;
 for(let i=0;i<24;i++)e.tick();
 const pulled=e.state().blush;assert.ok(pulled.amount>early&&pulled.amount<1);
 e.event('pointerup');const released=e.state().blush;assert.equal(released.peakAt,null);
 let peakFrame=-1,previous=released.amount;
 for(let i=0;i<90;i++){
  e.tick();const b=e.state().blush;assert.ok(b.amount>=previous);previous=b.amount;
  if(b.peakAt!==null){
   const projection=(e.sx[b.index]*b.returnX+e.sy[b.index]*b.returnY)/b.returnLength2;
   assert.ok(projection<=.05);assert.equal(b.amount,1);peakFrame=i;break;
  }
 }
 assert.ok(peakFrame>=0);for(let i=0;i<390;i++)e.tick();assert.equal(e.state().blush,null);
 return {duringPull:pulled.amount,peakAfterReleaseMs:(peakFrame+1)*1000/60};
});
test('A new pinch immediately replaces the previous material-bound blush',()=>{
 const e=createEngine(source);e.wrapEvent('pointerdown',pointerAt(.335,.67));e.event('pointermove',pointerAt(.12,.72));for(let i=0;i<25;i++)e.tick();e.event('pointerup');for(let i=0;i<20;i++)e.tick();
 assert.ok(e.state().blush.amount>.8);
 e.wrapEvent('pointerdown',pointerAt(.665,.67));const next=e.state().blush;
 assert.equal(next.amount,0);assert.equal(next.peakAt,null);assert.ok(next.u>.6);
 e.event('pointermove',pointerAt(.85,.68));for(let i=0;i<20;i++)e.tick();
 assert.equal(e.state().blush.u,next.u);assert.equal(e.state().blush.v,next.v);assert.ok(e.state().blush.amount>0);
});
test('An unmoved tap does not create a pull blush',()=>{
 const e=createEngine(source);e.wrapEvent('pointerdown',pointerAt(.335,.67));e.event('pointerup');e.tick();assert.equal(e.state().blush,null);
});
for(const interruption of ['pointercancel','lostpointercapture','blur','hidden']) test(`A deformed face still blushes after ${interruption}`,()=>{
 const e=createEngine(source);e.wrapEvent('pointerdown',pointerAt(.335,.67));e.event('pointermove',pointerAt(.12,.67));e.tick();
 if(interruption==='hidden'){e.visibility(true);e.advanceClock(1000);e.visibility(false);}else if(interruption==='lostpointercapture')e.wrapEvent(interruption);else e.event(interruption);
 assert.equal(e.state().pressed,false);let peak=0;
 for(let i=0;i<60;i++){e.tick();peak=Math.max(peak,e.state().blush?.amount??0);}
 assert.equal(peak,1,'Cancelling input must release the mesh, not erase its skin reaction');
 e.event('blur');assert.ok(e.state().blush,'A completed reaction survives focus changes');
});
test('Pointer movement alone never creates or moves a pinch blush',()=>{
 const e=createEngine(source);
 for(const u of [.335,.665,.5]){e.event('pointermove',pointerAt(u,.67));for(let i=0;i<20;i++)e.tick();assert.equal(e.state().blush,null);}
 e.wrapEvent('pointerdown',pointerAt(.335,.67));e.event('pointermove',pointerAt(.12,.67));e.tick();e.event('pointerup');
 for(let i=0;i<20;i++)e.tick();const before=e.state().blush;
 e.event('pointermove',pointerAt(.665,.67));e.tick();const after=e.state().blush;
 assert.equal(after.u,before.u);assert.equal(after.v,before.v);assert.ok(after.amount>0);
});
test('Reduced motion retains colour feedback without mesh deformation',()=>{
 const e=createEngine(source,{reduced:true});e.wrapEvent('pointerdown',pointerAt(.335,.67));e.event('pointermove',pointerAt(.12,.7));for(let i=0;i<20;i++)e.tick();
 assert.ok(e.state().blush.amount>0);assert.equal(e.geometry().maxDisplacement,0);
 e.event('pointerup');e.tick();assert.equal(e.state().blush.amount,1);assert.equal(e.geometry().maxDisplacement,0);
});
test('Fast pulls include the final pointer-up position even without a move or frame',()=>{
 const e=createEngine(source);e.wrapEvent('pointerdown',pointerAt(.335,.67));
 e.event('pointerup',pointerAt(.13,.69));e.tick();
 assert.equal(e.state().blush?.amount,1,'A quick release-only pull must blush');
 e.wrapEvent('lostpointercapture');e.tick();assert.equal(e.state().blush?.amount,1);
});
test('Out-and-back gestures between animation frames still leave a blush',()=>{
 const e=createEngine(source);e.wrapEvent('pointerdown',pointerAt(.335,.67));
 e.event('pointermove',pointerAt(.13,.69));e.event('pointermove',pointerAt(.335,.67));
 e.event('pointerup');e.tick();assert.equal(e.state().blush?.amount,1);
});
test('Coalesced out-and-back pointer samples count as a pull',()=>{
 const e=createEngine(source);e.wrapEvent('pointerdown',pointerAt(.335,.67));
 e.event('pointermove',{...pointerAt(.335,.67),getCoalescedEvents:()=>[pointerAt(.13,.69),pointerAt(.335,.67)]});
 e.event('pointerup');e.tick();assert.equal(e.state().blush?.amount,1);
});
test('Short and normal gestures reliably blush across rendering frame rates',()=>{
 let gestures=0;
 for(const dt of [1000/30,1000/60,1000/120])for(const holdFrames of [0,1,6,24]){
  const e=createEngine(source);e.wrapEvent('pointerdown',pointerAt(.335,.67));
  e.event('pointermove',pointerAt(.13,.69));for(let i=0;i<holdFrames;i++)e.tick(dt);
  e.event('pointerup');let peak=0;for(let i=0;i<60;i++){e.tick(dt);peak=Math.max(peak,e.state().blush?.amount??0);}
  assert.equal(peak,1,`Missing blush at ${dt} ms with ${holdFrames} held frames`);gestures++;
 }
 return {gestures};
});
test('Any nonzero face pull blushes, including a sub-pixel quick return',()=>{
 for(const distance of [.0001,.001,.004,.007]){
  const e=createEngine(source);e.wrapEvent('pointerdown',pointerAt(.335,.67));
  e.event('pointermove',pointerAt(.335-distance,.67));e.event('pointermove',pointerAt(.335,.67));
  e.event('pointerup');let peak=0;
  for(let i=0;i<60;i++){e.tick();peak=Math.max(peak,e.state().blush?.amount??0);}
  assert.equal(peak,1,`Pull of ${distance} failed to blush`);
 }
});
test('Blush grows with elapsed time equally for short and long pulls',()=>{
 const amounts=[];
 for(const distance of [.0001,.001,.004,.02,.2]){
  const e=createEngine(source);e.wrapEvent('pointerdown',pointerAt(.335,.67));
  e.event('pointermove',pointerAt(.335-distance,.67));e.tick();const early=e.state().blush.amount;
  for(let i=0;i<24;i++)e.tick();const amount=e.state().blush.amount;
  assert.ok(early>0&&amount>early&&amount<1);amounts.push(amount);
 }
 assert.ok(Math.max(...amounts)-Math.min(...amounts)<.000001,'Colour strength must not depend on distance');
 return {amounts};
});
console.log(JSON.stringify({results},null,2));
if(results.some(r=>!r.passed))process.exitCode=1;
