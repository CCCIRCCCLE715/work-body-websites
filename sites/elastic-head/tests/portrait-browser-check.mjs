import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

// Run through ego-browser nodejs; the caller supplies its managed Page.
export async function checkPortrait(page, {baseUrl, outputDir, recovery = true}) {
  await fs.mkdir(outputDir, {recursive:true});
  const results=[];
  const check=async(name,run)=>{
    try { const details=await run(); results.push({name,passed:true,...details}); }
    catch(error) { results.push({name,passed:false,error:error.message}); }
  };
  const load=async()=>{
    await page.goto(baseUrl);
    await page.waitForFunction(()=>document.querySelector('#faceGl')?.dataset.textureCount==='59',undefined,{timeout:20000});
  };
  const mouse=async(type,x,y,buttons)=>page.cdp('Input.dispatchMouseEvent',{
    type,x,y,buttons,button:buttons||type!=='mouseMoved'?'left':'none',clickCount:type==='mouseMoved'?0:1
  });
  const point=async(u,v)=>page.evaluate(([u,v])=>{
    const r=document.querySelector('#faceGl').getBoundingClientRect();
    return{x:r.x+((u-.5)/1.7+.5)*r.width,y:r.y+((v-.5)/1.7+.5)*r.height};
  },[u,v]);
  const probe=async()=>page.evaluate(()=>{
    const c=document.querySelector('#faceGl'),gl=c.getContext('webgl');
    const q=window.__portraitProbe={frames:[],events:[],capture:null};
    for(const type of ['pointerdown','pointermove','pointerup','pointercancel'])addEventListener(type,e=>q.events.push({type,isTrusted:e.isTrusted,buttons:e.buttons,time:performance.now()}));
    const draw=gl.drawElements.bind(gl);
    gl.drawElements=(...args)=>{
      draw(...args);
      const p=gl.getParameter(gl.CURRENT_PROGRAM),amount=gl.getUniformLocation(p,'blushAmount');
      const strength=gl.getUniform(p,amount);
      q.frames.push({strength,center:Array.from(gl.getUniform(p,gl.getUniformLocation(p,'blushCenter')))});
      if(q.frames.length>600)q.frames.shift();
      if(!q.capture&&strength>.95){
        const actual=new Uint8Array(c.width*c.height*4),base=new Uint8Array(actual.length);
        gl.readPixels(0,0,c.width,c.height,gl.RGBA,gl.UNSIGNED_BYTE,actual);
        gl.uniform1f(amount,0);gl.clear(gl.COLOR_BUFFER_BIT);draw(...args);
        gl.readPixels(0,0,c.width,c.height,gl.RGBA,gl.UNSIGNED_BYTE,base);
        gl.uniform1f(amount,strength);gl.clear(gl.COLOR_BUFFER_BIT);draw(...args);
        let redPixels=0,opaquePixels=0;
        for(let i=0;i<actual.length;i+=4){
          if(actual[i+3]>200)opaquePixels++;
          if(actual[i+3]>200&&base[i+1]-actual[i+1]>3&&actual[i]>=base[i])redPixels++;
        }
        q.capture={redPixels,opaquePixels};
      }
    };
  });
  await check('Moving an unpressed mouse never starts a blush',async()=>{
    await load();await probe();
    for(const [u,v] of [[.335,.67],[.665,.67],[.505,.84]]){
      const p=await point(u,v);await mouse('mouseMoved',p.x,p.y,0);
      const n=await page.evaluate(()=>window.__portraitProbe.frames.length);
      await page.waitForFunction(n=>window.__portraitProbe.frames.length>n+12,n,{timeout:4000});
    }
    const q=await page.evaluate(()=>window.__portraitProbe);
    assert.ok(q.events.every(e=>e.isTrusted&&e.buttons===0));
    assert.ok(q.frames.every(f=>f.strength===0),'Unpressed pointer movement tinted the skin');
    return{inputEvents:q.events.length,frames:q.frames.length};
  });
  await check('A fast pinch visibly reddens skin and mouse movement does not relocate it',async()=>{
    await load();await probe();const p=await point(.335,.67);
    await mouse('mousePressed',p.x,p.y,1);await mouse('mouseMoved',p.x-100,p.y,1);await mouse('mouseReleased',p.x-100,p.y,0);
    await page.waitForFunction(()=>window.__portraitProbe.capture,undefined,{timeout:5000});
    const before=await page.evaluate(()=>window.__portraitProbe),next=await point(.665,.67);
    await mouse('mouseMoved',next.x,next.y,0);
    const n=await page.evaluate(()=>window.__portraitProbe.frames.length);
    await page.waitForFunction(n=>window.__portraitProbe.frames.length>n+5,n,{timeout:4000});
    const after=await page.evaluate(()=>window.__portraitProbe.frames.at(-1));
    assert.ok(before.capture.redPixels>200,'No visible redness in rendered pixels');
    assert.deepEqual(after.center,before.frames.at(-1).center);
    return{pixels:before.capture,events:before.events};
  });
  if(recovery)await check('Context loss keeps an image visible and restores actual interactive pixels',async()=>{
    await load();
    await page.evaluate(()=>{
      const c=document.querySelector('#faceGl');window.__contextEvents=[];
      c.addEventListener('webglcontextlost',e=>window.__contextEvents.push({type:e.type,prevented:e.defaultPrevented}));
      c.addEventListener('webglcontextrestored',e=>window.__contextEvents.push({type:e.type}));
      window.__lossExtension=c.getContext('webgl').getExtension('WEBGL_lose_context');window.__lossExtension.loseContext();
    });
    await page.waitForFunction(()=>window.__contextEvents.some(e=>e.type==='webglcontextlost'),undefined,{timeout:4000});
    const lost=await page.evaluate(()=>{
      const f=document.querySelector('#faceFallback');return{lost:document.querySelector('#faceGl').getContext('webgl').isContextLost(),fallback:getComputedStyle(f).visibility,loaded:f.complete&&f.naturalWidth>0,events:window.__contextEvents};
    });
    await page.screenshot({path:outputDir+'/context-loss.png'});
    assert.equal(lost.fallback,'visible','Context loss hid both the canvas and fallback portrait');
    assert.ok(lost.loaded);assert.equal(lost.events[0].prevented,true);
    await page.evaluate(()=>window.__lossExtension.restoreContext());
    await page.waitForFunction(()=>window.__contextEvents.some(e=>e.type==='webglcontextrestored')&&document.querySelector('#faceGl').dataset.rendererState==='ready'&&document.querySelector('#faceGl').dataset.textureCount==='59',undefined,{timeout:20000});
    await probe();const p=await point(.665,.67);
    await mouse('mousePressed',p.x,p.y,1);await mouse('mouseMoved',p.x+70,p.y,1);await mouse('mouseReleased',p.x+70,p.y,0);
    await page.waitForFunction(()=>window.__portraitProbe.capture,undefined,{timeout:5000});
    const pixels=await page.evaluate(()=>window.__portraitProbe.capture);
    assert.ok(pixels.opaquePixels>10000,'Restored canvas rendered no face');assert.ok(pixels.redPixels>200,'Restored portrait stopped responding');
    return{lost,pixels};
  });
  await fs.writeFile(outputDir+'/browser-results.json',JSON.stringify({baseUrl,results},null,2));
  return results;
}
