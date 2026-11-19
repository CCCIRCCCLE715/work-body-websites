# HUANGBAI Lunar Parallax — OJO handoff

This is the complete editable React 19 + Vite + Tailwind CSS + GSAP source project. All visual assets and fonts are stored locally in `public/`; the experience does not depend on remote images or font services.

## Run and build

```bash
npm install
npm run dev
npm run build
```

## Files that must remain in the project

- `public/videos/lunar-capsule-scroll-1440p60.mp4` — 2560×1440, 60 fps scroll-scrubbed master video
- `public/images/` — permanent Room 03 editorial images
- `public/fonts/` and `public/Dirtyline-36daysoftype-2022.woff2` — all locally hosted display/body fonts

## Interaction contract

- Room 01: video time `0–5.5s`
- Room 02 begins at the first door opening: `5.5s`
- Room 03 begins at the second door opening: `11.5s`
- Video duration: approximately `15.0667s`

The scroll-to-video mapping lives in `src/components/ScrollVideo.tsx`. Page overlay entrances and reversible exits live in `src/components/StoryPages.tsx`; keep the reverse fade behavior so the dark gradients disappear when scrolling back to Room 01.
