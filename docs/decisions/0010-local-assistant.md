# ADR 0010: Local deterministic assistant for the MVP

- **Status:** Superseded / Retired by [US-17](../product-backlog.md) (2026-11-28)
- **Date:** 2026-11-26

> **US-17 update (2026-11-28):** The assistant was removed from the application. This ADR is preserved as historical record of the local deterministic interpreter used while US-12 to US-15 were active; it is no longer an active product/architecture decision.

## Context

The product is AI-first and portfolio-oriented, but no hosted AI provider, API key, budget, or availability requirement was supplied. The assistant must be demonstrable offline and must not claim quality it cannot evidence. The user delegated the decision with the recommendation as the chosen option.

## Decision

- The MVP uses a local, deterministic Portuguese-language interpreter behind `AssistantService`. It recognizes the four intents required by US-12 to US-15 and returns structured proposals or clarifications.
- No network AI provider is introduced and no API keys are added. The interpreter is explicit about supported phrasing: relative dates (`hoje`, `amanhã`, `depois de amanhã`, `próxima segunda`), clock times (`10h`, `10:30`, `às 14`), and simple target/change phrases.
- Natural-language answers are generated only from the signed-in user's stored events in the resolved range. If the range or intent is uncertain, the assistant asks for clarification instead of answering.
- The evaluation set is part of QA evidence: representative examples for each intent, missing details, ambiguous targets, multiple matches, rejection paths, and a version-conflict case. Quality is measured against those examples, not a single happy path.
- A future ADR may replace the local interpreter with a hosted model; the confirmation-first contract from ADR 0009 remains unchanged.

## Consequences

- The AI experience is central and usable in the MVP without external cost, latency, secrets, or provider downtime.
- The product does not claim general natural-language understanding. Unsupported wording produces a clarification, which is a visible, understandable limit.
- Portfolio reviewers can inspect and reproduce the interpreter's behavior and evidence, including failures and recovery.
