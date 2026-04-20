---
topic: Liquid Glass — SwiftUI + UIKit API surface
last_fetched: 2026-04-20
staleness_days: 7
primary_reference: https://github.com/conorluddy/LiquidGlassReference
---

# Liquid Glass — API reference

**For full code examples, see the primary external reference:** https://github.com/conorluddy/LiquidGlassReference (1841 lines).

This file is a condensed API surface — names, signatures, and the `[verbatim, Apple docs]` vs `[community]` confidence level for each.

## TOC

1. SwiftUI core modifier
2. SwiftUI button styles
3. SwiftUI shapes (concentric rounding)
4. SwiftUI container (performance + morphing)
5. SwiftUI navigation
6. SwiftUI toolbars
7. SwiftUI sheets + modals
8. SwiftUI search
9. SwiftUI focus (tvOS)
10. UIKit equivalents
11. Backward-compatibility escape hatch

## 1. SwiftUI core modifier

```swift
.glassEffect() -> some View                                                   // [verbatim, Apple docs]
.glassEffect(_ glass: Glass, in shape: S, isEnabled: Bool) -> some View       // [community]
.glassEffectID<ID: Hashable>(_ id: ID, in namespace: Namespace.ID)            // [verbatim, Apple API link]
.glassEffectUnion<ID: Hashable>(id: ID, namespace: Namespace.ID)              // [community]
.glassEffectTransition(_ transition: GlassEffectTransition, isEnabled: Bool)  // [community]
.glassBackgroundEffect(in: some Shape, displayMode: GlassDisplayMode)         // [community]
```

## 2. SwiftUI button styles

```swift
.buttonStyle(.glass)           // [verbatim, Apple docs] — translucent, secondary
.buttonStyle(.glassProminent)  // [verbatim, Apple docs] — opaque, primary
```

Control sizes **[verbatim, Apple docs]** (doc mentions "extra-large size allowing more space for labels and accents"):
```swift
.controlSize(.mini | .small | .regular | .large | .extraLarge)
```

Border shapes:
```swift
.buttonBorderShape(.capsule)  // default
.buttonBorderShape(.circle)
.buttonBorderShape(.roundedRectangle(radius: 8))
```

## 3. SwiftUI shapes — concentric rounding

```swift
ConcentricRectangle                                                           // [verbatim, Apple docs]
.rect(corners:isUniform:) with .containerConcentric                           // [verbatim, Apple docs]
RoundedRectangle(cornerRadius: .containerConcentric, style: .continuous)      // [community]
```

**Apple's rule [verbatim]:** "the shape of the hardware informs the curvature, size, and shape of nested interface elements … Help maintain a sense of visual continuity in your interface by using rounded shapes that are concentric to their containers."

## 4. SwiftUI container (performance + morphing)

```swift
GlassEffectContainer { /* children with .glassEffect() */ }                   // [verbatim, Apple docs + community]
GlassEffectContainer(spacing: CGFloat) { /* controlled morphing distance */ } // [community]
```

**Critical rule [community — conorluddy Part 2.1]:** "Glass cannot sample other glass; container provides shared sampling region." Multi-element glass clusters should always be wrapped.

## 5. SwiftUI navigation

```swift
sidebarAdaptable                                    // [verbatim, Apple docs]
NavigationSplitView                                 // [verbatim, Apple docs]
inspector(isPresented:content:)                     // [verbatim, Apple docs]
backgroundExtensionEffect()                         // [verbatim, Apple docs] — mirror+blur behind sidebar
.tabBarMinimizeBehavior(.onScrollDown|.automatic|.never)  // [verbatim, Apple docs]
.tabViewBottomAccessory { }                         // [community]
.safeAreaBar(edge:alignment:spacing:content:)       // [verbatim, Apple docs] — register custom bar for scroll-edge effect
```

## 6. SwiftUI toolbars

```swift
ToolbarSpacer(.fixed, spacing: 20)                  // [verbatim, Apple docs]
ToolbarSpacer(.flexible)                            // [verbatim, Apple docs]
.hidden(_:)                                         // [verbatim, Apple docs] — hide whole item, NOT inner view
.badge(Int)                                         // [community]
.sharedBackgroundVisibility(.hidden)                // [community]
```

**Apple's rule [verbatim]:** Toolbar items that share a background perform related actions; distinct actions get separate groupings with `ToolbarSpacer`. "Don't mix text and icons across items that share a background."

## 7. SwiftUI sheets + modals

```swift
.presentationDetents([.medium, .large])             // [community]
.scrollContentBackground(.hidden)                   // [community]
.containerBackground(.clear, for: .navigation)      // [community]
.navigationTransition(.zoom(sourceID:, in:))        // [community]
.matchedTransitionSource(id:, in:)                  // [community]
confirmationDialog(...)                             // [verbatim, Apple docs] — origin-anchored action sheet
```

**Apple's sheet behavior [verbatim]:** "feature an increased corner radius, and half sheets are inset from the edge of the display to allow content to peek through from beneath them. When a half sheet expands to full height, it transitions to a more opaque appearance to help maintain focus on the task."

## 8. SwiftUI search

```swift
Tab(role: .search) { }                              // [verbatim, Apple docs]
.searchable(text:)                                  // [community]
.searchToolbarBehavior(.minimized)                  // [community]
DefaultToolbarItem(kind: .search, placement:)       // [community]
```

## 9. SwiftUI focus (tvOS)

```swift
.focusable(_:)                                      // [verbatim, Apple docs]
isFocused                                           // [verbatim, Apple docs]
```

## 10. UIKit equivalents

```swift
UIGlassEffect(glass: .regular, isInteractive: true) // [community]
UIVisualEffectView(effect: glassEffect)             // [community]
UIGlassContainerEffect()                            // [community]
UIBarButtonItem / UIToolbar                         // auto-adopt when compiled against latest SDK
hidesSharedBackground = true                        // [community] — UIKit of .sharedBackgroundVisibility(.hidden)
```

## 11. Backward-compatibility escape hatch

```xml
<!-- Info.plist -->
<key>UIDesignRequiresCompatibility</key>
<true/>
```

**[verbatim, Apple docs]** "To update and ship your app with the latest SDKs while keeping your app as it looks when built against previous versions of the SDKs, you can add the UIDesignRequiresCompatibility key to your project's Info pane." Community reports say this opt-out **expires iOS 27**.

## Environment values (accessibility)

```swift
@Environment(\.accessibilityReduceTransparency) var reduceTransparency
@Environment(\.accessibilityReduceMotion)        var reduceMotion
@Environment(\.tabViewBottomAccessoryPlacement)  var placement
```

See `accessibility.md` for usage patterns.
