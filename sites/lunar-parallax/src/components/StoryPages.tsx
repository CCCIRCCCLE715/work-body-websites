import { useLayoutEffect, useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

const gallery = [
  { src: '/images/astronaut-selfie.jpg', alt: 'Astronaut taking a self portrait on the Moon', label: 'LUNAR GROUND / 01', className: 'gallery-ground' },
  { src: '/images/orbital-station.jpg', alt: 'Orbital station above Earth', label: 'LOW ORBIT / 02', className: 'gallery-orbit' },
  { src: '/images/earth-portrait.jpg', alt: 'Earth seen from space', label: 'BLUE MARBLE / 03', className: 'gallery-earth' },
  { src: '/images/lunar-horizon.jpg', alt: 'Lunar surface beneath a distant planet', label: 'LUNAR HORIZON / 04', className: 'gallery-observer' },
]

export default function StoryPages() {
  const rootRef = useRef<HTMLDivElement>(null)
  const secondRef = useRef<HTMLElement>(null)
  const thirdRef = useRef<HTMLElement>(null)

  useLayoutEffect(() => {
    const context = gsap.context(() => {
      gsap.timeline({ scrollTrigger: { trigger: secondRef.current, start: 'top-=8% top', end: 'bottom top', scrub: 1 } })
        .fromTo('.second-page-overlay', { autoAlpha: 0 }, { autoAlpha: 1, duration: .1, ease: 'none' })
        .fromTo('.kinetic-line', { xPercent: (index) => index % 2 ? 16 : -16, opacity: 0 }, { xPercent: 0, opacity: 1, stagger: .08, duration: .32, ease: 'power2.out' }, '<')
        .fromTo('.second-page-meta', { y: 24, opacity: 0 }, { y: 0, opacity: 1, duration: .2 }, '<.08')
        .to('.kinetic-line', { yPercent: -35, opacity: 0, stagger: .035, duration: .18 }, .8)
        .to('.second-page-meta', { opacity: 0, duration: .12 }, .84)
        .to('.second-page-overlay', { autoAlpha: 0, duration: .1, ease: 'none' })

      gsap.timeline({
        scrollTrigger: {
          trigger: thirdRef.current,
          start: 'top-=8% top',
          end: 'bottom bottom',
          scrub: 1,
        },
      })
        .fromTo('.third-page-overlay', { autoAlpha: 0 }, { autoAlpha: 1, duration: .1, ease: 'none' })
        .fromTo('.final-copy > *', { y: 36, opacity: 0 }, { y: 0, opacity: 1, stagger: .08, duration: .32, ease: 'power2.out' }, '<')
        .fromTo('.gallery-card', { y: 90, rotation: (index) => index % 2 ? 2 : -2, opacity: 0 }, { y: 0, rotation: 0, opacity: 1, stagger: .07, duration: .42, ease: 'power3.out' }, '<.04')
    }, rootRef)

    return () => context.revert()
  }, [])

  return (
    <div ref={rootRef} className="story-pages">
      <section ref={secondRef} id="room-02" className="story-page story-page-two" aria-labelledby="room-two-title">
        <div className="story-overlay second-page-overlay">
          <p className="second-page-meta">LUNAR HABITAT · ROOM 02 · 384,400 KM FROM HOME</p>
          <h2 id="room-two-title" className="kinetic-title">
            <span className="kinetic-line">LIFE</span>
            <span className="kinetic-line kinetic-line-serif">FINDS</span>
            <span className="kinetic-line">A WAY</span>
          </h2>
          <p className="second-page-foot">FROM BARREN ORBIT TO A LIVING HORIZON</p>
        </div>
      </section>

      <section ref={thirdRef} id="room-03" className="story-page story-page-three" aria-labelledby="room-three-title">
        <div className="story-overlay third-page-overlay">
          <div className="final-copy">
            <p className="page-index">03 / THE LIVING ARCHIVE</p>
            <h2 id="room-three-title">A NEW<br /><em>BLUEPRINT</em><br />FOR LIFE.</h2>
            <p className="final-intro">Three rooms. Two thresholds. One habitat learning to bloom beyond Earth.</p>
          </div>
          <div className="gallery-grid">
            {gallery.map((image) => (
              <figure className={`gallery-card ${image.className}`} key={image.src}>
                <img src={image.src} alt={image.alt} />
                <figcaption>{image.label}</figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
