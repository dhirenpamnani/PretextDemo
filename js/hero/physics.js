// Per-character spring/repel physics. Pure functions operating on plain
// character-state objects so the orchestrator owns all DOM writes.

/** Creates the mutable physics state for one character span. */
export function createCharState(restX, restY) {
  return { restX, restY, offX: 0, offY: 0, velX: 0, velY: 0, active: false };
}

/**
 * Advances one character's spring simulation by one frame, given the live
 * swarm-cursor particle positions. Returns true if the character is still
 * "active" (visibly displaced or in motion) so the caller can skip DOM
 * writes for settled characters.
 */
export function stepCharacter(c, swarmParticles, cfg) {
  let fx = 0;
  let fy = 0;

  for (let i = 0; i < swarmParticles.length; i++) {
    const p = swarmParticles[i];
    const dx = c.restX + c.offX - p.x;
    const dy = c.restY + c.offY - p.y;
    const dist = Math.hypot(dx, dy) || 0.001;
    if (dist < cfg.swarmRadius) {
      const falloff = (1 - dist / cfg.swarmRadius) ** 2;
      fx += (dx / dist) * falloff;
      fy += (dy / dist) * falloff;
    }
  }

  const mag = Math.hypot(fx, fy);
  let targetX = 0;
  let targetY = 0;
  if (mag > 0) {
    const scale = Math.min(cfg.maxDisplacement, mag * cfg.maxDisplacement) / mag;
    targetX = fx * scale;
    targetY = fy * scale;
  }

  // damped spring toward target -- spring first, then damp, gives a slight
  // organic overshoot rather than a dead-stop ease
  c.velX = (c.velX + (targetX - c.offX) * cfg.springK) * cfg.damping;
  c.velY = (c.velY + (targetY - c.offY) * cfg.damping) * cfg.damping;
  c.offX += c.velX;
  c.offY += c.velY;

  const moving =
    Math.abs(c.offX) > cfg.settleThreshold ||
    Math.abs(c.offY) > cfg.settleThreshold ||
    Math.abs(c.velX) > cfg.settleThreshold ||
    Math.abs(c.velY) > cfg.settleThreshold;

  c.active = moving;
  return moving;
}
