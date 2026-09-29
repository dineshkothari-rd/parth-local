# Decisions, assumptions, and risks

## Accepted decisions

| ID    | Decision                                         | Reason                                                                            |
| ----- | ------------------------------------------------ | --------------------------------------------------------------------------------- |
| D-001 | Modular monolith                                 | Fastest reliable delivery with enforceable boundaries                             |
| D-002 | Java 25 + Spring Boot 4.1.x                      | Latest available LTS JDK; compatible with the stable supported framework baseline |
| D-003 | PostgreSQL + Flyway                              | Relational integrity, migrations, strong search baseline                          |
| D-004 | Haversine after bounding-box prefilter           | Sufficient MVP geography without PostGIS operations cost                          |
| D-005 | PostgreSQL trigram search behind `SearchService` | Handles partial/case-insensitive MVP queries without a search cluster             |
| D-006 | JWT access + rotating opaque refresh token       | Stateless API access with practical revocation                                    |
| D-007 | Soft lifecycle state for core entities           | Preserves referential/audit history                                               |
| D-008 | Current price plus append-only history           | Fast reads with traceable price changes                                           |
| D-009 | URL/context before Zustand                       | Avoids duplicate client state                                                     |

## Assumptions

- Initial market uses INR and Indian addresses; schema retains currency and timezone.
- Search radius is capped at 25 km and results at 100/page.
- Store owners manually maintain inventory in MVP.
- A user may own multiple stores; a store has one primary owner initially.
- Reviews establish account/store interaction only through platform rules; verified purchase is unavailable because purchases happen offline.
- Public SEO requirements will be reassessed before Phase 6 because a Vite SPA alone cannot guarantee rich indexing.

## Risks and mitigations

| Risk                                | Mitigation / trigger                                                   |
| ----------------------------------- | ---------------------------------------------------------------------- |
| Manual inventory becomes stale      | Prominent freshness, lower rank, reports, owner reminders later        |
| Duplicate catalog data              | Admin-owned canonical variants, aliases, uniqueness, moderation        |
| Location query slows                | Bounding box/index/query-plan checks; adopt PostGIS when measured      |
| Trigram relevance is weak           | Query telemetry and aliases; add dedicated search only after evidence  |
| Ranking biases price/distance       | Explain factors, test scenarios, version/measure weight changes        |
| Owner cross-tenant access           | Service-level ownership checks and negative integration tests          |
| Refresh token theft/replay          | Hash, rotate, family reuse detection, secure cookie                    |
| Review abuse without purchase proof | One/user/store, throttling, moderation, account status                 |
| SPA SEO underperforms               | Measure indexing; add prerendering/SSR only for public pages if needed |
| Analytics tables grow quickly       | Minimal events, retention/aggregation plan before high volume          |

## Deferred deliberately

Redis, PostGIS, OpenSearch, Kafka, microservices, delivery/payment flows, multi-product optimization, alerts, promotion, subscriptions, POS/CSV import, PWA, and full i18n. Add each only when its documented trigger appears.
