# Native Migration Milestones

This folder contains milestone directories for the React Native (Expo + RN-web) migration. Each milestone contains a README and a `stories/` folder with one or more actionable stories. Stories include acceptance criteria, tasks, dependencies, and estimates.

Planned milestones (high level)

1. 01_PoC — Proof-of-Concept: scaffold Expo app, extract minimal shared services (auth & storage), implement Login screen, and demo expo-notifications token acquisition.
2. 02_Shared_Extraction — Move types, utils, and core services into `/shared` and implement platform adapters (storage, notifications, places)
3. 03_UI_Migration — Rebuild critical screens in RN components and validate RN-web parity
4. 04_Native_Integrations — Integrate Stripe, Crashlytics, Maps, and advanced native modules (EAS builds)
5. 05_CI_Release — Configure CI, EAS builds, and automated submission to stores

Start with `01_PoC/` then move to `02_Shared_Extraction/`.

Refer to `../PLANNING.md` for the full plan and rationale.