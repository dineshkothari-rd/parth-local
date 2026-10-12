# Architecture

## Shape

NearKart is one deployable Spring Boot modular monolith, one React application, and one PostgreSQL database. Modules communicate through service interfaces inside the process; controllers never call another module's repository.

```text
React UI -> /api/v1 REST -> controllers -> application services -> repositories -> PostgreSQL
                                      \-> ranking/search domain services
```

## Backend modules

| Module | Owns | May use |
|---|---|---|
| `auth` | credentials, access/refresh tokens | `user`, `audit` |
| `user` | profiles, roles, suspension | `audit` |
| `store` | stores, locations, hours, ownership, approval | `user`, `category`, `audit` |
| `category` | category taxonomy | `audit` |
| `product` | products, aliases, variants | `category`, `audit` |
| `inventory` | store listings, quantity, availability, update source | `store`, `product`, `pricing`, `audit` |
| `pricing` | current and historical prices | `store`, `product`, `audit` |
| `location` | coordinate validation and Haversine distance | none |
| `search` | query/filter/pagination orchestration | `product`, `store`, `inventory`, `pricing`, `location`, `ranking` |
| `ranking` | normalized scoring and explanations | none; receives value objects |
| `favorite` | product/store favorites | `user`, `product`, `store` |
| `review` | store reviews and moderation | `user`, `store`, `audit` |
| `report` | incorrect-information reports | `user`, `store`, `product`, `audit` |
| `analytics` | bounded product events and aggregates | domain IDs only |
| `admin` | privileged workflows | module services, never repositories |
| `common` | API envelope, errors, IDs, time, request IDs | none |

Package each non-trivial module by `controller`, `service`, `repository`, `entity`, and `dto` only as those types become necessary. Cross-module JPA entity relationships are avoided; store foreign IDs as UUIDs and resolve through the owning module.

## Frontend boundaries

`app` owns providers/router; `features` owns feature API functions, queries, components, pages, and types; shared presentational primitives live in `components`; layouts remain thin. TanStack Query owns server state. Zustand is added only if actual cross-route client state cannot be represented by URL state or React context.

## Runtime and data flow

- The backend calculates distance, freshness, and rank.
- PostgreSQL performs bounded candidate retrieval; Java ranks the small candidate page/window.
- Price and inventory updates are transactional and append audit/history records.
- External maps URLs are generated from validated coordinates; no custom navigation engine.
- Timestamps are UTC; API timestamps are ISO-8601; money is `numeric(12,2)` plus ISO currency (`INR` initially).

## Evolution boundaries

Search, ranking, maps-link generation, and event recording have small service contracts because credible replacements are known. No message bus, distributed cache, or provider factory is introduced before a second implementation exists.

## Deployment

Development runs the API and Vite server locally against managed cloud PostgreSQL. Local Docker/database orchestration was removed12October2026. Production starts as three units: static frontend on a CDN-capable host, one stateless backend service, and managed PostgreSQL. Scale the backend horizontally after externalizing refresh-token persistence and enforcing database-backed concurrency.

## Testing strategy

- Domain unit tests cover ranking, freshness, ownership decisions, and price/inventory transitions.
- Spring integration tests cover authentication, authorization, repository queries, migrations, and REST contracts against PostgreSQL.
- Frontend Vitest/Testing Library tests cover search states, comparison rendering, protected routes, and accessible interaction.
- One browser-level smoke journey covers location → search → compare → store → directions after Phase 6.
- Prefer a few high-value tests at module boundaries; mock only external maps/navigation and time where necessary.
