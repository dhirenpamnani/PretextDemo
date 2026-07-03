export const HERO_CONFIG = {
  // character-repel physics
  swarmRadius: 84, // px, force falloff radius around each swarm particle
  maxDisplacement: 26, // px, clamp on total per-char offset
  springK: 0.16, // spring stiffness pulling offset toward target
  damping: 0.8, // velocity damping per frame
  settleThreshold: 0.05, // px, below this we stop writing transforms

  // swarm-cursor (the "numbers as cursor")
  swarmCount: 12,
  trailEaseMin: 0.14, // lag easing for the tail-most token
  trailEaseMax: 0.38, // lag easing for the lead token (closest to the real cursor)
  jitterAmount: 3, // px, per-token wobble so the trail reads as a loose swarm
  jitterSpeed: 0.0022,
  tokenPool: [
    "+2.4%", "$182.3B", "-0.7%", "4.12", "▲0.9", "$47.2M",
    "11.8x", "Δ", "99.97%", "0.03bp", "$1.02", "+18bps",
    "-1.4x", "$9.6K", "+0.31", "12.7%",
  ],
  tokenCycleMsMin: 500,
  tokenCycleMsMax: 1100,

  // idle ambient sweep, used on touch devices when nothing is actively touching
  idleAmplitudeX: 140,
  idleAmplitudeY: 40,
  idleSpeedX: 0.00028,
  idleSpeedY: 0.00041,

  // layout
  lineHeightRatio: 1.6,
  resizeDebounceMs: 150,
};
