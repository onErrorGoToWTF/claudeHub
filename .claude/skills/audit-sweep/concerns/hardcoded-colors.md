# hardcoded-colors (OPT-IN ONLY)

> **Opt-in concern.** Never selected by auto-detect. Only runs when explicitly invoked via `/audit-sweep hardcoded-colors`. The claudeHub design intentionally carries many `rgba()` literals in glass gradient stops, ambient-warm radial washes, text-shadow stacks, inset specular highlights, and debossed-label recipes. Auto-running would produce a noisy patch that churns legitimate values. Only invoke when you already suspect a specific section has drifted from tokens.

All non-token color literals outside `:root` should be replaced with `--color-*`, `--accent-*`, `--glass-*`, `--ambient-*`, `--danger-*`, or `--chart-*` tokens.

## Detection

```
grep -nE '#[0-9a-fA-F]{3,8}\b' css/style.css css/overrides.css
grep -nE 'rgba?\s*\(' css/style.css css/overrides.css
```

## Exemptions (do NOT flag) — extensive because of design-language recipes

- `:root` block — token definitions are authoritative.
- `MODEL_COL` locked literals (see `CLAUDE.md` "Model colors (locked)"): `#ff7a3d`, `#14b8a6`, `#4a90ff`, `#e879f9`, `#6366f1`. Never flag.
- Branded `.nav-brand*` logo literals — deliberately locked wordmark, hex literals permitted per `design-review/SKILL.md` rule 1.
- **Glass recipe gradient stops** — `--glass-top` / `--glass-bottom` / `--glass-fallback` are the tokens, but any `linear-gradient(...)` inside `.glass::before` or similar specular-highlight layers uses `rgba()` literals for the inset highlight (`rgba(255,255,255,0.55)` and kin). These are part of the canonical glass primitive and must stay.
- **Ambient-warm / ambient-plasma radial gradients** on `body::before` / `html::after` — rgba literals for the warm-greige wash and vignette are deliberate.
- **Debossed / impressed-label text-shadow stacks** — `text-shadow: 0 1px 0 rgba(255,255,255,0.80), 0 -0.5px 0.5px rgba(0,0,0,0.20)` literals are canonical.
- **Box-shadow specular highlights** — `inset 0 1px 0 rgba(255,255,255,0.5-0.7)` on glass cards and similar.
- Chart text colors and chart-specific hex literals where `--chart-*` tokens don't exist yet.
- Comments and string literals inside `content:` or `url()`.

## Canonical fix

Depends on context — there is no one replacement. Examples:

```css
/* before: per-section accent hex */
.some-section .btn {
  background: #84cc16;
}

/* after */
.some-section .btn {
  background: var(--accent-solid);  /* via [data-section] --base */
}
```

```css
/* before: raw page-base tone */
.some-card {
  background: #eeece7;
}

/* after */
.some-card {
  background: var(--bg-0);
}
```

For `rgba()` literals that AREN'T in the exempt recipe list: suggest a token; if none fits, flag as a question — don't guess.

## Report grouping

Group by suggested replacement token, then by TOC section banner. For literals where no token fits, group them under "NO-TOKEN MATCH" so the user can decide whether to add a new token or keep the literal.

## Concern-specific guardrails

- **Never flag any hit that falls inside the exempt-recipe list above.** Spot-check context (10 lines around the hit) before flagging — if the enclosing selector is `.glass`, `.glass::before`, `body::before`, `html::after`, or any `text-shadow` stack, skip.
- Don't flag a hex literal inside a `data-*` attribute value or HTML comment.
- Don't unify values across MODEL_COL / per-section accents / chart colors even if they look close — those are deliberately independent palettes.
- If the hit count exceeds ~30 inside a single TOC section, flag that section as a candidate for a design-amend rather than trying to auto-patch — a systemic amend is more appropriate than a sweep.
