# Setup and environment discovery

## Inspected on 2026-09-05

| Tool                  |        Detected | Decision                        |
| --------------------- | --------------: | ------------------------------- |
| macOS                 | 27.0 (26A5425a) | Supported developer host        |
| Java                  |  OpenJDK 25 LTS | Backend runtime                 |
| Maven                 |   Not installed | Commit Maven Wrapper in Phase 1 |
| Node.js               |         24.19.0 | Use Node 24 LTS                 |
| npm                   |         11.17.0 | Package manager                 |
| Git                   |          2.50.1 | Supported                       |
| Database              | Managed cloud | Local Docker removed12October2026 |
| `psql` / `pg_isready` |   Not installed | Use managed PostgreSQL       |

## Version baseline

- Java 25 and Spring Boot 4.1.1
- Maven Wrapper 3.9.x
- Node.js 24 LTS and npm 11
- React 19, TypeScript, and current stable Vite compatible with Node 24
- PostgreSQL 17.6 Alpine container

Frontend patch versions are committed in `package-lock.json`. Upgrades require passing tests and a documented compatibility check.

## Local workflow

```sh
cp .env.example .env
# Configure managed PostgreSQL credentials in .env; no local database startup.
```

Then run these in separate terminals:

```sh
cd backend && set -a && source ../.env && set +a && ./mvnw spring-boot:run
cd frontend && npm ci && npm run dev
```

Validation includes backend tests, Flyway migration against PostgreSQL, `/actuator/health`, frontend tests/typecheck/build, and cloud database connectivity.

## Environment policy

Development, test, and production use Spring profiles/configuration with environment overrides. Tests use isolated databases. Production credentials never appear in checked-in files. Defaults are safe only for local development.
