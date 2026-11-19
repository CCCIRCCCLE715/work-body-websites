import { useEffect, useRef, useState } from 'react';
import { ArrowDown, ArrowUpRight, Play, Pause, ArrowCounterClockwise, X } from '@phosphor-icons/react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { createWatchScene } from './WatchScene';
import { CHAPTERS, windowed, ramp } from './motion';
import '@fontsource/inter/latin-300.css';
import '@fontsource/inter/latin-400.css';
import '@fontsource/barlow-condensed/latin-300.css';
import '@fontsource/barlow-condensed/latin-400.css';
import '@fontsource/ibm-plex-mono/latin-400.css';
gsap.registerPlugin(ScrollTrigger);

export function App() {
  const pageRef=useRef(null),canvasRef=useRef(null),stageRef=useRef(null),tour=useRef(null),activeRef=useRef(-1);
  const [ready,setReady]=useState(false),[loading,setLoading]=useState(0),[failed,setFailed]=useState(false);
  const [active,setActive]=useState(0),[playing,setPlaying]=useState(false),[details,setDetails]=useState(false);
  const toChapter=index=>{tour.current?.kill();setPlaying(false);const max=document.documentElement.scrollHeight-window.innerHeight;window.scrollTo({top:CHAPTERS[index].at*max,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});};
  const toggleTour=()=>{
    if(playing){tour.current?.kill();setPlaying(false);return;}
    const max=document.documentElement.scrollHeight-window.innerHeight,from=window.scrollY>max*.95?0:window.scrollY;
    if(from===0)window.scrollTo(0,0);const proxy={y:from};setPlaying(true);
    tour.current=gsap.to(proxy,{y:max,duration:46*(1-from/max),ease:'none',onUpdate:()=>window.scrollTo(0,proxy.y),onComplete:()=>setPlaying(false)});
  };
  useEffect(()=>{
    let cancelled=false,scene=null,lastProgress=-1;const motion={p:0};
    const bounds=CHAPTERS.map(chapter=>chapter.bounds);
    const layers=Array.from(stageRef.current.querySelectorAll('[data-layer]'));
    const pct=stageRef.current.querySelector('[data-progress]'),line=stageRef.current.querySelector('[data-progress-line]'),counter=stageRef.current.querySelector('[data-counter]');
    const tick=()=>{
      const p=motion.p;scene?.render(p,performance.now()/1000);if(Math.abs(p-lastProgress)<.00001)return;lastProgress=p;
      const dark=windowed(p,.29,.441,.025),finish=windowed(p,.885,.941,.022),light=[193,207,214],night=[7,11,13],end=[121,134,156];
      const bg=light.map((v,i)=>Math.round((v+(end[i]-v)*finish)*(1-dark)+night[i]*dark));
      stageRef.current.style.backgroundColor=`rgb(${bg.join(',')})`;stageRef.current.classList.toggle('is-dark',dark>.5);stageRef.current.classList.toggle('is-finish',finish>.5);stageRef.current.style.setProperty('--dark-mix',dark);stageRef.current.style.setProperty('--finish-mix',finish);stageRef.current.style.setProperty('--detail-copy',windowed(p,.553,.584,.015));
      layers.forEach((el,i)=>{const[a,b]=bounds[i],opacity=windowed(p,a,b,i===0?.02:.017),appear=1-ramp(p,a-.017,a),exit=ramp(p,b,b+.017);el.style.opacity=opacity;el.style.visibility=opacity<.001?'hidden':'visible';el.style.transform=`translate3d(0,${(appear-exit)*48}px,0)`;el.setAttribute('aria-hidden',opacity<.5?'true':'false');el.inert=opacity<.5;});
      stageRef.current.querySelector('.contours-layer .contours-heading').style.opacity=1-ramp(p,.524,.552);stageRef.current.querySelector('.vertical-type').style.transform=`translateY(${ramp(p,.174,.215)*80}vh)`;
      pct.textContent=`${Math.round(p*100).toString().padStart(2,'0')}%`;line.style.transform=`scaleX(${p})`;
      let index=0;for(let i=1;i<CHAPTERS.length;i++)if(p>=(CHAPTERS[i].at+CHAPTERS[i-1].at)/2)index=i;
      if(index!==activeRef.current){activeRef.current=index;setActive(index);}counter.textContent=`${String(index+1).padStart(2,'0')} / ${CHAPTERS.length}`;
    };
    const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
    const tween=gsap.to(motion,{p:1,ease:'none',scrollTrigger:{trigger:pageRef.current,start:'top top',end:'bottom bottom',scrub:reduced?true:.65,invalidateOnRefresh:true}});
    gsap.ticker.add(tick);
    const stopTour=()=>{tour.current?.kill();setPlaying(false);};
    const onKey=e=>{if(e.key==='Escape')setDetails(false);if(['ArrowDown','ArrowUp','PageDown','PageUp','Home','End',' '].includes(e.key))stopTour();};
    window.addEventListener('wheel',stopTour,{passive:true});window.addEventListener('touchstart',stopTour,{passive:true});window.addEventListener('keydown',onKey);
    createWatchScene(canvasRef.current,v=>{if(cancelled)return;setLoading(Math.round(v*100));if(v===1)setReady(true);},e=>{console.error('Watch loading failed',e);if(!cancelled)setFailed(true);},url=>{if(!cancelled)stageRef.current.style.setProperty('--watch-poster',`url("${url}")`);}).then(result=>{if(cancelled)result?.dispose();else scene=result;}).catch(e=>{console.error(e);if(!cancelled)setFailed(true);});
    document.fonts.ready.then(()=>{if(!cancelled)ScrollTrigger.refresh();});tick();
    return()=>{cancelled=true;gsap.ticker.remove(tick);tween.scrollTrigger?.kill();tween.kill();tour.current?.kill();scene?.dispose();window.removeEventListener('wheel',stopTour);window.removeEventListener('touchstart',stopTour);window.removeEventListener('keydown',onKey);};
  },[]);
  useEffect(()=>{if(details){const d=document.querySelector('dialog');d?.showModal();return()=>d?.close();}},[details]);
  return <main ref={pageRef} id="story" aria-label="FS 50P watch experience">
    <div ref={stageRef} className="stage" data-ready={ready}>
      <div className="studio-backdrop" aria-hidden="true"/>
      <header className="header"><button className="wordmark" onClick={()=>toChapter(0)} aria-label="Back to introduction">FS—50P</button><button className="text-button" onClick={()=>setDetails(true)}>About <ArrowUpRight size={14}/></button></header>
      <div className="editorial-layer hero-layer" data-layer><h1 className="hero-title"><span>FS</span><span>50P</span></h1><div className="hero-model"><span>MODEL</span><strong>146GR</strong></div><div className="hero-color micro"><span>Color</span><b>Silver Steel</b></div></div>
      <div className="editorial-layer timeless-layer" data-layer><span className="timeless-mark">FS–60P</span><h2>THE<br/>TIMELESS</h2><span className="timeless-subtitle">AUTOMATIC</span></div>
      <div className="editorial-layer craft-layer" data-layer><div className="copy-block"><div className="finish-swatches" aria-hidden="true"><i/><i/></div><p className="copy-label">Case &amp; Finishes</p><p className="reference-copy">Crafted with meticulous attention to detail, the case alternates between polished and satin-brushed surfaces, creating subtle contrasts that enhance its presence and reflect light with precision.</p><p className="copy-label">Dial &amp; Complications</p><p className="reference-copy">The dial reveals a layered composition with refined textures and carefully balanced subdials. Each element is designed to ensure clarity, depth, and a distinctive visual identity.</p></div><span className="vertical-type" aria-hidden="true">50P</span><span className="craft-model">FS<br/>— 50P</span></div>
      <div className="editorial-layer explode-layer" data-layer><button className="explore-hint" onClick={()=>toChapter(4)}><span>↻</span> Click to explore</button><div className="parts-legend micro"><span>Crystal</span><span>Hands</span><span>Dial</span><span>Movement</span><span>Case &amp; Bracelet</span></div></div>
      <div className="editorial-layer heart-layer" data-layer><div className="copy-block"><h2>MECHANICAL<br/><span>HEART</span></h2><div className="movement-symbol" aria-hidden="true">◉</div><p className="copy-label">Automatic Movement</p><p className="reference-copy">The movement regulates the balance wheel for<br/>consistent and precise timing.</p><p className="copy-label">Diameter</p><p className="reference-copy">23mm</p></div><span className="large-stat" aria-hidden="true">23″</span></div>
      <div className="editorial-layer precision-layer" data-layer><h2>FS–60P<br/><span>WATCH</span><br/><span>HIGHLY</span></h2><div className="precision-copy"><p className="copy-label">Precision in motion</p><p className="reference-copy">A highly precise movement,<br/>crafted for every moment.</p></div></div>
      <div className="editorial-layer contours-layer" data-layer><div className="contours-heading"><h2>ELEGANT<br/>CONTOURS</h2><p className="body-copy">The watch’s curved dial and refined edges highlight<br/>the craftsmanship and create a refined visual depth.</p></div><div className="contours-side"><p className="copy-label">Refined Dial</p><p className="reference-copy">A clean, elegant dial designed for<br/>readability and timeless appeal.</p><p className="copy-label">Polished Hands</p><p className="reference-copy">Sleek hour and minute hands glide<br/>smoothly, complementing the overall<br/>design.</p><p className="copy-label">Sculpted Bezel</p><p className="reference-copy">The bezel adds depth and<br/>sophistication, highlighting the<br/>watch’s contours and finish.</p></div></div>
      <div className="editorial-layer profile-layer" data-layer><div className="contours-heading"><h2>SLIM<br/>PROFILE</h2><p className="body-copy">The side view highlights the slim, refined silhouette<br/>of the case, with gently curved edges and a<br/>perfectly polished finish.</p></div></div>
      <div className="editorial-layer bracelet-layer" data-layer><h2>BRACELET</h2><p className="body-copy">Crafted from polished steel, the bracelet combines<br/>durability with comfort, perfectly complementing the<br/>watch’s design.</p></div>
      <div className="editorial-layer dimensions-layer" data-layer><div className="watch-card"><span>FS–50P</span><span>Silver Steel</span></div><h2>60MM<br/>WATCH /</h2><div className="dimension-rule"><span>60</span><i/><span>MM</span></div></div>
      <div className="editorial-layer finish-layer" data-layer><h2>SILVER<br/>STEEL</h2><div className="finish-left micro">Silver Steel</div><span className="finish-number micro">03 / 04</span></div>
      <div className="editorial-layer specs-layer" data-layer><div className="specs-photo" aria-hidden="true"/><h2><span>MODEL</span><br/>146GR</h2><div className="specs-list"><div><span>Color</span><b>Silver Steel</b></div><div><span>Dial</span><b>Black</b></div><div><span>Movement</span><b>Quartz</b></div></div><button className="specs-replay" onClick={()=>toChapter(0)}>Replay <ArrowCounterClockwise size={16}/></button></div>
      <canvas ref={canvasRef} className="watch-canvas" aria-label="A silver watch rotating and separating as the page scrolls"/>
      <nav className="chapter-nav" aria-label="Scene navigation">{CHAPTERS.map((c,i)=><button key={c.key} onClick={()=>toChapter(i)} className={i===active?'selected':''} aria-label={`${i+1} ${c.name}`} aria-current={i===active?'step':undefined}><span className="chapter-line"/><span className="chapter-tip">{c.name}</span></button>)}</nav>
      <footer className="footer"><div className="scroll-hint"><ArrowDown size={14}/><span>{active===CHAPTERS.length-1?'Scroll to revisit':'Scroll to explore'}</span></div><span className="current-chapter"><span data-counter>01 / 12</span><span>{CHAPTERS[active].name}</span></span><div className="footer-actions"><button onClick={toggleTour} className="tour-button" disabled={!ready} aria-label={playing?'Pause autoplay':'Autoplay'}>{playing?<Pause size={13} weight="fill"/>:<Play size={13} weight="fill"/>}<span>{playing?'Pause':'Autoplay'}</span></button><span className="progress-number" data-progress>00%</span></div></footer>
      <div className="progress-track"><div data-progress-line/></div>
      {!ready&&<div className="loading-screen" role="status"><span className="loading-brand">FS—50P</span><p>{failed?'Unable to load the experience':'Loading the experience'}</p><span className="loading-number">{loading.toString().padStart(2,'0')}<small> / 100</small></span>{failed&&<button onClick={()=>window.location.reload()}>Reload</button>}</div>}
    </div>
    {details&&<dialog className="info-dialog" onCancel={()=>setDetails(false)} onClick={e=>{if(e.target===e.currentTarget)setDetails(false);}}><div className="dialog-inner"><button className="close-dialog" onClick={()=>setDetails(false)} aria-label="Close about"><X size={20}/></button><p className="eyebrow">ABOUT THE EXPERIENCE</p><h2>Time in motion.</h2><p>Scroll to rotate the watch, explore its layers and move through the details. Use scene navigation or autoplay to view the complete sequence.</p><p>A visual recreation of the supplied reference video. The case and dial use a public demonstration model. The bracelet was rebuilt, and the movement was reconstructed in Blender using a Lux3D model as a layout reference. Displayed model names and measurements follow the reference presentation and are not verified product specifications.</p><a href="https://github.com/repalash/threepipe" target="_blank" rel="noreferrer">Model source <ArrowUpRight size={14}/></a></div></dialog>}
    <div className="sr-only">Use a mouse wheel, trackpad, touch or arrow keys to explore. Scene navigation jumps to each chapter.</div>
  </main>;
}
