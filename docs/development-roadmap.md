# Development roadmap

Each phase ends with runnable checks and updated documentation before the next begins.

## Phase 0 — complete

Environment inventory, repository skeleton, product boundary, module architecture, ER/schema plan, API outline, authentication, inventory freshness, ranking, security, testing, deployment, assumptions, and risks.

## Phase 1 — complete

Generate React/Vite and Spring Boot projects, Maven wrapper, lint/format config, PostgreSQL Compose service, Flyway baseline, health endpoint, `.env.example`, and CI checks. Exit: UI and API start, DB connects, migration runs, health is green.

## Phase 2 — complete

Users/roles/refresh-token migrations; register/login/refresh/logout; BCrypt, JWT, RBAC, protected UI; integration tests for auth and privilege failure.

## Phase 3 — complete

Store submission, approval, profile, coordinates, hours, owner checks, admin workflow, audit events, and minimal owner/admin UI.

## Phase 4 — complete

Categories, products/variants, store listings, current/history price, inventory states, optimistic concurrency, configurable freshness, ownership checks, and audit events.

## Phase 5 — complete

PostgreSQL trigram search, bounded candidate query, Haversine distance, radius/sort/pagination, freshness-weighted score/explanation, ranking tests, realistic Indian catalog data, and responsive customer UI.

## Phase 6 — complete

Mobile-first home/search/results/product/store, location input, directions, favorites, history, reviews, reports, accessible states.

## Phase 7 — complete

Inventory/price editing, store profile/hours, summary analytics, bulk UI updates (not CSV import).

## Phase 8 — admin

Users, stores, approvals, catalog, reviews, reports, audit logs, metrics.

## Phase 9 — journey testing

Customer and owner critical flows, API integration tests, frontend interaction tests, failure/concurrency cases.

## Phase 10 — hardening

Threat review, query plans/indexes, performance budgets, structured logging, backups/restore, deployment config, accessibility audit, operational runbook.

## Zero-cost first-launch scope (separate from the original development phases)

Work is delivered in two-phase batches, followed by user review. Do not start the next batch automatically.

| Launch phase | Scope | Status |
|---|---|---|
| 1 | Core-flow verification and critical fixes | Complete; awaiting user review |
| 2 | Administration, moderation, catalog UI, audit browsing, assisted account recovery | Complete; awaiting user review |
| 3 | CSV inventory onboarding and freshness reminders | Complete; awaiting user review |
| 4 | Stock enquiries and reservations | Complete; awaiting user review |
| 5 | Merchant outcome measurement | Pending |
| 6 | Manual revenue administration, offers and sponsored visibility | Pending |
| 7 | Discovery and production launch readiness | Pending |

### Current checkpoint

- Goal: finish the authorized launch phases 3–4, then stop for review.
- Decisions: reuse React Query, Spring Security, JDBC/JPA and PostgreSQL; no paid services or new dependencies. Recovery uses a 30-minute single-use code issued only after manual identity verification; administrator accounts require an operator recovery procedure.
- Implemented: admin moderation/catalog/recovery screens and APIs, audit records, immediate session invalidation on suspension/reset, account-switch cache clearing, automatic session refresh, search filtering/sorting before pagination, record pagination, frontend entry-page repair, visible request failures and removal of a placeholder-number WhatsApp link.
- Verification: frontend build/lint and 6 component tests pass; 13 backend tests pass. All six API/database journey groups pass on a separate local test database, including cross-owner access, recovery/session invalidation and logout after refresh rotation. Browser checks covered populated search, sorting/pagination, product details, the admin login guard and mobile recovery layout. Final whitespace/diff checks pass.
- Current batch: CSV preview/atomic imports with concurrency versions, inventory export/template, dashboard freshness reminders and review filtering; customer enquiries, merchant replies, two-hour confirmed holds, cancellation/expiry and collection stock deduction. No new dependencies or paid services.
- Verified current batch: 14 Nearkart backend tests and 12 frontend tests pass; production frontend build and lint pass. Local PostgreSQL/API checks passed for preview/atomic import, null/negative rows, ownership, optimistic versions, freshness filtering, enquiry replies, concurrent confirmations, cancellation, expiry/rebooking and single collection deduction. Browser journeys passed for CSV export/preview/import, owner replies, customer reservation confirmation/cancellation and mobile inbox layout, with no page errors or duplicate-key warnings. Final diff/whitespace checks pass.
- Review limits: INR CSV only, 500 rows/1 MB per import and 10,000 listings per export; dashboard reminders and 30-second in-app inbox polling only. Merchant confirmation holds stock for two hours; no payment or external notification service. Migration V11 creates the request table on the next backend startup.
- Next: user review of phases 3–4. No phase 5 work started; no deployment performed.
