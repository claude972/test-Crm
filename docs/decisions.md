# KovaaLab CRM - Technical Decisions

## Architecture Decisions

### Decision 1: Nx Monorepo Structure
**Context:** Need to manage multiple modules as a single product.
**Decision:** Use Nx monorepo with NestJS backend and React/Next.js frontend.
**Consequences:** Shared dependencies, better organization, incremental builds.

### Decision 2: TypeORM + Prisma
**Context:** Need multi-tenant database with workspace isolation.
**Decision:** Use TypeORM for ORM + Prisma for migrations.
**Consequences:** Type-safe access, automated migrations, multi-tenancy.

### Decision 3: GraphQL API
**Context:** Need flexible data fetching for CRM features.
**Decision:** Use Apollo GraphQL server with NestJS.
**Consequences:** Flexible queries, single endpoint, strong typing.

### Decision 4: Multi-module Architecture
**Context:** Need modular, maintainable codebase.
**Decision:** Separate NestJS modules for each CRM feature.
**Consequences:** Clear separation, easier testing, independent development.

## Technology Stack

### Backend
- NestJS 10.x, TypeORM, PostgreSQL 16, Redis 7, Apollo GraphQL

### Frontend
- Next.js, Nx, Yarn

### Infrastructure
- Docker Compose, GitHub Actions
