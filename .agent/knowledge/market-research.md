---
description: Compiled market research, competitor deep-dives, Reddit sentiment, and user feedback analysis
---

# Market Research

## Current update — 2026-10-02

IronJot's current direction is a free, locally stored workout tracker with optional guidance and Google Drive backup. The practical ideas retained from this research are fast logging, flexible routines, useful history, and data portability. Local statistical suggestions are implemented; a cloud AI assistant and paid AI tier are retired.

## Research archive — February 2025 to January 2026

Everything below is preserved research context, last compiled on **2026-01-04**. Competitor prices, feature gaps, rankings, Reddit sentiment, and quoted comments have **not been reverified** for this refresh. Some entries conflict with other early notes, such as FitNotes analytics. They must not be treated as current facts, cited as verified quotations, or copied into marketing without checking original sources.

The old feature lists are opportunities considered at the time, not a current roadmap. In particular, IronJot currently exports XLSX and JSON, implements in-app widgets, and uses Google Drive for optional backup. Native launcher widgets, PDF/CSV export, iCloud, universal competitor imports, and broad ML claims are not established capabilities. See [feature design](feature-design.md) for the current implementation and [current progress](current-progress.md) for remaining work.

## Sources

1. **Original Market Study (Feb 2025)** — User's hands-on analysis of major apps
2. **SSD Abel Video Notes** — Fitness YouTuber critique of workout app landscape
3. **Reddit Research (Jan 2026)** — Web search of r/fitness, r/weightroom, and related communities
4. **User Reviews** — Screenshots and quotes from app store reviews

---

# Full Competitor Breakdown

## Tier 1: The Big Three (Most Recommended on Reddit)

### Hevy ⭐ (Current Reddit Favorite)

| Aspect | Details |
|--------|---------|
| **Price** | Free (generous), $29/year, **$75 lifetime** |
| **Platforms** | iOS, Android, Web, Apple Watch, Wear OS |
| **Best For** | Users who want modern UI + active development |

**Strengths:**
- 🔥 **Most actively developed** — frequent updates, responsive team
- Modern, intuitive UI — often cited as best-in-class
- **Generous free tier** — most features available free
- **Lifetime purchase option** — pays for itself in ~2.5 years
- Imports data from Strong and others
- Web interface for routine building
- Set types: warmup, drop set, failure
- Auto rest timer, exercise notes
- Apple Watch + Wear OS support
- RPE tracking on smartwatch
- Progress pictures feature
- Strava integration

**Weaknesses:**
- Social features (can be disabled but exist)
- Some users want more robust notes feature
- Occasional Apple Watch sync issues
- "Lifetime" = lifetime of product, not guaranteed forever

**Reddit Sentiment:** Overwhelmingly positive. Many users switched from Strong to Hevy citing better development pace and lifetime option.

> "Hevy's free version is sufficient but I paid for lifetime just to support the devs."

---

### Strong (The Veteran)

| Aspect | Details |
|--------|---------|
| **Price** | Free (limited), ~$10/month or lifetime |
| **Platforms** | iOS, Android, Apple Watch |
| **Best For** | Users who want minimal, privacy-focused tracking |

**Strengths:**
- Clean, simple interface — "doesn't get in the way"
- Good for tracking progressive overload
- Built-in exercise library with form descriptions
- Rest timer
- **No social features** — privacy advantage
- Pinned notes feature (unique, loved by some)

**Weaknesses:**
- ⚠️ **Perceived stagnant development** — many Reddit threads complain
- Recent Apple Watch update broke popular features
- Free version limited to 3-4 saved templates
- Expensive monthly ($10-15/mo)
- No direct import from other apps (manual entry required)
- Some users report lost workouts

**Reddit Sentiment:** Mixed in 2024-2025. Long-time fans frustrated by slow updates. Many migrating to Hevy.

> "Strong feels like a finished product that's not being improved anymore."
> "I loved Strong but switched to Hevy because of development."

---

### Fitnotes (The Free Champion)

