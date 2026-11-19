import { useEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import type HlsInstance from 'hls.js'

gsap.registerPlugin(ScrollTrigger)

type ScrollVideoProps = {
  src: string
  className?: string
}

const DOOR_TIMES = [0, 5.5, 11.5]

function timeForPage(progress: number, duration: number) {
  const segment = Math.min(Math.floor(progress * 3), 2)
  const localProgress = progress * 3 - segment
  const times = [...DOOR_TIMES, duration]
  return times[segment] + (times[segment + 1] - times[segment]) * localProgress
}

console.assert(Math.abs(timeForPage(2 / 3, 15) - 11.5) < 0.001)

function ScrollVideo({ src, className = '' }: ScrollVideoProps) {
  const wrapperRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const [progress, setProgress] = useState(0)
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    let hls: HlsInstance | null = null
    let isDisposed = false
    let scrollTrigger: ScrollTrigger | null = null
    let currentTarget = 0
    let seekPending = false
    let duration = 0

    const updateProgress = () => {
      duration = Number.isFinite(video.duration) ? video.duration : duration
      if (!duration || !video.buffered.length) return
      const bufferedEnd = video.buffered.end(video.buffered.length - 1)
      setProgress(Math.min(100, Math.round((bufferedEnd / duration) * 100)))
    }

    const doSeek = () => {
      if (!duration || video.seeking) {
        seekPending = true
        return
      }
      seekPending = false
      if (Math.abs(video.currentTime - currentTarget) > 0.012) {
        video.currentTime = Math.min(Math.max(currentTarget, 0), Math.max(duration - 0.04, 0))
      }
    }

    const createScrollLink = () => {
      duration = video.duration
      scrollTrigger?.kill()
      const stage = document.querySelector<HTMLElement>('.scroll-stage')
      scrollTrigger = ScrollTrigger.create({
        trigger: stage ?? document.documentElement,
        start: 'top top',
        end: 'bottom bottom',
        scrub: true,
        onUpdate: (self) => {
          currentTarget = timeForPage(self.progress, duration)
          doSeek()
        },
      })
      updateProgress()
    }

    const onSeeked = () => {
      if (seekPending) doSeek()
    }
    const onCanPlay = () => {
      setProgress(100)
      setIsReady(true)
      createScrollLink()
    }
    const onError = () => setIsReady(true)

    video.addEventListener('loadedmetadata', createScrollLink)
    video.addEventListener('progress', updateProgress)
    video.addEventListener('seeked', onSeeked)
    video.addEventListener('canplay', onCanPlay)
    video.addEventListener('error', onError)

    const attachSource = async () => {
      const isHls = src.includes('.m3u8')
      if (!isHls || video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = src
        return
      }

      const { default: Hls } = await import('hls.js')
      if (isDisposed) return
      if (!Hls.isSupported()) {
        video.src = src
        return
      }

      hls = new Hls({
        maxBufferLength: 120,
        maxMaxBufferLength: 600,
        maxBufferSize: 200 * 1024 * 1024,
        startPosition: 0,
        capLevelToPlayerSize: false,
        startLevel: -1,
        autoStartLoad: true,
      })
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        if (!hls) return
        const maxLevel = hls.levels.length - 1
        hls.currentLevel = maxLevel
        hls.startLevel = maxLevel
      })
      hls.on(Hls.Events.FRAG_BUFFERED, updateProgress)
      hls.attachMedia(video)
      hls.loadSource(src)
    }
    void attachSource()

    const revealFallback = window.setTimeout(() => setIsReady(true), 10000)

    return () => {
      isDisposed = true
      window.clearTimeout(revealFallback)
      scrollTrigger?.kill()
      hls?.destroy()
      video.removeEventListener('loadedmetadata', createScrollLink)
      video.removeEventListener('progress', updateProgress)
      video.removeEventListener('seeked', onSeeked)
      video.removeEventListener('canplay', onCanPlay)
      video.removeEventListener('error', onError)
      video.removeAttribute('src')
      video.load()
    }
  }, [src])

  useEffect(() => {
    const wrapper = wrapperRef.current
    if (!wrapper) return

    const onMouseMove = (event: MouseEvent) => {
      const moveX = (event.clientX / window.innerWidth - 0.5) * 2
      const moveY = (event.clientY / window.innerHeight - 0.5) * 2
      gsap.to(wrapper, { x: moveX * -30, y: moveY * -30, duration: 1.5, ease: 'power2.out', overwrite: 'auto' })
    }

    window.addEventListener('mousemove', onMouseMove, { passive: true })
    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      gsap.killTweensOf(wrapper)
    }
  }, [])

  return (
    <>
      <div ref={wrapperRef} className={`video-layer ${className}`.trim()} aria-hidden="true">
        <video ref={videoRef} muted playsInline preload="auto" />
      </div>
      <div className={`loading-overlay ${isReady ? 'is-ready' : ''}`} aria-live="polite">
        <div className="loading-copy">
          <span>Loading… {progress}%</span>
          <span className="loading-track"><span className="loading-fill" style={{ width: `${progress}%` }} /></span>
        </div>
      </div>
    </>
  )
}

export default ScrollVideo
