import { useLayoutEffect, useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

const BRANDS = ['VOICEFLOW', 'ZENDESK', 'PENDO', 'GLIDE', 'CANVA']

function BrandGroup({ hidden = false }: { hidden?: boolean }) {
  return (
    <div className="marquee-group" aria-hidden={hidden}>
      {BRANDS.map((brand) => <span className="brand-name" key={brand}>{brand}</span>)}
    </div>
  )
}

function GlassPanel() {
  const sectionRef = useRef<HTMLElement>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    const section = sectionRef.current
    const wrapper = wrapperRef.current
    const panel = panelRef.current
    if (!section || !wrapper || !panel) return

    const context = gsap.context(() => {
      gsap.fromTo(wrapper, { y: '100%' }, {
        y: '0%', ease: 'none',
        scrollTrigger: { trigger: section, start: 'top bottom', end: 'bottom bottom', scrub: 1.5 },
      })
    }, section)

    const onMouseMove = (event: MouseEvent) => {
      const bounds = panel.getBoundingClientRect()
      const moveX = ((event.clientX - bounds.left) / bounds.width - 0.5) * 2
      const moveY = ((event.clientY - bounds.top) / bounds.height - 0.5) * 2
      gsap.to(panel, { x: moveX * 20, y: moveY * 20, rotationY: moveX * 4, rotationX: -moveY * 4, ease: 'power3.out', duration: 1, overwrite: 'auto' })
    }
    const onMouseLeave = () => gsap.to(panel, { x: 0, y: 0, rotationX: 0, rotationY: 0, duration: 1, ease: 'power3.out' })

    panel.addEventListener('mousemove', onMouseMove, { passive: true })
    panel.addEventListener('mouseleave', onMouseLeave)
    return () => {
      panel.removeEventListener('mousemove', onMouseMove)
      panel.removeEventListener('mouseleave', onMouseLeave)
      gsap.killTweensOf(panel)
      context.revert()
    }
  }, [])

  return (
    <section ref={sectionRef} className="glass-section" aria-labelledby="about-heading">
      <div ref={wrapperRef} className="glass-wrapper">
        <div ref={panelRef} className="glass-panel">
          <div className="glass-content">
            <p className="glass-kicker">About Us</p>
            <h2 id="about-heading" className="glass-heading">
              We transform sterile concrete into thriving <em>urban</em> jungles. Our innovative designs bring wild <em>nature</em> back to modern cities. Experience the <em>bloom</em>
            </h2>
          </div>
          <div className="marquee-shell" aria-label={`Selected collaborators: ${BRANDS.join(', ')}`}>
            <div className="marquee-track">
              <BrandGroup />
              <BrandGroup hidden />
              <BrandGroup hidden />
              <BrandGroup hidden />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default GlassPanel
