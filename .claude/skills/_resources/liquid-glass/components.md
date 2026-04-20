---
topic: Liquid Glass — redesigned component catalog + Apple's verbatim design rules
last_fetched: 2026-04-20
staleness_days: 7
primary_source: Apple "Adopting Liquid Glass" (user-pasted 2026-04-20)
---

# Liquid Glass — components + design rules

## TOC

1. Auto-adopted components (what Apple redesigned)
2. Apple's verbatim design rules (10 load-bearing rules)
3. Content-layer vs functional-layer mapping

## 1. Auto-adopted components

If you use Apple's standard SwiftUI / UIKit / AppKit components, these get Liquid Glass treatment automatically when you rebuild with Xcode 26:

### Controls

`Button`, `Toggle`, `Slider`, `Stepper`, `Picker`, `TextField`.

- **[verbatim, Apple docs]** "For controls like sliders and toggles, the knob transforms into Liquid Glass during interaction, and buttons fluidly morph into menus and popovers."
- **[verbatim, Apple docs]** "The shape of the hardware informs the curvature of controls, so many controls adopt rounder forms to elegantly nestle into the corners of windows and displays."
- **[verbatim, Apple docs]** "Controls also feature an option for an extra-large size, allowing more space for labels and accents."

### Navigation

Tab bars, sidebars, toolbars, menus.

- **[verbatim, Apple docs]** "Liquid Glass applies to the topmost layer of the interface, where you define your navigation. Key navigation elements like tab bars and sidebars float in this Liquid Glass layer to help people focus on the underlying content."
- Menus now use icons for common actions (previously text-heavy).
- iPadOS adds a menu bar.

### Windows + modals

- **[verbatim, Apple docs]** "In iPadOS, apps show window controls and support continuous window resizing. Instead of transitioning between specific preset sizes, windows resize fluidly down to a minimum size."
- Sheets: increased corner radius, inset half-sheets allow content to peek through, full-height sheets go more opaque.
- Action sheets originate from the element that initiates the action (not the bottom edge). Users can interact with other parts of the interface while they're active.

### Lists, tables, forms

- **[verbatim, Apple docs]** "organizational components like lists, tables, and forms have a larger row height and padding. Sections have an increased corner radius to match the curvature of controls across the system."
- **[verbatim, Apple docs]** "Lists, tables, and forms optimize for legibility by adopting title-style capitalization for section headers. This means section headers no longer render entirely in capital letters regardless of the capitalization you provide."
- **[verbatim, Apple docs]** "Use SwiftUI forms with the grouped form style to automatically update your form layouts."

### App icons

Layered (foreground / middle / background) — system applies reflection, refraction, shadow, blur, highlights automatically.

Six appearance variants: **default**, **dark**, **clear-light**, **clear-dark**, **tinted-light**, **tinted-dark**.

Masking:
- Rounded rectangle for iOS / iPadOS / macOS
- Circular for watchOS

Apple-provided tool: **Icon Composer** (in Xcode + Apple Design Resources). Drag and drop exported layers; preview with system effects applied.

### System surfaces

Notifications, Control Center, Lock Screen (with San Francisco numerals "dynamically scaling weight, width, and height"), Home Screen Dock, widgets, desktop (macOS), menu bar (macOS).

## 2. Apple's verbatim design rules (load-bearing)

These are Apple's own words from "Adopting Liquid Glass" — not community interpretation. Each is a potential blocking issue in a design review.

### Rule 1: Leverage system frameworks to adopt automatically

**[verbatim]** "If your app uses standard components from SwiftUI, UIKit, or AppKit, your interface picks up the latest look and feel on the latest platform releases."

**Web translation:** since claudeHub is hand-rolled CSS, the project must replicate the material manually. See `web-implementation.md`.

### Rule 2: Reduce custom backgrounds in controls and navigation

**[verbatim]** "Any custom backgrounds and appearances you use in these elements might overlay or interfere with Liquid Glass or other effects that the system provides, such as the scroll edge effect."

