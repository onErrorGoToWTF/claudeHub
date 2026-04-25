/* =========================================================
   ATOM ANIMATION CONSTANTS — three nested namespaces.
   Verbatim baseline values live in revamp/docs/atom-baseline-2026-04-25.md;
   when the user says "go back to default settings" or "logo constants",
   that doc + this file's exported objects are the single source of truth.

     ELECTRON  ← primitive: head/halo/trail visuals + electron-frame timing
     ATOM      ← composition: orbit geometry/speed, scene rotation, nucleus
     LOGO      ← wordmark composition: ai/uni colors + settle ramp timing
   ========================================================= */

export type Rgb = readonly [number, number, number]

export const ELECTRON = {
  head: {
    color: '#ffffff',          // tiny solid sphere at the orbit head
    postScale: 1.45,           // head scale at rest after landing
  },
  halo: {
    color: '#ffffff',          // expanding glow burst on strike
    postScale: 2.4,            // halo scale at rest after landing
    postOpacity: 0.5,          // halo opacity at rest after landing
  },
  trail: {
    color: '#ffffff',          // ring-buffer line behind the head
    segments: 96,
    arc: Math.PI * 0.62,
  },
  // Electron-frame timings (orbit-speed-relative units except where noted).
  fadeInT: 4 * Math.PI,        // smooth appearance over first ~2 orbits
  strikeLeadT: 0.5,            // strike fires this much before landing
  settleDurationT: 2 * Math.PI, // default spiral duration (1 lap)
  postLandHoldT: 2.3,          // hold at full lit after pulse before fade
  postLandFadeT: 5.0,          // fade duration after the post-land hold
}

export const ATOM = {
  orbit: {
    radiusA: 1.40,             // semi-major axis
    radiusB: 0.85,             // semi-minor axis
    speed: 3.30,
  },
  scene: {
    // Scene-wide group rotation — exposed so target world→local conversion
    // in AtomLogo matches the rendered orientation exactly.
    groupRotation: [Math.PI / 4, Math.PI / 4, 0] as [number, number, number],
  },
  nucleus: {
    // Defaults consumed by <Atom>. Current logo uses 'invisible' at origin;
    // 'sphere' / 'icon' modes are deferred until a real use case arrives.
    defaultRender: 'invisible' as 'invisible' | 'sphere' | 'icon',
    defaultColor: '#ffffff',
    defaultSize: 0.06,
  },
}

export const LOGO = {
  mountDelayMs: 400,           // delay before topbar Canvas mounts (Safari layer race)
  ai: {
    color: {
      litLight: [255, 255, 255] as Rgb,   // bright on light bg
      litDark:  [235, 235, 235] as Rgb,   // bright on dark bg
      deboss:   [0, 0, 0]       as Rgb,   // dark deboss (light bg)
      emboss:   [255, 255, 255] as Rgb,   // light emboss (dark bg)
      glow:     [255, 255, 255] as Rgb,   // labs-page glow stack
    },
    /* Duration of the .aiPulse strike-flicker. Must match the aiStrikeN
       keyframe animation duration in AtomLogo.module.css — the JS timer
       here is what clears the pulsing class so the CSS transition can
       re-engage and fade/hold the text back to its rest state. */
    strikePulseMs: 560,
    glow: {
      // After the final electron lands + the pulse completes, hold the
      // 'ai' at full glow for a beat, then decay the white glow stack
      // to zero so the wordmark resolves to clean flat white text.
      holdMs: 700,
      decayMs: 1500,
    },
    // Empirical font-metric nudges for landing the electron on the i-dot.
    // Both are typeface-dependent — retune on font swap.
    iDotNudge: { x: 0.5, y: -2.5 },
  },
  uni: {
    color: {
      litLight: [255, 255, 255] as Rgb,
      litDark:  [235, 235, 235] as Rgb,
      deboss:   [0, 0, 0]       as Rgb,
      emboss:   [255, 255, 255] as Rgb,
    },
    // "University" neon-tube reveal — letters flash on left → right after
    // the final strike's pulse ends. Stagger is per-letter delay between
    // flash starts; flashMs is the per-letter animation duration.
    stagger: {
      compactMs: 50,           // ~13px font in topbar
      labsMs: 80,              // ~32px font in /labs/atom
    },
    flashMs: 300,
    revealDelayMs: 200,        // pause after final strike before letters start
  },
  // After "University" is fully lit, hold briefly then dim everything
  // (ai + university + i-dot glow) to the debossed resting state.
  settle: {
    delayMs: 400,
    durationMs: 3500,
  },
}
