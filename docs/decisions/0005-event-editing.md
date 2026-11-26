# ADR 0005: Event edits with optimistic concurrency

- **Status:** Accepted
- **Date:** 2026-11-26

## Context

US-08 requires editing an event's title, date, and time. `CalendarEvent` already carries a `version` field, but no write path uses it. The story also requires reminder schedules to follow an edited event, while push reminders are only planned for US-11. The user was asked to resolve both points before implementation.

## Decision

- `PATCH /api/events/:id` accepts `{ title, startsAt, timeZone, version }` for the signed-in user's event.
- `version` must match the stored version. The update increments it atomically; a mismatch returns `409` with `code: "VERSION_CONFLICT"`. A missing or foreign event returns `404` with `code: "EVENT_NOT_FOUND"`.
- The edit form prefills date and time from the stored instant in the viewer's local zone and saves using the viewer's IANA time zone. If the values are unchanged, the instant is preserved; `timeZone` becomes the editor's zone, replacing the previous provenance.
- US-08 changes only the event record. The reminder criterion is deferred to US-11, where reminder scheduling must read the current `startsAt` and `version` after an edit.

## Consequences

- Two devices editing the same revision cannot silently overwrite each other; the loser must reload and retry.
- Editing across time zones preserves the instant but intentionally changes the displayed provenance to the editor's zone.
- US-08 can be accepted without push infrastructure, with the reminder criterion explicitly marked as dependent on US-11 rather than silently skipped.
- Automated evidence should cover valid edits, field validation, unchanged event on error, ownership, version conflict, and the returned incremented version.
