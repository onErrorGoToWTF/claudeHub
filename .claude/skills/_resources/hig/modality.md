---
topic: HIG — modality (sheets, popovers, action sheets)
last_fetched: 2026-04-20
staleness_days: 7
sources:
  - Apple HIG (developer.apple.com/design/human-interface-guidelines/modality, /sheets)
  - https://github.com/sindresorhus/human-interface-guidelines-extras
---

# HIG — modality

## TOC

1. When to use modal presentation
2. Sheet conventions
3. Dismiss-button conventions (right-side Done)
4. Action sheets
5. Popovers
6. Settings window (macOS, for reference)
7. Backdrop + layering

## 1. When to use modal presentation

**[verbatim, Apple HIG]** "Modality is a design technique that presents content in a separate, focused mode that prevents interaction with the parent view and requires an explicit action to dismiss."

**[verbatim, Apple HIG]** "A sheet helps people perform a scoped task that's closely related to their current context."

Modal is right when:
- Task is scoped and self-contained.
- Interaction with the parent view should be blocked during the task.
- The user needs to explicitly dismiss or complete.

Modal is wrong when:
- Content is informational and passive.
- The user needs to reference the parent view while engaging.
- The task is brief and low-friction (use a toast or inline control instead).

## 2. Sheet conventions

### Transition + motion

**[verbatim, Apple HIG]** "The default transition vertically slides the modal view up from the bottom of the screen and back down once dismissed."

- Sheet slides up from bottom.
- iOS duration ~0.3–0.4s with standard easing.
- Edge-swipe-to-dismiss on touch (swipe down on sheet body).

### Liquid Glass updates (iOS 26+)

From Apple's "Adopting Liquid Glass" doc:

- **[verbatim]** "Sheets … feature an increased corner radius, and half sheets are inset from the edge of the display to allow content to peek through from beneath them."
- **[verbatim]** "When a half sheet expands to full height, it transitions to a more opaque appearance to help maintain focus on the task."

### Presentation detents

SwiftUI supports multi-height sheets:
```swift
.presentationDetents([.medium, .large])
```
User can drag between heights. Medium = ~half-screen; large = full-height.

## 3. Dismiss-button conventions

**[community — sindresorhus]** on iOS settings-style sheets:

> "The most common conventions I have seen for a settings sheet dismissal button is either a 'Done' button on the right side (primary position) of the navigation bar or an 'X' icon on the left side (navigational position)."

**Sindresorhus recommends Done on the right**, reasoning:
- Apple does this in most apps.
- "Done" has a larger tap target than an "X".
- Friendlier — an "X" might make people think settings won't be saved.
- Easier to reach for right-handed users (the majority).

**Never do:**
- "Done" on the left side.
- "Cancel" on either side (for a read-only sheet).
- "Dismiss" as the button text.

### claudeHub translation

- Modal close buttons on claudeHub use X currently. That's defensible (sindresorhus isn't canonical), but if a modal represents completed work (e.g., "Save settings"), a right-side "Done" label is more conventional.
- Two-tap confirm on destructive actions sits inline with the content, not in the nav bar — correct pattern, unaffected by this convention.

## 4. Action sheets

**[verbatim, Apple HIG]** In Liquid Glass (iOS 26+): action sheets "originate from the element that initiates the action, instead of from the bottom edge of the display. When active, an action sheet also lets people interact with other parts of the interface."

This is a significant shift — pre-iOS 26 action sheets slid up from bottom; post-iOS 26 they originate from the tapped control (like a popover), and don't block the rest of the UI.

SwiftUI API:
```swift
confirmationDialog(_:isPresented:titleVisibility:presenting:actions:)
```

## 5. Popovers

- Position anchored to triggering control.
- Dismiss on tap outside or explicit close.
- On macOS, typically arrow pointing to source. On iOS/iPadOS adapted differently post-iOS 26.

## 6. Settings window (macOS, for reference)

**[community — sindresorhus]** Rules for a macOS settings window:

- Use `Form` with `.formStyle(.grouped)`. Group controls with `Section`.
- Window should NOT be translucent.
- Minimize + maximize traffic lights disabled (but not removed).
- Tab symbols: "General" → `gearshape` (not `gear`); "Advanced" → `gearshape.2`.
- Don't include license / update / About — it's a *settings* window.
- Escape key should NOT close the window (Escape is for transient UI).
- Window should show in the "Window" menu (regular window, not panel).

claudeHub is web-based and has no macOS settings window, but the principles (no Escape-to-close for regular windows, Escape only for transient UI) translate.

## 7. Backdrop + layering

**[verbatim, Apple HIG]** "Layering and Structure is achieved through techniques like blurring, layering, and shadows to clearly show which elements are on top (e.g., a modal sheet) and which are foundational (e.g., the main view)."

### claudeHub translation

- Backdrop on modals: semi-transparent dark overlay behind modal content (standard).
- `.glass-elevated` variant cranks blur for modals, separating them from underlying content.
- Dismiss via X, backdrop tap, ESC key — covers all expected routes.

## Cross-references

- For motion durations + easing on sheet transitions → `motion.md`
- For action-sheet layering + sizing considerations → `liquid-glass/components.md`
- For accessibility on modals (focus trapping, VoiceOver escape) → `accessibility.md`
