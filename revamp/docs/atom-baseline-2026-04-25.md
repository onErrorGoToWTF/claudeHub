# Atom animation — baseline (2026-04-25)

Captured **before** the Chunk 1 constants-grouping refactor in `src/pages/LabsAtom.tsx`. The atom is a tuned artifact; this is the reference we verify against after each refactor chunk in the atom-system-architecture plan.

## File

- `revamp/src/pages/LabsAtom.tsx` (single source — `AtomComposition` exported, consumed by `AppShell.tsx` (compact) and `LabsAtom` (labs-page).
- Mount-delay timer: `revamp/src/app/AppShell.tsx` — `ATOM_DELAY_MS = 400`.

## Tuned constants (verbatim values)

These ARE the baseline. After any structural refactor, every value below must round-trip identically.

```
AppShell:
  ATOM_DELAY_MS                 = 400

Orbit geometry / speed:
  ORBIT_RADIUS_A                = 1.40
  ORBIT_RADIUS_B                = 0.85
  ORBIT_SPEED                   = 3.30
  SCENE_GROUP_ROTATION          = [Math.PI / 4, Math.PI / 4, 0]

ORBITS (per-electron):
  xy:  laps 3.5, postLandVisibility 0
  yz:  laps 5,   postLandVisibility 0.33
  xz:  laps 6,   postLandVisibility 1,
       settleDurationT 3 * Math.PI, settleEase 'smoothstep'
  (phase offsets: 0, 2π/3, 4π/3 — preserved)

Electron parts:
  ELECTRON_HEAD_COLOR           = '#ffffff'
  ELECTRON_HALO_COLOR           = '#ffffff'
  ELECTRON_TRAIL_COLOR          = '#ffffff'
  ELECTRON_TRAIL_SEGMENTS       = 96
  ELECTRON_TRAIL_ARC            = Math.PI * 0.62
  POST_SCALE                    = 1.45     (post-land electron scale)
  POST_HALO_SCALE               = 2.4      (post-land halo scale)
  POST_HALO_OPACITY             = 0.5      (post-land halo opacity)

Text colors (ai + University):
  AI_LIT_RGB_LIGHT              = [255, 255, 255]
  AI_LIT_RGB_DARK               = [235, 235, 235]
  AI_DEBOSS_RGB                 = [0, 0, 0]
  AI_EMBOSS_RGB                 = [255, 255, 255]
  AI_GLOW_RGB                   = [255, 255, 255]
  UNI_LIT_RGB_LIGHT             = [255, 255, 255]
  UNI_LIT_RGB_DARK              = [235, 235, 235]
  UNI_DEBOSS_RGB                = [0, 0, 0]
  UNI_EMBOSS_RGB                = [255, 255, 255]

Strike & settle timing (electron, t-units):
  ELECTRON_SETTLE_DURATION_T    = 2 * Math.PI
  ELECTRON_STRIKE_LEAD_T        = 0.5
  ELECTRON_POST_LAND_HOLD_T     = 2.3
  ELECTRON_POST_LAND_FADE_T     = 5.0
  ELECTRON_FADE_IN_T            = 4 * Math.PI

Strike timing (ai text, ms):
  AI_STRIKE_PULSE_MS            = 560
  AI_GLOW_HOLD_MS               = 700
  AI_GLOW_DECAY_MS              = 1500

i-dot landing nudge (ai):
  AI_IDOT_NUDGE_X               =  0.5
  AI_IDOT_NUDGE_Y               = -2.5

University reveal:
  UNI_STAGGER_COMPACT_MS        = 50
  UNI_STAGGER_LABS_MS           = 80
  UNI_FLASH_MS                  = 300
  UNI_REVEAL_DELAY_MS           = 200

Settle ramp (ms):
  SETTLE_DELAY_MS               = 400
  SETTLE_DURATION_MS            = 3500

Camera / canvas:
  fov                           = 38°
  near                          = 0.1
  far                           = 50
  camera.z (labs)               = 11
  camera.z (compact)            = 5.5
  dpr                           = [1, 2]
```

## Behavioral baseline (textual)

The ground-truth animation, in order:

1. **Mount delay 400ms** (AppShell only) — atom canvas mounts after the topbar's compositor layer is committed. Prevents the iOS Safari sticky-header race.
2. **Fade-in over ~2 orbits** (`ELECTRON_FADE_IN_T = 4π`) — measured from each electron's `config.phase`. Every electron takes the same wall time to fade in despite different starting phases.
3. **Orbit phase** — 3 electrons on mutually-orthogonal ellipses (XY/YZ/XZ), shared `ORBIT_SPEED`, phase offsets locked at 0 / 2π/3 / 4π/3 so they never beat or clump. Group rotation `[π/4, π/4, 0]` for 3/4-view dimensionality.
4. **Settle (laps 3.5 / 5 / 6)** — electron N spirals in via `orbitPosMorphed` over its `settleDurationT` t-units. Center slides `origin → target`, radii scale `1 → 0`, eased.
   - First two electrons: `easeOutCubic` (default).
   - Third electron: `smoothstep` over `3π` t-units — gentler handoff, no velocity discontinuity.
5. **Strike fires `ELECTRON_STRIKE_LEAD_T = 0.5` t-units before landing** so the `ai` flash is mid-flicker when the dot hits the i-dot.
6. **Pulse window `PULSE_T = 0.7π` t-units after landing** — electron scale ramps to `POST_SCALE`, halo to `POST_HALO_SCALE` at `POST_HALO_OPACITY`. Asymmetric flicker keyframe (`s.aiPulseN`) on `cubic-bezier(0.2, 0.9, 0.1, 1)` matches the `AI_STRIKE_PULSE_MS = 560ms` JS timer.
7. **Post-pulse rest** — electrons fade per `postLandVisibility`:
   - 0 → disappear after flash (electron 1)
   - 0.33 → stays dim over the i-dot (electron 2)
   - 1 → stays fully lit; fade synced via `restProgressRef` to the University settle ramp (electron 3)
8. **`ai` strike sequence** — strikes 1 & 2 flash + fade back to invisible; strike 3 keeps `ai` lit at full brightness.
9. **Glow decay** (labs only) — after final strike + `AI_GLOW_HOLD_MS = 700`, the multi-layer glow stack ramps to 0 over `AI_GLOW_DECAY_MS = 1500ms` via `easeOutCubic`.
10. **University reveal** — `UNI_REVEAL_DELAY_MS = 200ms` after final strike, letters flash on left → right with `UNI_STAGGER_*` per letter, each lasting `UNI_FLASH_MS = 300ms`.
11. **Settle ramp** — `SETTLE_DELAY_MS = 400ms` after University finishes, `restProgress` ramps 0→1 over `SETTLE_DURATION_MS = 3500ms` via `easeOutCubic`. Dims `ai` to debossed, `University` to debossed, third electron's tail to zero — all synchronized.

## Verification protocol

After every refactor chunk in the atom-system plan:

1. **Code-level**: every constant above must round-trip to the same numeric value. Verify via grep + diff of generated comment block.
2. **TypeScript**: `npm run check` clean.
3. **Build**: `npm run build` clean.
4. **Visual** (deferred to phone-review between chunks): on `/labs/atom`, the topbar atom in `AppShell`, and a refresh on a non-home route, the animation must look identical to the user. Screenshots not captured in this autonomous run; visual verification is gated on Alan's phone-review pause between chunks.

If any constant value above changes during a chunk, that's a deliberate retune — flag it explicitly in the milestone commit message and update this baseline.

## Cross-references

- Plan: `C:\Users\alany\.claude\plans\atom-system-architecture.md`
- Skill: `electron-motion` (with indexed research at `_resources/`)
- Memory: `project_atom_rework_plan.md`, `feedback_atom_session_protocol.md`
