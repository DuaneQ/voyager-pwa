Goal: Analyze the current implementation for AI-generated itineraries and manually created itineraries. Identify performance issues, S.O.L.I.D. & Clean Code violations, duplicate/redundant code, and opportunities to achieve the same behavior with less code.
Hard constraint: Do not propose changes that alter externally observable behavior or data contracts.

Scope

Frontend (React/TypeScript): src/components/**, src/hooks/**, src/services/**

Backend (Node/TypeScript): functions/src/** (Firebase Functions, Firestore/Storage access)

Shared utils/models: src/utils/**, 

Context (assume typical stack)

React + TS + Firebase (Auth, Firestore, Storage), Cloud Functions (Node 18+), Routing, State mgmt (Context/), HTTP fetch to AI provider.

Two flows:

AI-generated itinerary (profile → prompt → generation → persist)

Manual itinerary builder (forms → validation → persist)

What to produce

Return only the following sections, in order:

Summary (≤150 words)

Findings — grouped list with IDs (e.g., F-01, F-02):

Type: (Performance | SOLID | CleanCode | Duplication | Safety)

Location(s): file:line ranges

Issue: concise description

Why it matters: impact/risk

Safe Refactor Suggestions (non-breaking, 1–3 steps each):

Ref-ID: ties to Finding ID

Tactic: (e.g., extract function, de-duplicate util, memoize selector, batch Firestore ops, replace N+1 with Promise.all, etc.)

Before/After pseudo-snippet (≤20 lines each) showing identical I/O

Risk: Low/Med/High (default Low)

Duplicate Map

symbol/function → candidates [file:lines...] with %-similarity if detectable

Performance Opportunities

Client: re-render hotspots, memoization, list virtualization, expensive effects, over-wide contexts

Server: cold starts, unawaited promises, N+1 Firestore reads, missing composite indexes, lack of batching/transactions, chatty network, large payloads

For each, give a 1-line fix and expected effect

Contract & Safety Checks

Confirm no change to: types/interfaces, Firestore schema, collection/field names, API routes, auth rules, analytics events

Verification Plan (no code changes)

Quick tests to prove equivalence: unit/integ assertions, log points, timings, sample data

Patch Plan (Optional)

Ordered list of tiny PRs (≤200 LOC each), each tied to Findings and marked Low risk

Specific Checks (be thorough)

S.O.L.I.D.

SRP: UI components mixing fetch/derive/persist?

OCP: conditionals branching by “AI vs Manual” that could be polymorphic?

LSP: shared types where substitutions break assumptions?

ISP: “god” interfaces with unused members?

DIP: services depend on concretions (e.g., direct Firestore) vs injected ports?

Clean Code

Long functions, flag params, magic numbers, inconsistent naming, missing null/undefined guards, duplicated validation.

Performance

React: unnecessary state in parents, unstable deps, missing useMemo/useCallback, heavy renders in lists (consider virtualization).

Firestore/Functions: N+1 reads inside loops, missing Promise.all, unbounded queries, lack of indexes, large docs, inefficient serialization, cold start penalties (ESM, keep-warm, min deps).

Duplication

Similar normalizers/mappers/date & currency utils; repeated fetch wrappers; duplicate form schemas. Suggest a single itinerary domain module (normalize/validate/compare/price/serialize).

Safety

Idempotency for writes; retries; defensive parsing of AI output; schema validation (Zod/Yup) at boundaries; timeouts & cancellation; rate limits.