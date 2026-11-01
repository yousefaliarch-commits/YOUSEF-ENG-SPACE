// =====================================================================
//  Motion (W6) — real spring curves for CSS, with no animation library on the phone: a damped harmonic oscillator is
//  sampled into a CSS `linear()` easing (the browser interpolates it on the compositor like any timing function). The
//  tokens in styles/app.css (--spring-snap, --spring-soft, --spring-pop and their -d durations) are this generator's output;
//  tests/motion.test.ts recomputes them, so the CSS can never drift from the physics.
//  Rules kept: transform / opacity only, one-shot (never idle loops under 64 px), and prefers-reduced-motion switches it off.
// =====================================================================

export type Spring = { stiffness: number; damping: number; mass?: number };

// position of a unit step response at time t (s): 0 → 1, overshooting when under-damped
export function springAt(s: Spring, t: number) {
  const m = s.mass ?? 1;
  const w0 = Math.sqrt(s.stiffness / m);
  const zeta = s.damping / (2 * Math.sqrt(s.stiffness * m));
  if (zeta < 1) {
    const wd = w0 * Math.sqrt(1 - zeta * zeta);
    return 1 - Math.exp(-zeta * w0 * t) * (Math.cos(wd * t) + ((zeta * w0) / wd) * Math.sin(wd * t));
  }
  // critically damped (and over-damped, treated as critical: the curve is only an easing)
  return 1 - Math.exp(-w0 * t) * (1 + w0 * t);
}

// the time after which the curve stays within `eps` of rest
export function settleTime(s: Spring, eps = 0.002) {
  const step = 1 / 600;
  let last = 0;
  for (let t = 0; t < 3; t += step) if (Math.abs(1 - springAt(s, t)) > eps) last = t;
  return last + step;
}

// a CSS easing and its duration (ms): `transition: transform var(--spring-snap-d) var(--spring-snap)`
export function springCurve(s: Spring, samples = 32) {
  const d = settleTime(s);
  const pts: string[] = [];
  for (let i = 0; i <= samples; i++) {
    const v = i === samples ? 1 : springAt(s, (d * i) / samples);
    pts.push(String(Math.round(v * 1000) / 1000));
  }
  return { easing: `linear(${pts.join(", ")})`, ms: Math.round(d * 1000) };
}

// the app's three springs: «snap» (controls, pills — barely overshoots), «soft» (panels, unfolding), «pop» (a small bounce)
export const SPRINGS: Record<"snap" | "soft" | "pop", Spring> = {
  snap: { stiffness: 420, damping: 34 },
  soft: { stiffness: 170, damping: 22 },
  pop: { stiffness: 300, damping: 18 },
};