**claudeHub translation:** glass recipes in `css/style.css` are the backgrounds. No selector should paint over them with another non-token gradient.

### Rule 3: Test with a variety of display and accessibility settings

**[verbatim]** "Translucency and fluid morphing animations contribute to the look and feel of Liquid Glass, but can adapt to people's needs. For example, people can choose a preferred look for Liquid Glass in their device's settings, or turn on accessibility settings that reduce transparency or motion in the interface."

Users can toggle: reduce-transparency, reduce-motion, increased-contrast, Tinted mode (iOS 26.1+).

### Rule 4: Avoid overusing Liquid Glass effects

**[verbatim]** "Limit these effects to the most important functional elements in your app." (Also: "overusing this material in multiple custom controls can provide a subpar user experience by distracting from that content.")

The material exists to direct attention to content, not to decorate.

### Rule 5: Prefer standard spacing; avoid overcrowding or layering glass on glass

**[verbatim]** "Prefer to use standard spacing metrics instead of overriding them, and avoid overcrowding or layering Liquid Glass elements on top of each other."

This is Apple's first-party **no-glass-on-glass rule**. claudeHub sits close to this line (nav pill over glass panel, glass card inside glass panel) — documented as intentional divergence.

### Rule 6: Review color in controls

**[verbatim]** "Be judicious with your use of color in controls and navigation so they stay legible. If you do apply color to these elements, leverage system colors, or define a custom color with light and dark variants, and an increased contrast option for each variant."

**claudeHub translation:** per-section `--accent-*` tokens (derived via `color-mix` from `--base`) already follow this pattern. Hardcoded reds / oranges on glass chrome are regressions.

### Rule 7: Toolbar items that share a background perform related actions

**[verbatim]** "Don't mix text and icons across items that share a background."

Separate distinct actions with `ToolbarSpacer`. claudeHub equivalent: Learn action-button cluster (pin / mastery / trash) currently shares visual grouping; add a 4th unrelated action → new group with spacer.

### Rule 8: Provide an accessibility label for every icon

**[verbatim]** "Regardless of what you show in the interface, always specify an accessibility label for each icon. This way, people who prefer a text label can opt into this information by turning on accessibility features like VoiceOver or Voice Control."

**claudeHub translation:** every icon-only `<button>` / `<a>` needs `aria-label`. Candidate rule for `design-review`.

### Rule 9: Use concentric rounded shapes

**[verbatim]** "Across Apple platforms, the shape of the hardware informs the curvature, size, and shape of nested interface elements … Help maintain a sense of visual continuity in your interface by using rounded shapes that are concentric to their containers."

Apple APIs: `ConcentricRectangle`, `.rect(corners: .containerConcentric, ...)`.

**claudeHub translation:** project uses discrete `--radius-sm/md/lg` tokens (6/10/14px) chosen for visual rhythm, not mathematical concentric. Intentional divergence.

### Rule 10: Hide whole toolbar items, not their inner views

**[verbatim]** "If you see an empty toolbar item without any content, your app might be hiding the view in the toolbar item instead of the item itself. Instead, hide the entire toolbar item."

**claudeHub translation:** avoid `visibility: hidden` / `display: none` on inner contents of toolbar-like chrome — toggle the outer item's rendering in JS template logic.

## 3. Content-layer vs functional-layer mapping

| Apple layer | What lives there | claudeHub equivalent |
|---|---|---|
| **Content layer** (no glass) | Lists, photos, text, video | `<main>` body, Learn item rows, article cards, article body text |
| **Functional layer** (glass) | Controls, nav bars, tab bars, toolbars | Nav chip pill, Dashboard panels, floating CTAs, YouTube tile, modal headers |
| **Overlay layer** (vibrancy) | Text/icons on glass | Debossed nav chip labels, chip accents, impressed labels |

The design-review hard rule of "content = primary, glass = secondary, overlay = tertiary" maps onto this.