| Aspect | Details |
|--------|---------|
| **Price** | Completely free, no ads |
| **Platforms** | **Android only** (major limitation) |
| **Best For** | Veterans who want no-frills, offline, private tracking |

**Strengths:**
- ✅ Completely free, no ads, no subscription
- Ultra-light (<5MB), fast, works offline
- Full data ownership — CSV export
- Custom exercises, categories, templates
- No account required
- No social features, no bloat
- Works on old phones

**Weaknesses:**
- ❌ **Android only** — no iOS app (major gap)
- No automatic cloud sync (manual backups)
- No built-in progress graphs
- No exercise images/videos
- Outdated UI
- No iOS = no Apple Watch

**Reddit Sentiment:** Loved by Android power users. iOS users desperately want it.

> "Fitnotes is the GOAT for Android but I can't use it on iPhone."

**What users want added:**
- iOS app (most requested)
- RPE/RIR tracking
- Automatic cloud sync
- Warmup/drop/failure set types
- Progress graphs
- Better routine management

---

## Tier 2: Strong Alternatives

### Caliber

| Aspect | Details |
|--------|---------|
| **Price** | Free, Caliber Plus subscription (2024 addition) |
| **Best For** | Beginners who want guidance + workout generation |

**Strengths:**
- Clean UI
- Instructional videos and tips
- Workout planner/generator
- "Strength Score" motivation feature
- Active developer community (responds on Reddit)
- Good for beginners

**Weaknesses:**
- ⚠️ **Added subscription tier in 2024** — some features now paywalled
- Offline mode historically problematic
- Too many buttons to record exercises
- Slow development on requested features (dark mode, etc.)

**Reddit Sentiment:** Positive for beginners, concern about recent paywall additions.

---

### Boostcamp

| Aspect | Details |
|--------|---------|
| **Price** | Free (core), Premium for advanced analytics |
| **Best For** | Users who want pre-built programs (5/3/1, GZCLP, nSuns, etc.) |

**Strengths:**
- 🔥 **100+ free programs** — Reddit's go-to for powerlifting programs
- Converts spreadsheet programs to app format
- 1RM onboarding, auto progressions
- Exercise demos
- Free and ad-free core

**Weaknesses:**
- Frustrating premium pop-ups
- Can't substitute lifts in free programs without paying
- Less flexible for custom routines

**Reddit Sentiment:** Highly recommended for following established programs. Less loved for custom tracking.

> "Boostcamp is amazing if you want to run a Reddit PPL or 5/3/1."

---

### JEFIT

**Strengths:** Vast exercise database, community programs, detailed stats
**Weaknesses:** Feels bloated, slow, cluttered

---

### Fitbod (~$13/mo)

**Strengths:** AI-generated workouts, best UI polish, equipment customization, muscle visualization
**Weaknesses:** Expensive, requires account, AI-focused (not for veterans)

---

### Liftosaur

**Strengths:** Highly customizable, automates workout progressions
**Weaknesses:** Niche, smaller community

---

## Stretching & Mobility: A Separate Market

**Key Finding:** No weight training app does stretching/mobility well. Users use separate apps:

| App | Focus | Price |
|-----|-------|-------|
| **Pliability** (ROMWOD) | Athlete mobility, 15-20min sessions | Subscription |
| **Bend** | General flexibility, beginner-friendly | Free + Paid |
| **StretchIt** | Flexibility-focused, progress tracking | Subscription |
| **GOWOD** | CrossFit mobility | Subscription |

**Opportunity:** Integrating warmup/stretching into a weight training app is a genuine differentiator.

---

# Reddit User Sentiment Analysis

## What Serious Lifters Complain About

### 1. "Too Many Clicks" Friction

> "When I'm sweaty—3 swipes, 2 clicks, boom—done."

- Excessive taps to record sets/reps/weight
- Modals and confirmations slow things down
- Adjusting rest timers takes too long
- Finding exercises is cumbersome

### 2. Start/Stop Workout Paradigm

> "They're obsessed with start workout, finish workout."

- Users hate being forced into "recording mode"
- Want to log anytime, auto-save
- No mandatory save/cancel flow

