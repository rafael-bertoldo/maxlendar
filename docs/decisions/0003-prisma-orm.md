# ADR 0003: Use Prisma ORM with SQLite

- **Status:** Accepted
- **Date:** 2026-11-25
- **Decision owner:** User

## Context

The user selected TypeScript for both frontend and backend, Prisma as the ORM, and SQLite as the database. The MVP is not expected to scale and should remain simple to deploy and understand.

## Decision

Use Prisma ORM to access the SQLite database from the NestJS backend. Target Prisma ORM v7 for the initial implementation because its official documentation supports local SQLite files and migrations, while the currently available Prisma ORM 8 SQLite package is marked experimental. Recheck Prisma's release status when implementation dependencies are selected.

Official references: [Prisma ORM v7 SQLite support](https://www.prisma.io/docs/orm/v7/core-concepts/supported-databases/sqlite) and [Prisma ORM supported databases](https://www.prisma.io/docs/orm/supported-databases).

## Consequences

- Prisma provides a typed data-access client and schema migration workflow for application models.
- Use migrations from the first data-bearing increment; do not rely on development-only schema synchronization in deployed environments.
- Keep the SQLite file on persistent storage and run one application instance as documented in [ADR 0002](0002-sqlite-database.md).
- The specific SQLite driver adapter, Prisma minor version, and deployment provider remain open until implementation planning.

## Migration command note

In the current development environment, `RUST_LOG=warn` is inherited by Prisma ORM 7.10.1 and makes `migrate deploy` exit with an empty `Schema engine error`. Prisma's schema-engine issue tracker documents migration behavior being affected by inherited `RUST_LOG` values ([issue #29355](https://github.com/prisma/orm/issues/29355)). The API workspace runs Prisma migration commands through `scripts/prisma-cli.cjs`, which sets `RUST_LOG=info` without changing the shell or application runtime environment. Use the workspace scripts instead of invoking the Prisma migration CLI directly in this environment.
