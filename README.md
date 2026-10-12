> Current product identity: **Parth Local**, part of **Parth Software Labs**. See [branding record](docs/BRANDING.md). Older technical aliases below remain for compatibility. Product readiness is under review.

# NearKart

**Search Nearby. Compare Prices. Shop Yourself.**

NearKart helps customers find products in nearby physical stores, compare price, distance, availability, and inventory freshness, then open external directions. The MVP has no delivery, cart, checkout, or payments.

## Status

Phase 7 owner dashboard is complete: responsive web/mobile screens now cover store profile and hours, catalog listings, inventory and price updates, bulk saves, and 30-day activity analytics.

Zero-cost launch phases 1–4 are implemented: core-flow fixes, administration/moderation, catalog editing, audit browsing, assisted recovery, CSV inventory onboarding, freshness reminders, stock enquiries and reservations. Phases 3–4 are ready for review. Remaining launch phases are tracked in the roadmap.

Repeatable API journey checks: `python3 scripts/check-phases-1-2.py` and `python3 scripts/check-phases-3-4.py`. Run only against a local API backed by a disposable test database; it creates accounts and catalog data. Set `NEARKART_CHECK_URL`, `NEARKART_CHECK_ADMIN_EMAIL` and `NEARKART_CHECK_ADMIN_PASSWORD` for that test instance.

## Architecture

- React + TypeScript + Vite customer and operations UI
- Java 25 + Spring Boot 4.1 modular monolith
- PostgreSQL with Flyway migrations
- REST APIs under `/api/v1`
- Stateless short-lived access JWTs with rotated refresh tokens

See [architecture](docs/architecture.md), [database](docs/database.md), [API](docs/api.md), [deployment](docs/deployment.md), and [roadmap](docs/development-roadmap.md).

## Repository

```text
nearkart/
├── frontend/        # React application
├── backend/         # Spring Boot application
├── docs/            # Product and engineering decisions
├── scripts/         # Small cross-project developer scripts
└── .env.example     # Managed database configuration
```

## Prerequisites

- Java 17 LTS (e.g. Azul Zulu 17 or Temurin 17)
- Node.js 24 LTS and npm 11
- Git

Maven and PostgreSQL do not need global installation: use the committed Maven wrapper and managed cloud PostgreSQL.

## Setup, development, testing, and deployment

Configure managed database credentials in `.env`, then start the application processes:

```sh
./scripts/dev.sh
```

On first run it creates `.env` with a random local JWT secret, installs frontend dependencies, connects to managed PostgreSQL, starts backend and frontend, and stops them together on `Ctrl+C`.

Manual setup:

```sh
cp .env.example .env
 # Fill SPRING_DATASOURCE_URL, POSTGRES_USER and POSTGRES_PASSWORD with managed DB credentials.
```

Then run these in separate terminals:

```sh
cd backend && set -a && source ../.env && set +a && ./mvnw spring-boot:run
cd frontend && npm ci && npm run dev
```

The frontend runs at `http://localhost:5173`; backend health is `http://localhost:8080/actuator/health`.

Tests and builds:

```sh
(cd backend && ./mvnw test)
(cd frontend && npm test && npm run lint && npm run build)
```

For a public test environment, follow the [Vercel + Render deployment guide](docs/deployment.md).

## Environment variables

Copy `.env.example`, replace `JWT_SECRET` with at least 32 random bytes, and load it before starting the backend. Production must set `AUTH_SECURE_COOKIE=true` and use a secret manager.

## Troubleshooting

- `mvn: command not found`: use `backend/mvnw`.
- Database unavailable: configure managed PostgreSQL credentials; no local database is started.
- Port conflict: the planned defaults are frontend `5173`, backend `8080`; the database is remote.
