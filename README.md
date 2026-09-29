# NearKart

**Search Nearby. Compare Prices. Shop Yourself.**

NearKart helps customers find products in nearby physical stores, compare price, distance, availability, and inventory freshness, then open external directions. The MVP has no delivery, cart, checkout, or payments.

## Status

Phase 7 owner dashboard is complete: responsive web/mobile screens now cover store profile and hours, catalog listings, inventory and price updates, bulk saves, and 30-day activity analytics.

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
├── docker/          # Optional container support files
├── scripts/         # Small cross-project developer scripts
└── docker-compose.yml
```

## Prerequisites

- Java 17 LTS (e.g. Azul Zulu 17 or Temurin 17)
- Node.js 24 LTS and npm 11
- Docker 29+ with Compose
- Git

Maven and PostgreSQL do not need global installation: use the committed Maven wrapper and Docker service.

## Setup, development, testing, and deployment

Start the complete local stack with one command:

```sh
./scripts/dev.sh
```

On first run it creates `.env` with a random local JWT secret, installs frontend dependencies, starts PostgreSQL, backend, and frontend, and stops them together on `Ctrl+C`.

Manual setup:

```sh
cp .env.example .env
docker compose up -d postgres
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
- `psql: command not found`: use the PostgreSQL container through Docker Compose.
- Port conflict: the planned defaults are frontend `5173`, backend `8080`, PostgreSQL `5432`.
