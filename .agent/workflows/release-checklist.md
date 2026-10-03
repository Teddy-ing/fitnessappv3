---
description: Prepare and verify an IronJot release
---

# Release Checklist

**Updated: 2026-10-02.** This is a reusable readiness checklist. Check items for the specific release being prepared and record its version/date. Completion does not authorize a commit, push, upload, publication, or release; those actions require the owner's explicit instruction under [AGENTS.md](../../AGENTS.md).

## Current first-release gaps

- [ ] Set launch platforms and confirm production package/bundle IDs, signing, and version/build numbers.
- [ ] Replace Settings placeholders: About, changelog, privacy policy, feedback address, rating destination, and any unfinished features.
- [ ] Provide a normal Settings path for user data deletion; currently Clear All Data is a development tool.
- [ ] Resolve photo backup portability: current JSON/Drive snapshots contain paths but not image files.
- [ ] Resolve GPLv3 in `LICENSE` versus MIT in `package.json`.
- [ ] Complete physical-device release testing and iOS verification if iOS is in the launch scope.
- [ ] Decide whether developer support/tips belongs in the first release and choose the platform-appropriate implementation.

These gaps are also summarized in [current progress](../knowledge/current-progress.md). Store requirements should be checked against the target stores when preparing submission.

## Code and data readiness

- [ ] Run `npm run typecheck` and `npm test -- --runInBand`; resolve regressions and identify any pre-existing failures.
- [ ] Review substantive changes with a separate reviewer against acceptance criteria, data safety, and regression risks. Use the focused [code review](code-review.md) guide.
- [ ] Run lint only if its dependency and configuration have been installed; both are currently absent.
- [ ] Verify a fresh database and an upgrade from representative existing data. Preserve workout, exercise, template, split, settings, goal, and measurement identities.
- [ ] Round-trip JSON and Drive backups on a separate test installation, including whatever photo support the release promises.
- [ ] Verify supported competitor imports and spreadsheet export with realistic history and both weight units.
- [ ] Confirm malformed, incompatible, or cancelled imports/restores leave data safe.
- [ ] Check unfinished-workout recovery and repeated-tap/concurrent save behavior.
- [ ] Verify local logging offline and with no Google account.

## Native release build

- [ ] Keep `app.json`, package version metadata, in-app version display, and export metadata consistent. Inspect current hard-coded versions before release.
- [ ] Regenerate native projects after config/plugin/branding changes and preserve intended local customizations.
- [ ] Configure production signing. The current local Android release build uses the debug key.
- [ ] Confirm Google OAuth configuration for the production signing identity.
- [ ] Build for the intended distribution target and device architectures. An emulator-only APK is not a phone distribution build.
- [ ] Install and inspect the actual release-mode artifact. Verify name, launcher icon, splash, and startup behavior.

A local Android release-mode build can be made with:

```sh
npx expo prebuild --platform android --no-install
npx expo run:android --variant release
```

This is useful for release-mode verification; it does not establish production signing or create a completed store submission. Local iOS builds require macOS/Xcode. There is no checked-in EAS build configuration; choose and document the distribution setup when it is established.

## Device checks

- [ ] Start/log/save/reopen a workout, including templates, supersets, notes, editing history, and the numeric keyboard.
- [ ] Background, lock, and resume during a workout and rest timer; check allowed/denied permissions, alarm cancellation, and duplicate alerts.
- [ ] Test photos, file pickers, sharing, and Drive sign-in/restore on the target device.
- [ ] Inspect both dark themes, large text, keyboard avoidance, safe areas, and common phone sizes.
- [ ] Verify optional setup and tutorial can be skipped; existing users retain their data and launch experience.
- [ ] Verify analytics, calendar, goals, and Profile widgets with empty and substantial histories.
- [ ] Confirm Dev Tools and test-only entry points are absent in production, and support links lead to real destinations.
- [ ] Check cold launch, failed initialization, and reduced-motion startup behavior.

Record the actual device/build tested and any unavailable platform. Automated checks do not establish mobile layout or native behavior.

## Public information and submission preparation

- [ ] Write accurate store description, screenshots, release notes, support details, and public privacy policy.
- [ ] Align privacy disclosures with local storage, optional Google Drive backup, progress photos, exports, and feedback.
- [ ] Complete the target store's current account, testing, app-content, and privacy requirements.
- [ ] Verify ratings and any support-payment flow against the target store's current rules.
- [ ] Obtain explicit authorization before uploading or publishing.

## After an authorized release

- Record the release version/date and meaningful verification in current progress.
- Check available support channels and store feedback for launch issues; do not assume crash reporting is installed.
- If a serious data or runtime issue appears, assess affected users and stop further rollout where possible. Prepare a forward fix; never assume an older binary can safely read a newer database schema.
