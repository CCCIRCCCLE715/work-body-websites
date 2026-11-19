import fs from 'node:fs';
export function createEngine(sourcePath, {reduced=false}={}) {
  const source=fs.readFileSync(sourcePath,'utf8');
  const config=fs.readFileSync(new URL('../src/portrait-config.ts',import.meta.url),'utf8');
  const portrait=JSON.parse(config.slice(config.indexOf('{'),config.lastIndexOf('}')+1));
  const elements=new Map(),globalEvents=new Map(),documentEvents=new Map();
  let now=100, draws=0;
  const gl=new Proxy({COMPILE_STATUS:1,LINK_STATUS:2,getShaderParameter:()=>true,getProgramParameter:()=>true,getAttribLocation:()=>0,getUniformLocation:()=>({}),createShader:()=>({}),createProgram:()=>({}),createBuffer:()=>({}),createTexture:()=>({}),drawElements:()=>draws++,isContextLost:()=>false},{get:(object,key)=>key in object?object[key]:()=>{}});
  const element=id=>{
    if(elements.has(id))return elements.get(id);
    const events=new Map(),classes=new Set();
    const e={id,style:{},dataset:{},width:680,height:680,addEventListener:(name,fn)=>{if(!events.has(name))events.set(name,[]);events.get(name).push(fn);},getBoundingClientRect:()=>({left:0,top:0,width:680,height:680}),getContext:()=>gl,setPointerCapture(){},releasePointerCapture(){},contains:target=>target===e,classList:{add:c=>classes.add(c),remove:c=>classes.delete(c)},events};
    elements.set(id,e);return e;
  };
  const window={};
  const document={hidden:false,getElementById:element,querySelectorAll:()=>[],addEventListener:(name,fn)=>{if(!documentEvents.has(name))documentEvents.set(name,[]);documentEvents.get(name).push(fn);}};
  const context={window,document,performance:{now:()=>now},console,Float32Array,Uint16Array,Math,Promise,Set,Map,Image:class{},devicePixelRatio:1,scrollY:0,matchMedia:()=>({matches:reduced}),requestAnimationFrame:()=>1,cancelAnimationFrame(){},setTimeout:()=>1,clearTimeout(){},IntersectionObserver:class{observe(){}},ResizeObserver:class{observe(){}},addEventListener:(name,fn)=>{if(!globalEvents.has(name))globalEvents.set(name,[]);globalEvents.get(name).push(fn);}};
  const hook=`
    ready=true; tStart=1; alphaMap=new Uint8ClampedArray(128*128*4).fill(255);
    for(const name of Object.keys(IDS))tex[name]={};
    window.test={rotationNames:[...ROTATION],frame,startAct,endAct,step,takeHold,ux,uy,vx,vy,sx,sy,restX,restY,N,M,SPAN,
      state:()=>({act:!!act,actI,pressed,wantLean:[...wantLean],wantEyes,brush:brush?{u:brush.u,v:brush.v,px:brush.px,py:brush.py}:null,blush:blush?{...blush}:null,leanX,leanY}),
      geometry:()=>{
        let inverted=0,minRatio=1,maxDisplacement=0,finite=true;
        for(let k=0;k<count;k++){maxDisplacement=Math.max(maxDisplacement,Math.hypot(sx[k],sy[k]));if(!Number.isFinite(sx[k]+sy[k]+ux[k]+uy[k]+vx[k]+vy[k]))finite=false;}
        const det=(a,b,c)=>((restX[b]+sx[b]-restX[a]-sx[a])*(restY[c]+sy[c]-restY[a]-sy[a])-(restY[b]+sy[b]-restY[a]-sy[a])*(restX[c]+sx[c]-restX[a]-sx[a]))/(SPAN*SPAN);
        for(let j=0;j<N;j++)for(let i=0;i<N;i++){const a=j*M+i,b=a+1,c=a+M,d=c+1;for(const value of [det(a,b,c),det(b,d,c)]){if(value<=0||!Number.isFinite(value))inverted++;minRatio=Math.min(minRatio,value);}}
        return {inverted,minRatio,maxDisplacement,finite};
      }
    };
  }
  initPortrait();`;
  const start=source.indexOf('    async function loadPictures()');
  if(start<0)throw new Error('Portrait initialization boundary not found');
  const executable=source.slice(0,start).replace(/import \{ portrait \} from '\.\/portrait-config';/,`const portrait=${JSON.stringify(portrait)};`).replace('export function initPortrait','function initPortrait')+hook;
  new Function(...Object.keys(context),executable)(...Object.values(context));
  const api=window.test;
  const dispatch=(map,name,event)=>{for(const fn of map.get(name)||[])fn(event);};
  const pointers=new Map();
  const send=(map,name,event)=>{
    const pointerId=event.pointerId??1;
    const payload={pointerId,clientX:340,clientY:340,...pointers.get(pointerId),preventDefault(){},target:element('magnetWrap'),...event};
    if(name.startsWith('pointer'))pointers.set(pointerId,{clientX:payload.clientX,clientY:payload.clientY});
    dispatch(map,name,payload);
  };
  return {...api,elements,now:()=>now,tick:(ms=1000/60)=>{now+=ms;api.frame(now);},advanceClock:ms=>{now+=ms;},start:name=>api.startAct(name,now),end:()=>api.endAct(),event:(name,event={})=>send(globalEvents,name,event),wrapEvent:(name,event={})=>send(element('magnetWrap').events,name,event),visibility:hidden=>{document.hidden=hidden;dispatch(documentEvents,'visibilitychange',{});},draws:()=>draws};
}
