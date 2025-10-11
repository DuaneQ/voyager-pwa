# Milestone 05 — CI, EAS build & Release Automation

Goal
- Configure CI to run unit tests, RN-web build, and to trigger EAS builds and submission to app stores.

Stories
- S1: `eas.json` setup and build profiles
- S2: GitHub Actions workflow that runs tests and triggers `eas build` for release branches
- S3: EAS Submit or Fastlane integration for App Store / Play Store submission
- S4: Secrets and credential management guide (APNs, keystore, google-services files)

Estimate: 1–2 weeks to get CI + EAS submit working end-to-end

Notes
- EAS credentials will be stored via EAS credential manager and GitHub secrets for CI triggers.
*** End Patch