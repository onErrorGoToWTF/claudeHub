# Anthropic subscription switch — personal notes

Captured 2026-04-23. Prices here are **US figures as of this date**; verify Canadian pricing directly on claude.com/pricing before acting. Everything changes frequently.

## Why switch

Currently on **Claude Max 20x via Apple App Store: $349.99 USD/mo**, renews May 6. The same Max 20x plan **direct through claude.com is $200 USD/mo** — the App Store charges Apple's ~30% in-app-purchase markup. Over a year that's roughly $1,560 USD wasted on the Apple markup alone.

Separately, the Max plan does NOT include API access. Using the Anthropic API (to build app features that CALL Claude programmatically) requires a second account at console.anthropic.com with its own billing.

## Three-part move

### 1. Cancel the App Store subscription before May 6

- Tap **Cancel Subscription** in the App Store page (already on screen at the time this was written).
- Access continues through May 6 — no immediate service loss.
- The goal is to stop the automatic renewal at Apple's marked-up price.

### 2. Decide Max 20x vs. Max 5x, then resubscribe direct on claude.com before May 6

Two tiers, honest self-assessment needed:

- **Max 20x — $200 USD/mo direct.** 20× Pro usage per session. Keep this if you regularly hit usage walls on heavy Claude Code days (hours-long vibe-coding sessions, back-to-back).
- **Max 5x — $100 USD/mo direct.** 5× Pro usage. Covers most normal dev workflows. If current usage data doesn't show you hitting Max 20x limits frequently, Max 5x is the right step-down.

Practical check: look at your usage patterns over the last month. If you rarely hit the Pro wall, Max 5x. If you hit Max 20x limits regularly, keep Max 20x.

**Canadian pricing** will differ. Check claude.com/pricing logged in from Canada — Anthropic may list in CAD directly, or apply a regional adjustment. Don't rely on the US numbers above.

### 3. Create a separate API account

- Sign up at **console.anthropic.com** — this is a DIFFERENT account from claude.ai (same email is fine; the system treats them as separate).
- Add billing info.
- **Set a hard monthly spending cap — $20 to $50 USD to start.** Console has this under Usage / Limits. Prevents any runaway cost during experimentation.
- Generate an API key. Store it securely (1Password or equivalent — never commit to the repo).

## Cost forecast

Rough estimates for aiUniversity's personal use of the API (admin-only, phase 1):

| Use case | Approx. cost |
|---|---|
| Drafting one full lesson (~50k input + 20k output, Opus 4.7, no caching) | ~$2.25 USD |
| Same, with prompt caching wired (90% discount on cached input) | ~$0.75 USD |
| Daily dev testing / iteration | <$1/day typical |
| Monthly realistic all-in while actively building | $10–30 USD |

A $20 cap is plenty for phase 1. Raise later if features scale or other users come on board.

## Net savings summary (US figures, will shift in CAD)

| Path | Monthly | Annual |
|---|---|---|
| Current (App Store Max 20x) | $349.99 | $4,199.88 |
| Direct Max 20x + $20 API | $220 | $2,640 |
| Direct Max 5x + $20 API | $120 | $1,440 |

Switching to direct Max 20x saves ~$1,560/year. Stepping down to Max 5x saves ~$2,760/year. Either way, the API account is comfortably funded by the savings.

## What to hold the line on

- **Don't cancel Max before May 6 assuming you'll resubscribe immediately.** Cancel, but do the resubscribe-direct step while access is still active. Gap-less.
- **Don't put the API key in the repo.** Use an environment variable (`.env.local` in `revamp/`, listed in `.gitignore`). Claude Code / Vite's `import.meta.env` pattern handles this at build time.
- **Don't bump past a $50 API cap early.** If phase 1 consumes more than that, the feature's scope probably needs discipline, not more budget.
- **Don't assume US pricing applies in Canada.** Verify logged-in from Canada on claude.com. CAD could be different enough to shift the math.

## After switching

Come back to the app build. Phase 1 plan:

1. Store API key in `revamp/.env.local` as `VITE_ANTHROPIC_API_KEY`.
2. Admin-only gate behind a query param (`?admin=1`) or a build-time flag so the feature only lights up for you.
3. First AI feature: small, contained. Good candidates: "generate a draft of a new lesson from a topic title," "suggest 3 quiz questions from a lesson body," "propose related library items to link to this topic." All fit the Freshness Pipeline vision long-term.
4. Wire prompt caching from day one. The cost math only works with it.

## Payment-method notes (wallet-loss workaround)

Lost the physical card. Have a bank-issued **virtual credit card** linked to the chequing account. Should work, but two things to check before relying on it for a recurring subscription:

1. **Reusable vs. single-use.**
   - Some bank-issued virtual cards are one-shot — generated fresh for each transaction. Those WILL NOT work for a recurring subscription.
   - The one that works for subscriptions is a persistent virtual card number that auto-updates when the underlying physical card rotates.
   - Check the bank app to confirm which type this is.

2. **Debit rail vs. credit rail.**
   - Some "virtual credit cards" backed by chequing run on Visa Debit / Mastercard Debit rails rather than true credit rails.
   - US-based SaaS (like Anthropic) usually accepts Visa Debit / Mastercard Debit for recurring transactions, but not universally.
   - Worth testing before trusting it.

### Low-risk test sequence

- Start with the **API account** at console.anthropic.com (no commitment — billing is per-use, starts at $0).
  - Add the virtual card.
  - Run ~$0.50 of test usage.
  - If it charges cleanly, the card is compatible with Anthropic's payment processor (Stripe).
- **Then** do the Max direct subscription on claude.com.
  - Same payment processor underneath — if step 1 worked, this will too.

If the API-account test fails, the card isn't going to work for a recurring Max subscription either. Pivot: try PayPal (if claude.com accepts it at checkout), or accept one more Apple-tax cycle and wait for the physical card.

### If the virtual card can't hold a recurring charge reliably

- Let Apple renew Max 20x on May 6 once (~$150 extra in Apple markup).
- Cancel right after renewal — access through next cycle is fine.
- Physical card arrives in the meantime.
- Do the clean switch on the NEXT renewal date.

One extra month of Apple tax is the cost of not having a service gap. Not catastrophic.

## References (verify yourself — prices change)

- https://claude.com/pricing — subscription tiers direct pricing
- https://claude.com/pricing/max — Max plan detail
- https://support.claude.com/en/articles/11049741-what-is-the-max-plan — Max plan help article
- https://platform.claude.com/docs/en/about-claude/pricing — API pricing
- https://console.anthropic.com — where to sign up for the API account
