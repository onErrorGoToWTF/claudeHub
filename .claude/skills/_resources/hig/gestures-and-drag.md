---
topic: HIG — gestures + drag-and-drop + reorder
last_fetched: 2026-04-20
staleness_days: 7
sources:
  - https://github.com/ehmo/platform-design-skills (skills/ios/SKILL.md section 6)
  - https://github.com/sindresorhus/human-interface-guidelines-extras
  - Apple HIG (developer.apple.com/design/human-interface-guidelines/gestures, /drag-and-drop, /lists-and-tables)
---

# HIG — gestures, drag-and-drop, reorder

## TOC

1. Standard gesture vocabulary
2. System gestures you cannot override
3. Swipe-action direction semantics (destructive = trailing)
4. Drag-and-drop conventions
5. Long-press (project note)
6. Custom-gesture discoverability + alternatives
7. Drag-and-drop mixed content handling

## 1. Standard gesture vocabulary

**[community — ehmo Rule 6.1]** Use the standard iOS vocabulary. Users already understand these.

| Gesture | Standard use |
|---|---|
| Tap | Primary action, selection |
| Long press | Context menu, preview, drag lift |
| Swipe horizontal | Delete (trailing), archive/pin (leading), navigate back (left edge) |
| Swipe vertical | Scroll, dismiss sheet (down) |
| Pinch | Zoom in/out |
| Two-finger rotate | Rotate content |

## 2. System gestures you cannot override

**[community — ehmo Rule 6.2]** These are reserved by the system. Intercepting them breaks fundamental navigation.

- Swipe from left edge (back navigation)
- Swipe down from top-left (Notification Center)
- Swipe down from top-right (Control Center)
- Swipe up from bottom (home / app switcher)

## 3. Swipe-action direction semantics

From HIG Lists and Tables + UIKit `tableView(_:trailingSwipeActionsConfigurationForRowAt:)` semantics:

| Swipe direction | Reserved for |
|---|---|
| **Trailing edge** (right-to-left gesture on LTR) | Destructive actions: Delete, Archive, Trash, Remove |
| **Leading edge** (left-to-right gesture on LTR) | Non-destructive / contextual: Pin, Read/Unread, Favorite, Snooze |

**Apple's rule:** do not invert. Putting destructive on the leading side trains users against muscle memory from Mail, Messages, and every other system app — costly for high-stakes actions.

**Velocity threshold:** Apple's table views commit the swipe action only past a certain horizontal distance threshold (roughly ½ row width). Shorter swipes reveal the action button; the user must tap or full-swipe to confirm. Replicate this drag-resistance rather than triggering on any horizontal motion.

### claudeHub translation

- Swipe-mastery was retired in M9.17b.d (ledger at v0.7.1-dev.38). Inline buttons replaced it. If swipe returns, destructive → trailing.
- Any new swipe-action handler in `js/app.js`:
  - Requires horizontal-distance threshold before committing.
  - Resists direction ambiguity (early vertical motion = scroll, not swipe).

## 4. Drag-and-drop conventions

**Apple HIG drag-and-drop + UIKit UIDragInteraction:**

- **Lift** — element visually rises via `transform: scale(~1.05)` + shadow increase (NOT margin/padding, which cause layout thrash).
- **Handle placement** — leading edge (left in LTR). User's first touch point convention.
- **Sibling translation** — other rows translate out of the way via `transform: translateY(...)`, 180–220ms, standard easing. No DOM reorder during drag (flicker).
- **Drop settle** — element eases into final position, matching sibling displacement timing.
- **No-drop cancel** — element eases back to origin over ~200ms, no layout change.

### claudeHub translation

- Grab handle (⋮⋮ glyph, `.learn-item-grab`) on left of Learn items — matches leading-edge convention (shipped M9.17b.b).
- Drag uses compositor-only `transform: scale(1.04) translate(dx, dy)` — no layout thrash (shipped M9.17f).
- `resetRowTransform` eases back over 0.22s on no-drop cancel — matches Apple timing.
- Drop zones use distinct border + glow via `.learn-zone-drop-active` — unambiguous visual feedback.

## 5. Long-press (project note)

**[verbatim, Apple gestures]** "Long-press gestures detect extended duration taps on the screen and use them to reveal contextually relevant content."

**UIKit default:** `UILongPressGestureRecognizer.minimumPressDuration = 0.5` seconds. This is an API default, not a HIG mandate — adjust for your use case.

### claudeHub note

M9.17b.b **retired** the `LEARN_LONG_PRESS_MS` state machine. Drag now activates immediately on grab-handle touch — no long-press timer. Rule 3 of the original Draft C iOS-feel amendment was dropped precisely because the state machine no longer exists.

## 6. Custom-gesture discoverability + alternatives

**[community — ehmo Rule 6.3]** "Custom Gestures Must Be Discoverable. If you add a custom gesture, provide visual hints (e.g., a grabber handle) and ensure the action is also available through a visible button or menu item."

**[community — ehmo Rule 6.4]** "Support All Input Methods. Design for touch first, but also support hardware keyboards, assistive devices, and pointer input."

### claudeHub translation

- Every swipe/drag has an inline button equivalent. Grab handle is visible (⋮⋮). Mastery button is visible (✓). Pin + delete are visible buttons — not hidden behind gestures.
- Future reorderable lists get explicit handles, never touch-anywhere-to-drag.

## 7. Drag-and-drop mixed content handling

**[community — sindresorhus]** "If a user drags a mix of supported and unsupported files (for example, both JPEG and PNG files onto an app that only accepts JPEG), the app should accept the valid items and silently ignore the rest. Do not reject the entire drop or show a blocking error dialog. Drag and drop is a low-friction interaction and should not be interrupted."

**Applies to claudeHub:** if future drag surfaces accept multiple item types (e.g., dragging multiple feed sources into a pin zone), filter to valid types and show a brief post-drop notification ("3 of 5 pinned"). No blocking dialog.

## Cross-references

- For tap-target size rules affecting gesture surfaces → `layout.md`
- For motion timing (sibling translation durations, drop settle) → `motion.md`
- For accessibility alternatives for gesture-based interactions → `accessibility.md`
