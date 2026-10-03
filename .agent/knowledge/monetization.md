---
description: Pricing strategy, free vs premium features, and anti-friction monetization principles
---

# Monetization Strategy

## Current update — 2026-10-02

**IronJot's core remains free. Optional support may help cover development costs, without unlocking features or adding account friction.** The AI assistant and paid cloud AI tier were retired in September 2026.

There is no payment integration today. Settings → Support the Dev currently opens a coming-soon message. The owner is considering a simple tip or coffee-style contribution; provider, placement, and store-specific payment handling are still undecided.

Ratings and feedback are separate from payments. A future rating request should invite an honest review without guilt or rewards. Its implementation and timing remain release work.

## Current approach

- Free workout logging, templates and splits, exercise library, analytics, goals, measurements, and local statistical suggestions.
- XLSX export, JSON backup/restore, and supported competitor imports remain part of the core. Google Drive backup is optional; iCloud backup is not implemented.
- No paid AI tier, premium-feature gate, subscription, or advertising is planned.
- Optional support must be voluntary and leave the logging experience unchanged.

The original philosophy below remains useful. Pricing alternatives and prompt timing are retained afterward as dated planning artifacts, not active implementation requirements.

## Core Philosophy

**Goal:** Make money optional, not required for core value.

This app exists to disrupt, not to maximize revenue. Monetization should:
- Never feel like a gate or punishment
- Make users WANT to pay, not feel forced
- Support development, not extract maximum value
- Align with indie/community ethos

---

## Pricing models considered — original 2026-01-04 exploration

| Model | Pros | Cons | Fit |
|-------|------|------|-----|
| **Completely Free + Donations** | Max adoption, goodwill, indie ethos | Unpredictable income | ⭐⭐ **Chosen** |
| **Free + Paid AI Tier** | Covers API costs, fair value exchange | Requires careful pricing | Retired by owner, 2026-09-29 |
| **One-Time Purchase** | Users prefer this | Original concern was ongoing AI costs; that tier is now retired | Historical option |
| **Subscription ($10+/mo)** | Recurring revenue | Against our positioning | ❌ Rejected |
| **Ads** | Revenue without payment | Degrades experience | ❌ Rejected |

---

## Direction established — September 2026

**Free Core + Optional Donations**

The owner decided on 2026-09-29 to remove the AI assistant and abandon the cloud AI tier. Revenue is not a product priority. Onboarding must not include a paywall, trial, or account requirement.

### Optional support
- Optional "Buy me a coffee" style donations
- No features gated behind donations
- Purely goodwill-based

---

## Anti-Friction Principles

### DO:
- ✅ Let users experience the full app before any purchase prompt
- ✅ Explain support as an optional contribution to independent development
- ✅ Be explicit: "This helps keep the app free for everyone"
- ✅ Keep any support prompt dismissible and infrequent; no schedule is decided

### DON'T:
- ❌ Lock core logging features
- ❌ Add artificial limitations (e.g., "3 workouts/month free")
- ❌ Nag users repeatedly about upgrading
- ❌ Use dark patterns or guilt-tripping
- ❌ Make free tier feel like a demo
- ❌ Ever show ads

---

## Historical prompt proposal — 2026-01-04 (not adopted)

This proposal assumed premium features. That assumption no longer applies; it does not set a requirement for either support prompts or store-rating requests.

Only show upgrade prompt after:
1. User has logged at least 5 workouts (they're committed)
2. User has been using app for 2+ weeks
3. User attempts to use a premium feature

When shown:
- Single dismissible modal
- Clear explanation of what they get
- "No thanks, I'm good with free" is prominent
- Never shown again for 30+ days if dismissed

---

## Original financial expectations — 2026-01-04

These were early expectations, not measured revenue or a forecast.

This is a disruption play, not a business:
- Expected revenue: $0 - low thousands/month
- This is fine and intentional
- Sustainability through low overhead (solo/small team)
- If it takes off, revisit—but don't optimize for this

---

## Original free-feature checklist — captured 2026-10-02

This checklist is preserved from the earlier document; its original snapshot date is uncertain. The current approach above takes precedence. CSV export, iCloud, and the broad ML wording below were plans, not verified current capabilities. Current exports are XLSX/JSON, the implemented cloud provider is Google Drive, and suggestions use local statistics.

### Free Tier (Fully Featured)

Everything needed for a complete workout tracking experience:

- ✅ Unlimited workout logging
- ✅ Unlimited templates
- ✅ Full exercise database
- ✅ Rest timer
- ✅ Full analytics and progress tracking
- ✅ **On-device ML features** (autocomplete, workout suggestions)
- ✅ Multiple export formats (CSV, JSON, etc.)
- ✅ Import from competitors
- ✅ Google Cloud / iCloud backup (optional)

## Document history

- **2026-01-04:** Original monetization philosophy and alternatives.
- **September 2026:** Free core retained; AI assistant and paid AI tier retired.
- **2026-10-02:** Current implementation and undecided support integration recorded.
