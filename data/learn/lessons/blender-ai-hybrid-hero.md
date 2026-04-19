# Blender + AI hybrid — the Young Carpets hero shot

A pure-AI pipeline can't yet deliver a commercially accurate "camera pushes through a window, floor explodes into its material layers" shot. Veo is great at plausible motion; it's terrible at structurally specific part-separation. The answer for hero shots with real precision is a **hybrid pipeline**: a 3D scene you own (Blender) drives the geometry, and AI tools style + polish + extend it.

This lesson maps out the hybrid pipeline for the Young Carpets marketing-site hero shot.

## The shot

Camera starts at street level outside a small-town flooring office at golden hour. It glides forward, through a window, into the showroom, and tilts down onto a carpet sample. The sample explodes into its three layers — carpet, pad, subfloor — holds for 2 seconds, then reassembles.

## Why pure-AI video isn't enough

Veo 3.1 with first/last-frame conditioning can absolutely do the *exterior-to-interior* push. The problem is the explode-view:

- Veo fudges what's underneath a carpet. It'll invent a sublayer that looks plausible but isn't accurate.
- "Three distinct material layers separating cleanly in mid-air" is structurally specific — AI motion models blur structure.
- For a sales site, "looks accurate" isn't optional. Customers will ask about the pad.

## The hybrid pipeline

### Step 1 — Model the carpet assembly in Blender (30–60 min)

Three stacked planes with slight thickness:

- **Top:** carpet — fibers via a hair particle system on a base plane, or a simpler tufted normal-map shader.
- **Middle:** pad — thicker, grey-foam material.
- **Bottom:** subfloor — plywood texture.

Scale to real dimensions. Small detail matters if the camera gets close.

### Step 2 — Generate the surface look with Flux or Nano Banana (10–20 min)

Instead of hand-authoring every texture in Blender's shader graph:

- Prompt Flux or Nano Banana for "seamless tileable texture of [carpet weave / foam underlay / plywood subfloor]" at 2K.
- Save each as a PNG. Wire them into Blender's Principled BSDF as Base Color + optional Normal.

You get photoreal materials in a fraction of the time a manual shader build takes.

### Step 3 — Animate in Blender (60–90 min)

Keyframe the three layers' Z-positions:

- Frame 0: all three stacked, carpet on top.
- Frame 60: layers separated vertically by 20cm each.
- Frame 120: back together.

Add an ease-out-ease-in F-curve. Put the camera on a short dolly-in to emphasize the separation moment.

### Step 4 — Render the Blender portion (30 min + render time)

Render at 1080p or 4K, 24fps, with Cycles (for realism) or EEVEE (for speed). Export as a PNG sequence so you can comp in post.

### Step 5 — Generate the exterior-to-interior push with Nano Banana + Veo (30 min)

This is where AI video shines:

- **Nano Banana stills**: generate two keyframes.
  - *First frame:* wide exterior of the building at golden hour.
  - *Last frame:* interior showroom, camera positioned where Blender's first frame begins.
- **Google Flow**: feed both stills to Veo 3.1 with first/last-frame conditioning. 8 seconds of camera travel. Veo handles the motion; it doesn't have to invent geometry because both endpoints are fixed.

### Step 6 — Stitch in DaVinci Resolve (free) (30 min)

- Timeline: Veo exterior-to-interior (8s) → Blender explode sequence (5s).
- Match colors with a grade node — both halves should read as the same golden-hour palette.
- Add room ambience from a free sound pack. No VO needed for v1.

### Step 7 — Render final, upload, deploy

Export H.264 at 4K if your target devices support it, else 1080p. Host the file on Cloudflare R2 or Vercel Blob; embed on the site as a silent autoplay background or a tap-to-play hero.

## Rough budget

- Blender: free.
- Flux / Nano Banana: $10–30 of credits for texture + still generation.
- Veo 3.1 via Gemini Pro: included ($20/mo) or metered via Vertex AI (~$10–30 for the 8-second shot including re-rolls).
- DaVinci Resolve: free.

Total cost to make the shot once: **under $50**. Time: a focused afternoon if you're comfortable in Blender, two evenings if you're learning as you go.

## Why not just hire a motion designer?

You can. ~$3–8k for a shot like this from a freelancer, 2–4 weeks. The hybrid pipeline is right when you want to iterate the shot *yourself* as the site's hero evolves — marketing copy changes, you tweak the sample, you try a different camera move. That iteration loop is worth far more than the initial save.

## Prerequisites to watch before starting

- Any "Blender 4.x fundamentals" beginner series (1–2 hours).
- The Nano Banana + Flow first/last-frame workflow — search YouTube for "Google Flow keyframe to video tutorial 2026".

When both are familiar, come back and do this shot.
