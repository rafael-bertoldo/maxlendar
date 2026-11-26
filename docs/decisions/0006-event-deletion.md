# ADR 0006: Event deletion with confirmation

- **Status:** Accepted
- **Date:** 2026-11-26

## Context

US-09 requires manual deletion of a saved event. The earlier stories established optimistic versioning for edits ([ADR 0005](0005-event-editing.md)), but deletion had no contract. The story also requires cancellation of pending reminders, while reminder infrastructure is only planned for US-11. The user chose explicit confirmation before deletion.

## Decision

- Deletion starts from the existing event card and opens a confirmation view inside the event dialog showing the event title and local date/time. No event is removed before that confirmation.
- `DELETE /api/events/:id?version=<n>` requires the currently loaded version. The delete is conditional on the stored version; a mismatch returns `409` with `code: "VERSION_CONFLICT"`, and a missing or foreign event returns `404` with `code: "EVENT_NOT_FOUND"`.
- After confirmation, the dialog closes, a notice is shown, the current calendar view is preserved, and the event list is refetched.
- Reminder cancellation is deferred to US-11, following the same rule as edits. When reminders exist, they must be canceled only after the conditional delete succeeds.

## Consequences

- Accidental deletion is prevented by an explicit, reviewable confirmation step.
- Deletion cannot silently remove an event changed on another device; the user reloads and reviews again.
- US-09 can be accepted without push infrastructure, with the reminder criterion explicitly marked as not executable until US-11.
- QA evidence must cover confirmation, valid delete, stale version, missing/foreign event, 401, unchanged event list on failure, and refetch after success.
