# ADR 0002: Use SQLite for the MVP Database

- **Status:** Accepted
- **Date:** 2026-11-25
- **Decision owner:** User

## Context

The MVP is a personal calendar portfolio project. The user does not intend to scale it and prefers to keep the system simple. The application still needs durable calendar data, per-device sessions, and reminder scheduling that survives restarts.

## Decision

Use SQLite as the relational database for the MVP. Run one application instance against a database file on persistent storage. Keep reminder scheduling in the NestJS application process and persist due reminders in SQLite so the scheduler can resume after a restart.

## Consequences

- The database does not require a separate database service, which keeps initial deployment simple.
- Hosting must provide durable persistent storage, an always-on application process for reminders, and a backup/restore plan. Do not use an ephemeral filesystem for the database file.
- Keep write transactions short. Avoid multiple application instances or a separate reminder worker concurrently writing to the same SQLite file.
- Use schema migrations from the first data-bearing increment.
- Revisit SQLite if measured write contention, availability needs, or deployment constraints exceed the single-instance design; do not add scaling infrastructure speculatively.
- The SQLite adapter/ORM and hosting provider remain undecided.
