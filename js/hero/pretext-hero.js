import { HERO_CONFIG as cfg } from "./config.js";
import {
  fontStringFromElement,
  measureLines,
  computeCharPositions,
  greedyWrapFallback,
} from "./layout-engine.js";
import { createCharState, stepCharacter } from "./physics.js";
import { createSwarm, updateSwarm, swarmPositions } from "./swarm-cursor.js";

const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export async function initPretextHero() {
  if (reducedMotion) return; // static paragraph stays visible, nothing else runs

  const hero = document.getElementById("top");
  const wrap = hero?.querySelector(".hero-copy-wrap");
  const sourceEl = document.getElementById("hero-copy");
  if (!hero || !wrap || !sourceEl) return;

  await document.fonts.ready;

  const state = {
    charStates: [],
    physicsEl: null,
    swarmEl: null,
    swarmParticles: [],
    pointer: { x: -9999, y: -9999 },
    touchActive: false,
    running: false,
    rafId: null,
    startTime: performance.now(),
  };

  const built = await buildDecomposition(sourceEl, wrap, hero);
  if (!built) return; // import/measurement failed: leave the real paragraph visible

  state.physicsEl = built.physicsEl;
  state.charStates = built.charStates;

  sourceEl.classList.add("sr-only");
  state.swarmEl = document.createElement("div");
  state.swarmEl.className = "hero-swarm";
  wrap.appendChild(state.swarmEl);
  state.swarmParticles = createSwarm(state.swarmEl, cfg);

  if (finePointer) {
    hero.classList.add("swarm-active");
    hero.addEventListener("mousemove", (e) => {
      const r = wrap.getBoundingClientRect();
      state.pointer = { x: e.clientX - r.left, y: e.clientY - r.top };
    });
    hero.addEventListener("mouseleave", () => {
      state.pointer = { x: -9999, y: -9999 };
    });
  } else {
    hero.addEventListener(
      "touchmove",
      (e) => {
        const t = e.touches[0];
        if (!t) return;
        const r = wrap.getBoundingClientRect();
        state.pointer = { x: t.clientX - r.left, y: t.clientY - r.top };
        state.touchActive = true;
      },
      { passive: true }
    );
    hero.addEventListener("touchend", () => {
      state.touchActive = false;
    });
  }

  const io = new IntersectionObserver(
    (entries) => {
      const visible = entries[0]?.isIntersecting;
      if (visible && !document.hidden) startLoop(state, hero, wrap);
      else stopLoop(state);
    },
    { threshold: 0 }
  );
  io.observe(hero);

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) stopLoop(state);
    else if (isElementVisible(hero)) startLoop(state, hero, wrap);
  });

  let resizeTimer = null;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(async () => {
      stopLoop(state);
      state.physicsEl?.remove();
      state.swarmEl?.remove();
      sourceEl.classList.remove("sr-only");

      const rebuilt = await buildDecomposition(sourceEl, wrap, hero);
      if (!rebuilt) return;

      sourceEl.classList.add("sr-only");
      state.physicsEl = rebuilt.physicsEl;
      state.charStates = rebuilt.charStates;

      state.swarmEl = document.createElement("div");
      state.swarmEl.className = "hero-swarm";
      wrap.appendChild(state.swarmEl);
      state.swarmParticles = createSwarm(state.swarmEl, cfg);

      if (isElementVisible(hero)) startLoop(state, hero, wrap);
    }, cfg.resizeDebounceMs);
  });
}

async function buildDecomposition(sourceEl, wrap, hero) {
  const font = fontStringFromElement(sourceEl);
  const maxWidth = wrap.clientWidth;
  const cs = getComputedStyle(sourceEl);
  const lineHeightPx = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * cfg.lineHeightRatio;
  const text = sourceEl.textContent.trim().replace(/\s+/g, " ");

  let lines;
  try {
    lines = await measureLines({ text, font, maxWidth });
  } catch {
    try {
      lines = greedyWrapFallback(text, font, maxWidth);
    } catch {
      return null;
    }
  }
  if (!lines || lines.length === 0) return null;

  const chars = computeCharPositions(lines, font, lineHeightPx);
  if (chars.length === 0) return null;

  const physicsEl = document.createElement("div");
  physicsEl.className = "hero-copy-physics";
  physicsEl.setAttribute("aria-hidden", "true");
  physicsEl.style.height = `${(chars[chars.length - 1].lineIndex + 1) * lineHeightPx}px`;

  const charStates = [];
  const frag = document.createDocumentFragment();

  for (const c of chars) {
    const span = document.createElement("span");
    span.className = "ch";
    span.textContent = c.char;
    span.style.left = `${c.x}px`;
    span.style.top = `${c.y}px`;
    frag.appendChild(span);

    const cState = createCharState(c.x, c.y);
    cState.el = span;
    cState.wasActive = false;
    charStates.push(cState);
  }

  physicsEl.appendChild(frag);
  wrap.appendChild(physicsEl);

  return { physicsEl, charStates };
}

function startLoop(state, hero, wrap) {
  if (state.running) return;
  state.running = true;
  const tick = (now) => {
    if (!state.running) return;

    let pointer = state.pointer;
    if (!finePointer && !state.touchActive) {
      const w = wrap.clientWidth;
      const h = state.physicsEl?.offsetHeight || 0;
      pointer = {
        x: w / 2 + Math.sin(now * cfg.idleSpeedX) * cfg.idleAmplitudeX,
        y: h / 2 + Math.sin(now * cfg.idleSpeedY) * cfg.idleAmplitudeY,
      };
    }

    updateSwarm(state.swarmParticles, pointer, cfg, now);
    const particles = swarmPositions(state.swarmParticles);

    for (const c of state.charStates) {
      const moving = stepCharacter(c, particles, cfg);
      if (moving || c.wasActive) {
        if (moving) {
          c.el.style.transform = `translate3d(${c.offX}px, ${c.offY}px, 0)`;
          c.el.classList.add("is-active");
        } else {
          c.el.style.transform = "";
          c.el.classList.remove("is-active");
          c.offX = 0;
          c.offY = 0;
          c.velX = 0;
          c.velY = 0;
        }
      }
      c.wasActive = moving;
    }

    state.rafId = requestAnimationFrame(tick);
  };
  state.rafId = requestAnimationFrame(tick);
}

function stopLoop(state) {
  state.running = false;
  if (state.rafId) cancelAnimationFrame(state.rafId);
  state.rafId = null;
}

function isElementVisible(el) {
  const r = el.getBoundingClientRect();
  return r.bottom > 0 && r.top < window.innerHeight;
}
