# Motion Policy — Educational App Research

Distilled from research on Khan Academy, Duolingo, Brilliant.org, Distill.pub, Observable, Coursera. Last updated 2026-04-25.

## Core principle

**Motion answers "what changed?" not "how pretty?"** Every animation should justify its existence: does it help the user learn faster, or just slower?

## The 5-rule policy

### 1. Celebration ≤ 500ms; silent reading = 0 motion
Reward animations (confetti, streak pulses, "solved!") stay under 500ms. During text-heavy content, disable motion entirely unless user-triggered. No autoplay loops in lesson contexts.

### 2. Size-distance rule for duration
- Small (button taps, toggles): **100-200ms**
- Medium (modal/panel entrance): **300-400ms**
- Large (cross-screen movements): **400-500ms** max
- Anything slower feels laggy; faster feels jarring

### 3. Entrance slower, exit faster
Modals appear in 300ms but disappear in 200ms. Entrance creates anticipation; exit respects impatience.

### 4. Math motion only when it teaches
Bespoke animations (orbiting particles, wave functions, network graphs) signal "thoughtfully built" only when they show the concept. Decorative math motion tips into "showing off." **Test:** can you remove the animation and the lesson becomes unclear? If yes, keep it. If no, it's decoration.

### 5. Respect prefers-reduced-motion; test at 60fps minimum
Honor `@media (prefers-reduced-motion: reduce)` by disabling non-essential animations. Multiple WebGL contexts cap framerate; one canvas per page section maximum. Autoplay drains battery on mobile; only animate on user interaction or scroll-into-view via IntersectionObserver.

## Duration cheat sheet

| Use case | Duration |
|---|---|
| Micro-feedback (button pulse) | 100-200ms |
| Reward / celebration | 200-500ms (Duolingo: 300ms; confetti: 400ms) |
| Modal entrance | 300-400ms |
| Modal exit | 200-250ms |
| Data viz transitions | 300-500ms (depending on distance) |
| Page transitions | 400-500ms (minimize on mobile) |

## App case studies (what works)

- **Duolingo**: Celebration triggers (200-400ms). Rive character animations on lesson completion. Lesson text static; motion only on action triggers and rewards.
- **Brilliant.org**: Streak counters animate via Rive event triggers. Path nodes animate on selection. Static lesson content; celebration motion at milestones only.
- **Khan Academy**: Micro-interactions (200-300ms) reward problem-solving. STEM concept animations are educational content (not decoration).
- **Distill.pub**: Animations encode information, not aesthetics. Motion pauses for text absorption — readers control playback. "Grand Tour" smoothly between dimensional views.
- **Observable**: 300-500ms data viz transitions follow "show change over time" principle. Animated sorting helps track data groups; random motion distracts.
- **Coursera**: UI micro-interactions (100-200ms). Course content separates from UI — text + video, not decorated with motion.

## Performance pitfalls

- Multiple WebGL contexts → caps framerate to slowest (~30fps instead of 60fps). One canvas per section max.
- Autoplay motion on load → drains 15-30% extra battery on mobile. Use IntersectionObserver to trigger only when visible.
- Scroll-driven animations without throttling → causes jank. Use `requestAnimationFrame` or library (Rive/Lottie) for smooth scroll sync.

## Sources

- Duolingo Motion Design Case Study (Behance)
- How Brilliant.org Motivates Learners with Rive Animations
- Five Ways to Effectively Use Animation in Data Visualization (Observable)
- Communicating with Interactive Articles (Distill.pub)
- Animation Duration Best Practices (NN/G)
- Material Design 3: Easing and Duration
- Micro-Interactions in Modern UX (Interaction Design Foundation)
