---
topic: HIG — community workarounds Apple doesn't document
last_fetched: 2026-04-20
staleness_days: 30
sources:
  - https://github.com/sindresorhus/human-interface-guidelines-extras
  - https://github.com/ehmo/platform-design-skills (selected rules)
---

# HIG — community extras

These are conventions Apple doesn't explicitly document but the community has converged on through practice. Treat as high-quality guidance, not official mandate.

## TOC

1. Settings window (macOS)
2. Undo button style (iOS)
3. Drag-and-drop conventions (beyond Apple's docs)
4. Number text-field keyboard convenience
5. Internet Access Policy
6. App accent color consistency

## 1. Settings window (macOS)

**[community — sindresorhus]**

- **Form style:** use `Form` with `.formStyle(.grouped)`. Group controls with `Section`.
- **Translucency:** window should NOT be translucent.
- **Traffic lights:** minimize + maximize disabled (but not removed).
- **Tab symbols:**
  - General → `gearshape` (not `gear`).
  - Advanced → `gearshape.2`.
- **Do NOT include:** license, update, About. These belong in separate menus — Settings is for settings.
- **Escape key:** should NOT close the window. Escape is for transient UI (dialogs, sheets, panels); Settings is a regular window. Apple's own apps are inconsistent; treating it as a normal window is correct.
- **Window menu:** should appear in the "Window" menu. Regular window, not a panel.

claudeHub has no macOS settings window. Principles that translate:
- ESC closes transient UI (modals, sheets) but should not dismiss persistent surfaces.
- A "settings" sheet in claudeHub should use semantic section grouping.

## 2. Undo button style (iOS)

**[community — sindresorhus]** "If you want to include an undo button for some settings control on iOS, prefer `arrow.uturn.backward`. It's what most people prefer."

SF Symbol: `arrow.uturn.backward` (not `arrow.counterclockwise` or variants).

claudeHub has no explicit undo surfaces today. If one is added, use a backward-U-turn arrow glyph.

## 3. Drag-and-drop conventions (beyond Apple's docs)

**[community — sindresorhus]**

### Mixed content with some invalid items

"If a user drags a mix of supported and unsupported files … the app should accept the valid items and silently ignore the rest. Do not reject the entire drop or show a blocking error dialog."

- Apple APIs (`dropDestination(for:)`, `onDrop(of:)`) handle this automatically.
- If skipped items might confuse the user, show a brief non-blocking notification after the drop (e.g., "3 of 5 files imported").

### Clickable drop zones

"If your app has a drag and drop target for files, don't forget to also make it possible to click the drop area to open files through an open panel instead of dragging. Alternatively, add an 'Open' button inside the drop target."

Rationale: drag-and-drop is one input method. Users with motor impairments or those on trackpads-only prefer click-to-browse.

### claudeHub translation

- Future drag surfaces (e.g., pinning multiple feed items) → filter invalid silently, show post-drop toast.
- Every drop zone that doubles as a drop target should ALSO accept click-to-open or have a button equivalent.

## 4. Number text-field keyboard convenience

**[community — sindresorhus]** For numeric text fields:

1. **Stepper on the right** — up/down arrow control.
2. **Arrow up/down keys** change number by 1 when field is focused.
3. **Option+arrow** changes by 10.
4. **Shake the field** when user hits min/max boundary.

### Web equivalent

```html
<input type="number" min="0" max="100" step="1">
```
- Browser handles up/down keys natively.
- No native Option+10 behavior — would need JS handler.
- "Shake on limit" requires JS + CSS animation.

claudeHub has no numeric fields currently; if added for settings, follow this pattern.

## 5. Internet Access Policy

**[community — sindresorhus]** "If your app needs to access the internet for any reason, I would strongly recommend including an [Internet Access Policy](https://www.obdev.at/iap/index.html). This lets firewall apps present to the user what and why your app needs access to. It also makes it more likely the user will grant access."

claudeHub is a PWA; doesn't distribute as native app; no IAP needed. Principle: transparency about outbound network requests is good practice everywhere.

## 6. App accent color consistency

**[community — ehmo Rule 4.7]** (reiterating from color.md) "Choose a single tint/accent color for all interactive elements."

SwiftUI app-wide accent:
```swift
@main
struct MyApp: App {
    var body: some Scene {
        WindowGroup {
            ContentView().tint(.indigo)
        }
    }
}
```

### claudeHub

Per-section accent tokens (`--accent-*` scoped to `[data-section="X"]`) extend the principle — each tab has ONE accent that propagates to every interactive element in that section. Consistent within a section, recognizably different between sections. Matches the spirit of Apple's rule.

## Community-gap candidates (not yet documented)

Topics where sindresorhus / ehmo / claudeHub have direct experience but Apple hasn't formalized:

- **Two-tap confirm for destructive actions in PWA contexts** (where `confirm()` is suppressed by iOS Safari as of the M9.17c era). claudeHub's inline 3s-disarm pattern is arguably better UX than a native dialog anyway.
- **Glass-on-glass stacking tolerance** — Apple says avoid, but nav-pill-over-glass-panel is ubiquitous in real apps. Community convention: it's OK for ≤2 glass layers if the inner one is clearly smaller and distinct.
- **Static specular on web** — no Apple guidance for web ports of native materials.

Add new community-extra entries here as they surface. Source and date each.

## Cross-references

- For full HIG conventions on gestures → `gestures-and-drag.md`
- For color / accent rules → `color.md`
- For modality / settings sheet conventions (iOS version) → `modality.md`
