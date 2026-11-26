# ADR 0009: Confirmation-first assistant contract

- **Status:** Accepted
- **Date:** 2026-11-26

## Context

US-12 to US-15 ask the assistant to interpret natural language, but every story requires the user to review and confirm before data changes. Existing create/edit/delete endpoints already enforce version checks, time-zone rules, and reminder scheduling. The user delegated remaining decisions with the recommendation as the chosen option.

## Decision

- The assistant has a single read-only interpretation endpoint, `POST /api/assistant/interpret`. It returns either a draft, an answer with evidence, a change/deletion proposal, or a clarification. It never writes data.
- Confirmation is handled by the interface calling the existing `POST`, `PATCH`, and `DELETE /api/events` endpoints. This preserves optimistic concurrency, reminder rescheduling/cancellation, and session handling already agreed in ADR 0004–0008.
- A proposal must include the target event's `id`, `title`, `startsAt`, and `version` when an edit or deletion is involved. If the target or requested change is ambiguous, the response is a clarification and no proposal is shown.
- The client sends its IANA `timeZone` and current instant with every interpretation so relative dates are resolved in the viewer's frame, not the server's.
- Every response states what the assistant understood and its limits. The UI shows clarifying text instead of guessing when required details are missing.

## Consequences

- The same safety contract covers all four AI stories: no silent mutation, no unsupported answer, and version conflicts remain visible to the user.
- The assistant layer can later call a hosted model without changing the existing event endpoints or the confirmation UI.
- QA can evaluate representative phrases, ambiguity handling, rejection paths, and version conflicts without granting the assistant write access.
