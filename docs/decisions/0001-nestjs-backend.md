# ADR 0001: Use NestJS for the Backend

- **Status:** Accepted
- **Date:** 2026-11-25
- **Decision owner:** User

## Context

The maxlendar MVP is a small AI-first calendar with authentication, event management, reminders, push subscriptions, and assistant interactions. The user chose Node.js for the backend and asked for a solid, modular architecture informed by Clean Architecture and SOLID, without adopting CQRS unless it provides concrete value.

## Decision

Use NestJS as the Node.js backend framework. Organize the application as a modular monolith with product-oriented modules. Use Clean Architecture boundaries pragmatically, keeping domain and application rules independent from NestJS, HTTP, persistence, AI, and push providers.

The user selected NestJS with TypeScript.

## Consequences

- NestJS modules and dependency injection provide explicit composition and feature boundaries.
- The framework adds conventions and some structural overhead; keep the module and provider graph small and avoid abstracting every class.
- Do not add full CQRS, event sourcing, or separate read/write stores for the initial CRUD scope.
- Add CQRS only if later product needs create a real separation between query and command workflows.
