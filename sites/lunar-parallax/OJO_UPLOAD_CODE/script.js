/*
  OJO ASSET MANIFEST
  If OJO renames an uploaded asset or returns a hosted URL, change only the
  matching value below. Do not change the scroll timing code.
*/
const ASSETS = {
  video: "./lunar-capsule-scroll-1440p60.mp4",
  ground: "./26d8d3b982f2426e333b0411cf044c29.jpg",
  orbit: "./6ba7642bb5c41f0f8410a075cab00e89.jpg",
  earth: "./bc77a9cdf277bbdaf601d459f9eb45ee.jpg",
  horizon: "./aa98f2736dd3996cca29226c9b4f6a10.jpg",
};

const DOOR_TIMES = [0, 5.5, 11.5];
const EXPECTED_DURATION = 15.0667;
const GLYPH_WIDTHS = { A: 82, B: 101, C: 118, D: 108, E: 132, G: 111, H: 84, I: 54, M: 126, N: 96, O: 138, P: 96, R: 101, S: 82, T: 91, U: 98, W: 145, Y: 92 };

const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));
const range = (value, start, end) => clamp((value - start) / (end - start));
const easeOut = (value) => 1 - Math.pow(1 - clamp(value), 3);
const easeInOut = (value) => {
  const t = clamp(value);
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
};

const video = document.querySelector("#scroll-video");
const videoLayer = document.querySelector(".video-layer");
const loading = document.querySelector(".loading-overlay");
const loadingLabel = document.querySelector("#loading-label");
const loadingFill = document.querySelector(".loading-fill");
const heroTitle = document.querySelector("#hero-title");
const roomTwoOverlay = document.querySelector(".second-page-overlay");
const roomTwoLines = [...document.querySelectorAll(".kinetic-line")];
const roomTwoMeta = document.querySelector(".second-page-meta");
const roomTwoFoot = document.querySelector(".second-page-foot");
const roomThreeOverlay = document.querySelector(".third-page-overlay");
const finalCopyItems = [...document.querySelectorAll(".final-copy > *")];
const galleryCards = [...document.querySelectorAll(".gallery-card")];
const desktopPills = [...document.querySelectorAll(".desktop-nav .pill")];
const menuButton = document.querySelector(".mobile-menu-button");
const mobileMenu = document.querySelector(".mobile-menu");

video.src = ASSETS.video;
document.querySelectorAll("img[data-asset]").forEach((image) => {
  image.src = ASSETS[image.dataset.asset];
});

function buildHeroTitle() {
  ["HUANGBAI", "DESIGN"].forEach((word) => {
    const line = document.createElement("span");
    line.className = "title-line";
    const wordElement = document.createElement("span");
    wordElement.className = "title-word";
    [...word].forEach((character, index) => {
      const span = document.createElement("span");
      const initial = index === 0;
      span.className = `char ${initial ? "char-ornamental" : "char-grotesk"}${!initial && character === "W" ? " char-custom-w" : ""}`;
      span.textContent = character;
      if (!initial) span.style.setProperty("--glyph-width", GLYPH_WIDTHS[character] || 100);
      span.setAttribute("aria-hidden", "true");
      wordElement.appendChild(span);
    });
    line.appendChild(wordElement);
    heroTitle.appendChild(line);
  });
}

buildHeroTitle();
const heroChars = [...document.querySelectorAll("#hero-title .char")];

let duration = EXPECTED_DURATION;
let targetTime = 0;
let seekPending = false;
let scrollDirty = true;
let pointerTargetX = 0;
let pointerTargetY = 0;
let pointerX = 0;
let pointerY = 0;

function timeForProgress(progress) {
  const segment = Math.min(Math.floor(progress * 3), 2);
  const localProgress = progress * 3 - segment;
  const times = [...DOOR_TIMES, duration];
  return times[segment] + (times[segment + 1] - times[segment]) * localProgress;
}

function seekVideo() {
  if (!duration || video.seeking) {
    seekPending = true;
    return;
  }
  seekPending = false;
  if (Math.abs(video.currentTime - targetTime) > 0.012) {
    video.currentTime = clamp(targetTime, 0, Math.max(duration - 0.04, 0));
  }
}

function setVisibility(element, opacity) {
  const visible = opacity > 0.002;
  element.style.opacity = opacity.toFixed(4);
  element.style.visibility = visible ? "visible" : "hidden";
}

function renderHero(progress) {
  const local = clamp(progress * 3);
  heroChars.forEach((character, index) => {
    const start = index * 0.018;
    const value = easeInOut(range(local, start, Math.min(start + 0.54, 1)));
    character.style.opacity = (1 - value).toFixed(4);
    character.style.transform = `translate3d(0, ${value * 250}%, 0) scale(${1 - value * 0.1}, ${1 + value * 0.2})`;
  });
}

