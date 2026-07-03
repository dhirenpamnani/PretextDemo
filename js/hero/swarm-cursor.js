// The numeric "cursor": a comet-tail of financial-looking tokens that
// trails the real pointer. Each token eases toward the *previous* token's
// already-eased position (not the raw pointer), which is what produces
// the visible lag/chaining, plus a small per-token sinusoidal jitter so
// it reads as a loose swarm rather than a rigid line.

function randomToken(pool) {
  return pool[Math.floor(Math.random() * pool.length)];
}

export function createSwarm(container, cfg) {
  const particles = [];

  for (let i = 0; i < cfg.swarmCount; i++) {
    const el = document.createElement("span");
    el.className = "swarm-token";
    el.textContent = randomToken(cfg.tokenPool);

    const t = i / (cfg.swarmCount - 1); // 0 = lead, 1 = tail
    el.style.fontSize = `${(1 - t * 0.55) * 0.95}rem`;
    el.style.opacity = String(1 - t * 0.82);

    container.appendChild(el);

    particles.push({
      el,
      x: -999,
      y: -999,
      targetX: -999,
      targetY: -999,
      ease: cfg.trailEaseMax - t * (cfg.trailEaseMax - cfg.trailEaseMin),
      jitterPhase: Math.random() * Math.PI * 2,
      nextTokenAt: performance.now() + rand(cfg.tokenCycleMsMin, cfg.tokenCycleMsMax),
    });
  }

  return particles;
}

function rand(min, max) {
  return min + Math.random() * (max - min);
}

/** Advances the swarm one frame toward `pointer` ({x, y} in hero-local coords). */
export function updateSwarm(particles, pointer, cfg, now) {
  let leadTarget = pointer;

  for (let i = 0; i < particles.length; i++) {
    const p = particles[i];
    p.targetX = leadTarget.x;
    p.targetY = leadTarget.y;

    p.x += (p.targetX - p.x) * p.ease;
    p.y += (p.targetY - p.y) * p.ease;

    const jitterX = Math.sin(now * cfg.jitterSpeed + p.jitterPhase) * cfg.jitterAmount;
    const jitterY = Math.cos(now * cfg.jitterSpeed * 1.3 + p.jitterPhase) * cfg.jitterAmount;

    p.el.style.transform = `translate3d(${p.x + jitterX}px, ${p.y + jitterY}px, 0)`;

    if (now >= p.nextTokenAt) {
      p.el.style.opacity = "0";
      p.el.textContent = randomToken(cfg.tokenPool);
      requestAnimationFrame(() => {
        p.el.style.opacity = String(1 - (i / (particles.length - 1 || 1)) * 0.82);
      });
      p.nextTokenAt = now + rand(cfg.tokenCycleMsMin, cfg.tokenCycleMsMax);
    }

    // each subsequent particle chases the *current* (already-eased) position
    // of the previous one, producing the comet-tail chain
    leadTarget = { x: p.x, y: p.y };
  }
}

/** Returns a plain {x, y}[] snapshot for the physics step to consume. */
export function swarmPositions(particles) {
  return particles.map((p) => ({ x: p.x, y: p.y }));
}
