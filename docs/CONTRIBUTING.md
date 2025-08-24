# Engineering Ruleset (v1)

This repository follows the rules below for any new code, refactors, or suggestions. All PRs must comply.

## 1) Core principles
- SOLID, DRY, KISS, YAGNI
- 12‑Factor App for deployability
- Composition over inheritance
- Hexagonal/Clean Architecture: domain → application → infrastructure separation
- Security by default; least privilege; privacy-first
- Observability built-in (logs, metrics, traces)

## 2) Architecture
- Domain layer has no framework dependencies.
- Application layer depends only on domain; defines use‑cases and ports (interfaces).
- Infrastructure layer implements adapters (HTTP, DB, cache, queues, external APIs).
- Use dependency injection; avoid global singletons.
- Keep modules small; prefer pure functions in domain.

## 3) Coding standards
- TypeScript in strict mindset. Avoid `any` and `// @ts-ignore` (justify if used).
- ESLint + Prettier enforced. Remove unused imports/vars.
- No dead code. Delete unused files/functions in the same PR.
- No console logs in production paths. Use structured logging (pino/winston) when needed.
- Replace magic numbers with named constants/config.

## 4) API and validation
- Validate inputs at the edge with schemas (zod/yup/class-validator). Sanitize and strip unknowns.
- Do not expose domain entities directly; use DTOs.
- Version APIs (e.g., /v1) and document with OpenAPI.

## 5) Error handling
- Throw typed errors (ValidationError, NotFoundError, AuthError, ConflictError, ExternalServiceError, etc.).
- Map errors to HTTP status codes and a consistent response shape:
  {
    "error": { "type": "validation_error", "message": "...", "details": [], "correlationId": "..." }
  }
- Surface actionable messages to the UI; include a correlationId in logs/responses.
- Do not swallow errors.

## 6) Observability
- Structured JSON logs: timestamp, level, message, correlationId, requestId, route, latency.
- Metrics (Prometheus/OpenTelemetry): request count/latency, error rates, cache hits, external call latency.
- Tracing via OpenTelemetry (propagation headers).
- Health endpoints: /health, /ready; /metrics for Prometheus (backend services).

## 7) Security
- TLS everywhere; Helmet for HTTP; explicit CORS allowlist in prod.
- Sanitize inputs, encode outputs; never log PII/secrets.
- Secrets from env/secret manager only (no secrets in repo).
- Timeouts on all I/O; retries with jitter for idempotent calls; rate limiting where applicable.

## 8) Performance and resilience
- Timeouts + circuit breakers/bulkheads for flaky dependencies.
- Cache hot reads with defined TTLs and invalidation.
- Use async queues for slow work; keep HTTP requests fast.

## 9) Data & migrations
- Use migration tooling; migrate on deploy.
- Indexes must match query patterns (verify with EXPLAIN).
- Soft deletes only when required; otherwise hard delete with audit trail.

## 10) Testing (pyramid)
- Unit tests for domain/use-cases (fast, isolated).
- Integration tests for adapters (HTTP handlers, repositories).
- Contract tests for external APIs when feasible.
- E2E smoke for critical paths in CI.
- Aim ≥ 80% coverage without chasing 100%.

## 11) PR checklist (Definition of Done)
- [ ] Follows SOLID and this ruleset
- [ ] Ports/interfaces defined; DI wiring updated
- [ ] Input/output schemas validated at the edge
- [ ] Errors typed and surfaced with correlationId
- [ ] Logs/metrics/traces added where relevant
- [ ] Unit/integration tests added/updated and passing
- [ ] OpenAPI/docs updated (if API change)
- [ ] Migrations created/applied (if schema change)
- [ ] Removed dead code and unused imports
- [ ] Feature flags/config/docs updated if applicable

## 12) Repo-specific notes (Airports)
- Use OpenFlights dataset as the single source of truth.
- Exclude military bases from results.
- Default selection: 3 closest international + 2 closest domestic within 200 km.
- International classification is heuristic and data-driven (no hardcoded code lists).
- Deduplicate by IATA; require valid IATA (3 letters).
- Cache dataset; do not refetch per request.
- Surface meaningful errors to the UI for “no coordinates” or “no airports found”.

## 13) Change proposal template (PR description)
- Problem statement & context
- Proposed solution & alternatives considered
- API/data model changes
- Security & privacy impact
- Ops/observability impact
- Rollout/rollback plan
- Screenshots/logs/benchmarks (if relevant)

## 14) How to propose code in reviews
- Provide minimal diffs with explicit filepaths.
- Use context comments like `// ...existing code...` sparingly.

---

See .github/PULL_REQUEST_TEMPLATE.md for the enforced checklist.
