import { useLayoutEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { ScrollToPlugin } from 'gsap/ScrollToPlugin'

gsap.registerPlugin(ScrollToPlugin)

type NavItem = { label: string; progress: number }

const NAV_ITEMS: NavItem[] = [
  { label: 'ROOM 01', progress: 0 },
  { label: 'ROOM 02', progress: 1 / 3 },
  { label: 'ROOM 03', progress: 2 / 3 },
]

function goToProgress(progress: number) {
  const scrollRange = document.documentElement.scrollHeight - window.innerHeight
  gsap.to(window, { duration: 3, scrollTo: progress * scrollRange, ease: 'power3.inOut' })
}

function Pill({ item, active }: { item: NavItem; active: boolean }) {
  const pillRef = useRef<HTMLButtonElement>(null)
  const circleRef = useRef<HTMLSpanElement>(null)
  const labelRef = useRef<HTMLSpanElement>(null)
  const hoverLabelRef = useRef<HTMLSpanElement>(null)
  const timelineRef = useRef<gsap.core.Timeline | null>(null)

  useLayoutEffect(() => {
    const pill = pillRef.current
    const circle = circleRef.current
    const label = labelRef.current
    const hoverLabel = hoverLabelRef.current
    if (!pill || !circle || !label || !hoverLabel) return

    const { width: w, height: h } = pill.getBoundingClientRect()
    const radius = (w * w / 4 + h * h) / (2 * h)
    const diameter = radius * 2 + 2
    const delta = radius - Math.sqrt(Math.max(radius * radius - w * w / 4, 0)) + 1

    gsap.set(circle, {
      width: diameter,
      height: diameter,
      left: '50%',
      xPercent: -50,
      bottom: -delta,
      transformOrigin: `50% ${diameter - delta}px`,
      scale: 0,
    })
    timelineRef.current = gsap.timeline({ paused: true })
      .to(circle, { scale: 3, duration: .3, ease: 'power2.inOut' }, 0)
      .to(label, { yPercent: -110, duration: .3, ease: 'power2.inOut' }, 0)
      .to(hoverLabel, { yPercent: -100, duration: .3, ease: 'power2.inOut' }, 0)

    return () => {
      timelineRef.current?.kill()
    }
  }, [])

  const enter = () => timelineRef.current?.timeScale(1).play()
  const leave = () => timelineRef.current?.timeScale(1.5).reverse()

  return (
    <li>
      <button
        ref={pillRef}
        className={`pill ${active ? 'is-active' : ''}`}
        type="button"
        onClick={() => goToProgress(item.progress)}
        onMouseEnter={enter}
        onMouseLeave={leave}
        onFocus={enter}
        onBlur={leave}
        aria-current={active ? 'page' : undefined}
      >
        <span ref={circleRef} className="hover-circle" />
        <span className="label-stack">
          <span ref={labelRef} className="pill-label">{item.label}</span>
          <span ref={hoverLabelRef} className="pill-label-hover" aria-hidden="true">{item.label}</span>
        </span>
      </button>
    </li>
  )
}

function FlowerMark() {
  return (
    <svg width="24" height="24" viewBox="0 0 100 100" fill="white" aria-hidden="true">
      <path d="m50 50c0 18.2 14.77 32.98 32.97 32.98C82.97 64.78 68.2 50 50 50Z" />
      <path d="M17.02 82.98C35.22 82.98 50 68.21 50 50c-18.2 0-32.98 14.77-32.98 32.98Z" />
      <path d="M82.98 17.02C64.78 17.02 50.01 31.79 50.01 49.99c18.2 0 32.97-14.77 32.97-32.97Z" />
      <path d="M17.02 17.02c0 18.2 14.77 32.97 32.98 32.97 0-18.2-14.77-32.97-32.98-32.97Z" />
    </svg>
  )
}

function PillNav() {
  const rootRef = useRef<HTMLElement>(null)
  const logoRef = useRef<HTMLSpanElement>(null)
  const itemsRef = useRef<HTMLDivElement>(null)
  const topLineRef = useRef<HTMLSpanElement>(null)
  const bottomLineRef = useRef<HTMLSpanElement>(null)
  const popoverRef = useRef<HTMLDivElement>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [active, setActive] = useState('ROOM 01')

  useLayoutEffect(() => {
    const logo = logoRef.current
    const items = itemsRef.current
    if (!logo || !items) return

    const context = gsap.context(() => {
      const width = items.scrollWidth
      gsap.fromTo(logo, { scale: 0 }, { scale: 1, duration: .6, ease: 'back.out(1.7)' })
      gsap.fromTo(items, { width: 0, opacity: 0 }, { width, opacity: 1, duration: .6, ease: 'power3.out', clearProps: 'width' })
    }, rootRef)

    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight
      const progress = max > 0 ? window.scrollY / max : 0
      setActive(progress < 1 / 6 ? 'ROOM 01' : progress < 1 / 2 ? 'ROOM 02' : 'ROOM 03')
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => {
      window.removeEventListener('scroll', onScroll)
      context.revert()
    }
  }, [])

  useLayoutEffect(() => {
    const top = topLineRef.current
    const bottom = bottomLineRef.current
    const popover = popoverRef.current
    if (!top || !bottom || !popover) return

    gsap.to(top, { rotation: menuOpen ? 45 : 0, y: menuOpen ? 3.25 : 0, duration: .25 })
    gsap.to(bottom, { rotation: menuOpen ? -45 : 0, y: menuOpen ? -3.25 : 0, duration: .25 })
    gsap.to(popover, { autoAlpha: menuOpen ? 1 : 0, y: menuOpen ? 0 : -8, duration: .25, pointerEvents: menuOpen ? 'auto' : 'none' })
  }, [menuOpen])

  const rotateLogo = () => {
    if (logoRef.current) gsap.to(logoRef.current, { rotation: '+=360', duration: .2, ease: 'power2.out' })
  }

  return (
    <nav ref={rootRef} className="pill-nav-container" aria-label="Primary navigation">
      <div className="pill-nav">
        <button className="pill-logo" type="button" onClick={() => goToProgress(0)} onMouseEnter={rotateLogo} aria-label="Back to top">
          <span ref={logoRef} className="logo-svg-container"><FlowerMark /></span>
        </button>
        <div ref={itemsRef} className="pill-nav-items desktop-only">
          <ul className="pill-list">
            {NAV_ITEMS.map((item) => <Pill key={item.label} item={item} active={active === item.label} />)}
          </ul>
        </div>
        <button
          className="mobile-menu-button mobile-only"
          type="button"
          onClick={() => setMenuOpen((open) => !open)}
          aria-label="Toggle navigation"
          aria-expanded={menuOpen}
        >
          <span ref={topLineRef} className="hamburger-line" />
          <span ref={bottomLineRef} className="hamburger-line" />
        </button>
        <div ref={popoverRef} className="mobile-menu-popover mobile-only" style={{ visibility: 'hidden' }}>
          <ul className="mobile-menu-list">
            {NAV_ITEMS.map((item) => (
              <li key={item.label}>
                <button className="mobile-menu-link" type="button" onClick={() => { goToProgress(item.progress); setMenuOpen(false) }}>
                  {item.label}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </nav>
  )
}

export default PillNav
