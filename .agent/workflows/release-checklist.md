---
description: Build, test, and publish process for app releases
---

# Release Checklist

Comprehensive checklist for preparing and shipping a release.

## Prerequisites

- All planned features complete
- No known critical bugs
- Version number incremented

## Pre-Release

### Code Quality
- [ ] Run full code audit (see `code-review.md`)
- [ ] All lint errors resolved
- [ ] No compiler/build warnings
- [ ] Dead code removed

### Testing
- [ ] Full test suite passes
- [ ] Manual testing of critical paths:
  - [ ] Start new workout
  - [ ] Log sets for multiple exercises
  - [ ] Complete and save workout
  - [ ] View workout history
  - [ ] Export data
  - [ ] Import data (if applicable)
- [ ] Test on multiple device sizes
- [ ] Test offline functionality
- [ ] Test upgrade path from previous version

### Data Safety
- [ ] Existing user data preserved after upgrade
- [ ] Database migrations work correctly
- [ ] Export format backwards compatible

### Documentation
- [ ] CHANGELOG.md updated
- [ ] Version number updated in:
  - [ ] App manifest/config
  - [ ] About screen
- [ ] Release notes written

## Build

### Android

```bash
# Commands TBD based on framework
# Example for typical Android build:
./gradlew assembleRelease
# or for Flutter:
flutter build apk --release
```

- [ ] Release build compiles successfully
- [ ] APK size reasonable
- [ ] ProGuard/R8 configured correctly (if applicable)

### iOS (if applicable)

```bash
# Commands TBD
```

## Testing Release Build

- [ ] Install release build on test device
- [ ] Verify all features work in release mode
- [ ] No debug tools or logs visible
- [ ] Performance acceptable

## Publish

### Google Play Store
- [ ] Screenshots up to date
- [ ] Store description accurate
- [ ] Upload AAB/APK
- [ ] Set rollout percentage (staged rollout recommended)
- [ ] Submit for review

### Alternative Distribution (if applicable)
- [ ] GitHub Releases
- [ ] APK download on website
- [ ] F-Droid (if open source)

## Post-Release

- [ ] Monitor crash reports (24-48 hours)
- [ ] Check store reviews
- [ ] Update `current-progress.md` with release info
- [ ] Tag release in git
- [ ] Celebrate 🎉

## Rollback Plan

If critical issues discovered:
1. Halt rollout in Play Console
2. Identify issue
3. Fix and re-release or rollback to previous version
4. Post-mortem and document in knowledge files

---

## Last Updated
- Date: 2026-01-04
- Session Context: Initial workflow setup