### 3. Paywall Frustration

- Free tiers that are unusable
- Core features (templates, analytics) locked
- Nagging about premium constantly
- Strong's limited free tier (3 templates) criticized

### 4. Stagnant Development

- Strong's slow updates caused mass migration to Hevy
- Users switch when apps feel "abandoned"
- Active development = trust

### 5. Data Lock-In

- Switching between apps is painful
- Export/import rarely seamless
- Users want full data ownership
- CSV export is table stakes

---

## What Users Want (Feature Requests from Reddit)

### Most Requested Features

| Feature | Apps Missing It |
|---------|-----------------|
| **iOS version** | Fitnotes |
| **RPE/RIR tracking** | Fitnotes, many others |
| **Warmup/drop/failure set types** | Many apps |
| **Automatic cloud sync** | Fitnotes |
| **Progress graphs** | Fitnotes |
| **Offline mode** | Caliber, cloud-first apps |
| **Rest timer on lock screen** | Many apps |
| **Previous weight/rep defaults** | Some apps |
| **Custom muscle groups** | Most apps |
| **Multiple muscle groups per exercise** | Most apps |

### Features Users Love (To Include)

- One-tap to accept last set's values
- Auto rest timer that starts on set completion
- Set notes (per-set, not just per-exercise)
- Exercise favorites for quick access
- Superset/circuit grouping
- Web interface for routine building
- Import from competitors
- Export to CSV/JSON

---

# Pricing Landscape

| App | Free Tier | Paid | Lifetime |
|-----|-----------|------|----------|
| **Fitnotes** | Everything | N/A | N/A |
| **Hevy** | Generous | $29/year | **$75** |
| **Strong** | Limited (3 templates) | $10-15/mo | Yes |
| **Caliber** | Core features | Caliber Plus | No |
| **Boostcamp** | Programs | Premium | No |
| **Fitbod** | 7-day trial | $13/mo | No |
| **Gym WP** | Unusable | ~$10/mo | No |

**Key Insight:** Hevy's $75 lifetime is considered excellent value. Users love one-time purchases over subscriptions.

---

# Critical Success Factors

Based on all research, an app that wins needs:

## Must-Have (Table Stakes)

1. ✅ Fast logging — minimal clicks, auto-save
2. ✅ Custom exercises and templates
3. ✅ Progress tracking and graphs
4. ✅ Export to CSV (Fitnotes-compatible)
5. ✅ Exercise pictures/GIFs
6. ✅ Works offline
7. ✅ No mandatory account

## Differentiators

1. 🎯 **Warmup/stretching integration** — nobody does this
2. 🎯 **Cross-platform** (iOS + Android) — Fitnotes doesn't
3. 🎯 **Free or ultra-cheap** — not $10+/month
4. 🎯 **On-device ML** for smart defaults (privacy-first)
5. 🎯 **Onboarding personalization** — veteran vs beginner modes
6. 🎯 **Active development** — users migrate to actively developed apps
7. 🎯 **Import from all competitors** — be the app people switch TO

## Anti-Patterns to Avoid

- ❌ "Start/stop workout" paradigm
- ❌ Unusable free tier
- ❌ Forced account creation
- ❌ Slow/stagnant development
- ❌ Premium feature nagging
- ❌ Data lock-in
- ❌ Social features by default
- ❌ Too many clicks

---

# Competitive Positioning Summary

| What Beats Fitnotes | What Beats Premium Apps |
|---------------------|-------------------------|
| Modern UI | Free or $5 (not $10+/mo) |
| iOS + Android | No forced onboarding |
| Exercise visuals | Veteran-first, not beginner-first |
| Auto cloud sync | No AI-knows-best attitude |
| Progress graphs | Privacy-respecting |
| Active development | Offline-first |

**The Gap:** No app is both free/cheap AND modern AND cross-platform AND respects veteran users.

---

## Document history

- **2026-01-04:** Original market-research compilation.
- **2026-10-02:** Research labeled as historical and related to the current product; external research not refreshed.
