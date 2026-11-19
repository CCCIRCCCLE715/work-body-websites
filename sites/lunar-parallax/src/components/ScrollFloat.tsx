import { useLayoutEffect, useRef, type CSSProperties } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

type ScrollFloatProps = { children: string }

const GLYPH_WIDTHS: Record<string, number> = {
  A: 82,
  B: 101,
  C: 118,
  D: 108,
  E: 132,
  G: 111,
  H: 84,
  I: 54,
  M: 126,
  N: 96,
  O: 138,
  P: 96,
  R: 101,
  S: 82,
  T: 91,
  U: 98,
  W: 145,
  Y: 92,
}

function glyphStyle(character: string): CSSProperties {
  return { '--glyph-width': GLYPH_WIDTHS[character.toUpperCase()] ?? 100 } as CSSProperties
}

function ScrollFloat({ children }: ScrollFloatProps) {
  const rootRef = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    const page = rootRef.current?.parentElement
    if (!page) return

    const context = gsap.context(() => {
      gsap.fromTo(
        '.char',
        { opacity: 1, yPercent: 0, scaleY: 1, scaleX: 1, transformOrigin: '50% 0%' },
        {
          opacity: 0,
          yPercent: 250,
          scaleY: 1.2,
          scaleX: 0.9,
          stagger: 0.05,
          ease: 'power2.inOut',
          duration: 1,
          scrollTrigger: { trigger: page, start: 'top top', end: 'bottom top', scrub: 1 },
        },
      )
    }, rootRef)
    return () => context.revert()
  }, [])

  return (
    <div ref={rootRef} className="scroll-float-wrap">
      <h1 className="scroll-float-text" aria-label={children.replace('\n', ' ')}>
        {children.split('\n').map((line, lineIndex) => (
          <span key={`${line}-${lineIndex}`} style={{ display: 'block' }} aria-hidden="true">
            {line.split(' ').map((word, wordIndex, words) => (
              <span key={`${word}-${wordIndex}`}>
                <span style={{ display: 'inline-block', whiteSpace: 'nowrap' }}>
                  {Array.from(word).map((character, characterIndex) => {
                    const isInitial = characterIndex === 0
                    const isCustomW = !isInitial && character.toUpperCase() === 'W'

                    return (
                      <span
                        className={`char ${isInitial ? 'char-ornamental' : 'char-grotesk'} ${isCustomW ? 'char-custom-w' : ''}`}
                        key={`${character}-${characterIndex}`}
                        style={isInitial ? undefined : glyphStyle(character)}
                      >
                        {character}
                      </span>
                    )
                  })}
                </span>
                {wordIndex < words.length - 1 ? '\u00a0' : null}
              </span>
            ))}
          </span>
        ))}
      </h1>
    </div>
  )
}

export default ScrollFloat