function renderRoomTwo(progress) {
  const local = range(progress, 0.295, 0.675);
  const enter = easeOut(range(local, 0, 0.22));
  const leave = easeInOut(range(local, 0.76, 1));
  const opacity = enter * (1 - leave);
  setVisibility(roomTwoOverlay, opacity);

  roomTwoLines.forEach((line, index) => {
    const lineEnter = easeOut(range(local, 0.04 + index * 0.035, 0.3 + index * 0.035));
    const lineLeave = easeInOut(range(local, 0.72 + index * 0.018, 0.94 + index * 0.018));
    const startX = index % 2 ? 16 : -16;
    line.style.opacity = (lineEnter * (1 - lineLeave)).toFixed(4);
    line.style.transform = `translate3d(${startX * (1 - lineEnter)}%, ${-35 * lineLeave}%, 0)`;
  });

  const metaEnter = easeOut(range(local, 0.12, 0.34));
  const metaOpacity = metaEnter * (1 - leave);
  [roomTwoMeta, roomTwoFoot].forEach((item) => {
    item.style.opacity = metaOpacity.toFixed(4);
    item.style.transform = `translate3d(0, ${(1 - metaEnter) * 24}px, 0)`;
  });
}

function renderRoomThree(progress) {
  const local = range(progress, 0.625, 0.86);
  const overlayOpacity = easeOut(range(local, 0, 0.25));
  setVisibility(roomThreeOverlay, overlayOpacity);

  finalCopyItems.forEach((item, index) => {
    const value = easeOut(range(local, 0.08 + index * 0.05, 0.48 + index * 0.05));
    item.style.opacity = value.toFixed(4);
    item.style.transform = `translate3d(0, ${(1 - value) * 36}px, 0)`;
  });

  galleryCards.forEach((card, index) => {
    const value = easeOut(range(local, 0.14 + index * 0.045, 0.64 + index * 0.045));
    const rotation = (index % 2 ? 2 : -2) * (1 - value);
    card.style.opacity = value.toFixed(4);
    card.style.transform = `translate3d(0, ${(1 - value) * 90}px, 0) rotate(${rotation}deg)`;
  });
}

function updateActiveRoom(progress) {
  const roomIndex = progress < 1 / 6 ? 0 : progress < 1 / 2 ? 1 : 2;
  desktopPills.forEach((pill, index) => {
    pill.classList.toggle("is-active", index === roomIndex);
    if (index === roomIndex) pill.setAttribute("aria-current", "page");
    else pill.removeAttribute("aria-current");
  });
}

function renderScroll() {
  const maxScroll = Math.max(document.documentElement.scrollHeight - window.innerHeight, 1);
  const progress = clamp(window.scrollY / maxScroll);
  targetTime = timeForProgress(progress);
  seekVideo();
  renderHero(progress);
  renderRoomTwo(progress);
  renderRoomThree(progress);
  updateActiveRoom(progress);
  scrollDirty = false;
}

function animationFrame() {
  if (scrollDirty) renderScroll();
  pointerX += (pointerTargetX - pointerX) * 0.08;
  pointerY += (pointerTargetY - pointerY) * 0.08;
  videoLayer.style.setProperty("--mouse-x", `${pointerX.toFixed(2)}px`);
  videoLayer.style.setProperty("--mouse-y", `${pointerY.toFixed(2)}px`);
  requestAnimationFrame(animationFrame);
}

function updateLoadingProgress() {
  if (!video.duration || !video.buffered.length) return;
  const end = video.buffered.end(video.buffered.length - 1);
  const progress = Math.round(clamp(end / video.duration) * 100);
  loadingLabel.textContent = `Loading… ${progress}%`;
  loadingFill.style.width = `${progress}%`;
}

video.addEventListener("loadedmetadata", () => {
  if (Number.isFinite(video.duration)) duration = video.duration;
  updateLoadingProgress();
  scrollDirty = true;
});
video.addEventListener("progress", updateLoadingProgress);
video.addEventListener("seeked", () => {
  if (seekPending) seekVideo();
});
video.addEventListener("canplay", () => {
  loadingLabel.textContent = "Loading… 100%";
  loadingFill.style.width = "100%";
  loading.classList.add("is-ready");
  scrollDirty = true;
});
video.addEventListener("error", () => {
  loadingLabel.textContent = "Upload the video asset to continue";
});

window.addEventListener("scroll", () => { scrollDirty = true; }, { passive: true });
window.addEventListener("resize", () => { scrollDirty = true; }, { passive: true });
window.addEventListener("mousemove", (event) => {
  pointerTargetX = (event.clientX / window.innerWidth - 0.5) * -60;
  pointerTargetY = (event.clientY / window.innerHeight - 0.5) * -60;
}, { passive: true });

function scrollToProgress(targetProgress) {
  const start = window.scrollY;
  const end = clamp(targetProgress) * (document.documentElement.scrollHeight - window.innerHeight);
  const startedAt = performance.now();
  const durationMs = 1500;
  const tick = (now) => {
    const value = easeInOut((now - startedAt) / durationMs);
    window.scrollTo(0, start + (end - start) * value);
    if (value < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

document.querySelectorAll("[data-progress]").forEach((button) => {
  button.addEventListener("click", () => {
    scrollToProgress(Number(button.dataset.progress));
    mobileMenu.classList.remove("is-open");
    menuButton.setAttribute("aria-expanded", "false");
  });
});

menuButton.addEventListener("click", () => {
  const open = menuButton.getAttribute("aria-expanded") !== "true";
  menuButton.setAttribute("aria-expanded", String(open));
  mobileMenu.classList.toggle("is-open", open);
});

window.setTimeout(() => {
  if (!loading.classList.contains("is-ready") && video.readyState >= 2) loading.classList.add("is-ready");
}, 10000);

renderScroll();
requestAnimationFrame(animationFrame);
