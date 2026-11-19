import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { motion, useScroll, useTransform, useReducedMotion, MotionConfig } from 'framer-motion';
import { ArrowUpRight, ArrowDown, X, ArrowLeft, ArrowRight } from 'lucide-react';
import { portfolio } from './content';
import { initPortrait } from './portrait-engine';
import './style.css';
import './portrait.css';

type Project = typeof portfolio.projects[number];
const ease = [0.23, 1, 0.32, 1] as const;
function FadeIn({ children, delay = 0, className = '' }: { children: React.ReactNode; delay?: number; className?: string }) {
  const reduce = useReducedMotion();
  return <motion.div className={className} initial={{ opacity: 0, transform: reduce ? 'none' : 'translateY(30px)' }} whileInView={{ opacity: 1, transform: 'translateY(0px)' }} viewport={{ once: true, amount: 0.05 }} transition={{ delay, duration: 0.7, ease }}>{children}</motion.div>;
}
function ContactButton() {
  return <a className="contact-btn" href="#contact"><span>Contact me</span><ArrowUpRight size={18} aria-hidden="true" /></a>;
}
function LivingPortrait() {
  useEffect(() => { initPortrait(); }, []);
  return <div className="hero-portrait-wrap" id="magnetWrap" aria-label="Interactive portrait. Move your pointer, tap a feature, or drag gently.">
    <div className="hero-portrait-inner" id="magnetInner">
      <img id="faceFallback" src="/assets/huangbai-portrait-v10/closed.webp" alt="Huangbai's interactive portrait" fetchPriority="high" draggable={false} />
      <canvas id="faceGl" aria-hidden="true" />
      <div id="faceProps" aria-hidden="true">
        <svg id="faceFly" viewBox="0 0 32 32"><path className="wing" d="M15 15C12 9.5 4.5 8.5 2 13c2.5 4.5 10 4.5 13 2z"/><path className="wing r" d="M17 15c3-5.5 10.5-6.5 13-2-2.5 4.5-10 4.5-13 2z"/><ellipse cx="16" cy="19.5" rx="4" ry="6.5"/><circle cx="16" cy="11.5" r="3.3"/></svg>
      </div>
    </div>
  </div>;
}
function Hero() {
  return <section className="hero" id="home">
    <FadeIn className="nav-wrap"><nav aria-label="Main navigation">{[['About', '#about'], ['Price', '#services'], ['Projects', '#projects'], ['Contact', '#contact']].map(([label, href]) => <a key={href} href={href}>{label}</a>)}</nav></FadeIn>
    <FadeIn className="hero-title-wrap" delay={0.15}>
      <h1 className="hero-heading hero-title" aria-label={portfolio.title}>
        <svg width="100%" height="100%" aria-hidden="true">
          <defs>
            <text id="hero-title-letters" x="50%" y=".82em" textAnchor="middle">{portfolio.title}</text>
            <mask id="hero-title-mask"><use href="#hero-title-letters" fill="white" /></mask>
            <linearGradient id="hero-title-base" gradientUnits="userSpaceOnUse" x1="0" y1=".16em" x2="0" y2=".83em">
              <stop stopColor="#888888" />
              <stop offset=".55" stopColor="#d4d4d4" />
              <stop offset="1" stopColor="#fafafa" />
            </linearGradient>
            <linearGradient id="hero-title-light">
              <stop stopColor="#d8d7d3" stopOpacity="0" />
              <stop offset=".25" stopColor="#d8d7d3" stopOpacity=".15" />
              <stop offset=".5" stopColor="#d8d7d3" />
              <stop offset=".75" stopColor="#d8d7d3" stopOpacity=".15" />
              <stop offset="1" stopColor="#d8d7d3" stopOpacity="0" />
            </linearGradient>
          </defs>
          <use href="#hero-title-letters" fill="url(#hero-title-base)" />
          <g mask="url(#hero-title-mask)"><rect className="title-sheen" width="80%" height="100%" fill="url(#hero-title-light)" /></g>
        </svg>
      </h1>
    </FadeIn>
    <LivingPortrait />
    <div className="hero-bottom"><FadeIn delay={0.35}><p>{portfolio.intro}</p></FadeIn><a className="scroll-cue" href="#work" aria-label="Scroll to selected work"><ArrowDown size={22}/></a><FadeIn delay={0.5}><ContactButton /></FadeIn></div>
  </section>;
}
function Marquee() {
  const section = useRef<HTMLElement>(null);
  const [travel, setTravel] = useState(0);
  useEffect(() => {
    const element = section.current!;
    const measure = () => setTravel(Math.max(0, element.firstElementChild!.scrollWidth - element.clientWidth));
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    observer.observe(element.firstElementChild!);
    measure();
    return () => observer.disconnect();
  }, []);
  const { scrollYProgress } = useScroll({ target: section, offset: ['start end', 'end start'] });
  const x1 = useTransform(scrollYProgress, [0, 1], ['translateX(0px)', `translateX(-${travel}px)`]);
  const x2 = useTransform(scrollYProgress, [0, 1], [`translateX(-${travel}px)`, 'translateX(0px)']);
  const reduce = useReducedMotion();

  return <section className="marquee" ref={section} id="work" aria-label="Past video covers">
    {[portfolio.videoCovers.slice(0, 6), portfolio.videoCovers.slice(6)].map((row, i) => <motion.div className="marquee-row" key={i} style={{ transform: reduce ? 'none' : i === 0 ? x1 : x2 }}>
      {row.map(cover => <img key={cover.src} src={cover.src} alt={`${cover.title}视频封面`} loading="lazy" decoding="async" width="1086" height="1448" />)}
    </motion.div>)}
  </section>;
}
function Letter({ char, index, total, progress }: { char: string; index: number; total: number; progress: ReturnType<typeof useScroll>['scrollYProgress'] }) {
  const opacity = useTransform(progress, [index / total, (index + 1) / total], [0.2, 1]);
  return <motion.span style={{ opacity }}>{char}</motion.span>;
}
function About() {
  const text = useRef<HTMLParagraphElement>(null);
  const { scrollYProgress } = useScroll({ target: text, offset: ['start 0.8', 'end 0.2'] });
  const reduce = useReducedMotion();
  return <section className="about section-pad" id="about">
    {portfolio.decorations.map((src, i) => <FadeIn key={src} delay={0.1 + i * 0.05} className={`decoration decoration-${i}`}><img src={src} alt="" loading="lazy" /></FadeIn>)}
    <FadeIn><h2 className="hero-heading section-heading">About me</h2></FadeIn>
    <p ref={text} className="about-copy" aria-label={portfolio.about}>{reduce ? portfolio.about : <span aria-hidden="true">{portfolio.about.split(' ').map((word, w, words) => { const start = words.slice(0, w).join(' ').length + (w ? 1 : 0); return <React.Fragment key={w}><span className="word">{Array.from(word).map((char, i) => <Letter key={i} char={char} index={start + i} total={portfolio.about.length} progress={scrollYProgress}/>)}</span>{' '}</React.Fragment>; })}</span>}</p>
    <FadeIn><ContactButton /></FadeIn>
  </section>;
}
function Services() {
  return <section className="services section-pad" id="services"><FadeIn><h2 className="section-heading">Services</h2></FadeIn><div className="service-list">{portfolio.services.map((item, i) => <FadeIn key={item.name} delay={i * 0.05}><article className="service"><span className="service-number">{String(i + 1).padStart(2, '0')}</span><div><h3>{item.name}</h3><p>{item.description}</p></div></article></FadeIn>)}</div></section>;
}
function ProjectCard({ project, index, progress, onOpen }: { project: Project; index: number; progress: ReturnType<typeof useScroll>['scrollYProgress']; onOpen: () => void }) {
  const reduce = useReducedMotion();
  const scale = useTransform(progress, [index / 3, 1], ['scale(1)', `scale(${1 - (2 - index) * 0.03})`]);
  return <div className="project-stage" style={{ top: `calc(var(--stack-top) + ${index * 28}px)` }}><motion.article className="project-card" style={{ transform: reduce ? 'none' : scale }}>
    <div className="project-top"><span className="project-number">{String(index + 1).padStart(2, '0')}</span><div className="project-title"><span>{project.category}</span><h3>{project.name}</h3></div><button className="outline-btn" onClick={onOpen}>Live project <ArrowUpRight size={18}/></button></div>
    <button className="project-images" onClick={onOpen} aria-label={`View ${project.name}`}><div className="project-images-left"><img src={project.images[0]} alt={`${project.name} — detail`} loading="lazy"/><img src={project.images[1]} alt={`${project.name} — visual system`} loading="lazy"/></div><img className="project-image-main" src={project.images[2]} alt={`${project.name} — main artwork`} loading="lazy"/></button>
  </motion.article></div>;
}
function Projects({ onOpen }: { onOpen: (p: Project) => void }) {
  const section = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: section, offset: ['start start', 'end end'] });
  return <section className="projects section-pad" id="projects"><FadeIn><h2 className="hero-heading section-heading">Project</h2></FadeIn><div className="project-stack" ref={section}>{portfolio.projects.map((project, i) => <ProjectCard key={project.name} project={project} index={i} progress={scrollYProgress} onOpen={() => onOpen(project)}/>)}</div></section>;
}
function ProjectDialog({ project, onClose }: { project: Project | null; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [image, setImage] = useState(0);
  useEffect(() => { if (project) { setImage(0); dialog.current?.showModal(); document.body.style.overflow = 'hidden'; } return () => { document.body.style.overflow = ''; }; }, [project]);
  return <dialog ref={dialog} className="project-dialog" onClose={onClose} onClick={e => { if (e.target === e.currentTarget) dialog.current?.close(); }}>
    {project && <div className="dialog-content"><div className="dialog-top"><div><p>{project.discipline}</p><h2>{project.name}</h2></div><button className="icon-btn" autoFocus onClick={() => dialog.current?.close()} aria-label="Close project"><X/></button></div><img className="gallery-image" src={project.images[image]} alt={`${project.name}, image ${image + 1}`}/><div className="gallery-bottom"><button className="icon-btn" aria-label="Previous image" onClick={() => setImage((image + 2) % 3)}><ArrowLeft/></button><span>{String(image + 1).padStart(2, '0')} / 03</span><button className="icon-btn" aria-label="Next image" onClick={() => setImage((image + 1) % 3)}><ArrowRight/></button>{project.url && <a className="outline-btn" href={project.url} target="_blank" rel="noreferrer">Visit project <ArrowUpRight size={18}/></a>}</div></div>}
  </dialog>;
}
function Contact() {
  return <footer id="contact" className="contact-section section-pad"><FadeIn><p className="eyebrow">Have something in mind?</p><h2 className="hero-heading">Let's make<br/>it happen.</h2>{portfolio.email ? <a className="contact-btn" href={`mailto:${portfolio.email}`}>Let's talk <ArrowUpRight size={18}/></a> : <a className="contact-btn" href="#home">Meet {portfolio.name} <ArrowUpRight size={18}/></a>}</FadeIn><div className="footer-bottom"><a href="#home">{portfolio.name} — {portfolio.role}</a><span>© {new Date().getFullYear()}</span><a href="#home">Back to top ↑</a></div></footer>;
}
function App() {
  const [project, setProject] = useState<Project | null>(null);
  return <MotionConfig reducedMotion="user"><main><Hero/><Marquee/><About/><Services/><Projects onOpen={setProject}/><Contact/></main><ProjectDialog project={project} onClose={() => setProject(null)}/></MotionConfig>;
}
createRoot(document.getElementById('root')!).render(<App/>);
