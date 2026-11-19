import PillNav from './components/PillNav'
import ScrollFloat from './components/ScrollFloat'
import ScrollVideo from './components/ScrollVideo'
import StoryPages from './components/StoryPages'

const HERO_VIDEO = '/videos/lunar-capsule-scroll-1440p60.mp4'

export default function App() {
  return (
    <main className="site-shell">
      <ScrollVideo src={HERO_VIDEO} />
      <PillNav />
      <div className="scroll-stage" aria-label="Three-room lunar capsule journey">
        <section id="room-01" className="scroll-page scroll-page-one" aria-label="Room one">
          <ScrollFloat>{`HUANGBAI\nDESIGN`}</ScrollFloat>
        </section>
        <StoryPages />
      </div>
    </main>
  )
}
