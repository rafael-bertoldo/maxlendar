# ADR 0011: Expand weekly series on read and store only occurrence exceptions

- **Status:** Accepted
- **Date:** 2026-11-28
- **Decision owner:** User for product scope; Architect for technical design
- **Related:** [US-16](../product-backlog.md), [ADR 0004](0004-event-time-zone.md), [ADR 0009](0009-assistant-contract.md)

## Context

US-16 validated weekly recurrence without an end date, starting at the first future occurrence that matches the rule. Editing or deleting must explicitly target either one occurrence or the whole series; a single occurrence is an editable exception. Standard 10-minute and 1-minute reminders must apply to every future occurrence, in the creator's local time zone, and existing optimistic concurrency (`409 VERSION_CONFLICT`) must remain meaningful.

Three options were considered:

1. Materialize every future occurrence as a `CalendarEvent` row. This makes range queries and reminders reuse existing code, but an endless series creates unbounded rows and reminder records.
2. Store the rule once, expand occurrences on read, and persist only exceptions; schedule reminders inside a rolling horizon. This keeps one source of truth and bounded durable work.
3. Materialize a fixed window of occurrences and expand beyond it. This avoids an immediate reminder redesign but creates two representations of the same near-term occurrence and requires reconciliation.

## Decision

Adopt option 2.

### Data model

- Add `RecurringEvent`: `id`, `calendarId`, `title`, `weekday` (`0`–`6`, Sunday to Saturday), `localTime` (`HH:mm` in the creator's zone), `startDate` (`YYYY-MM-DD` of the first future occurrence), `timeZone` (IANA), `version`, `createdAt`, `updatedAt`, and `deletedAt` for cancellation.
- Add `RecurringOccurrence` only for exceptions: `id`, `seriesId`, `localDate` (`YYYY-MM-DD` in the series zone), optional `startsAt`, optional `title`, `deleted`, `version`. Enforce uniqueness on `(seriesId, localDate)`. A normal occurrence has no row.
- Keep `CalendarEvent` unchanged for one-off events. A generated occurrence is identified by the stable synthetic id `${seriesId}@${localDate}`.

### Occurrence expansion and time

- A shared domain helper resolves a local wall-clock time in an IANA zone; the assistant interpreter and the recurrence expander use the same helper.
- For an ambiguous local time, use the first valid instant. For a nonexistent local time, move forward minute by minute until a valid instant exists on the same local date; if none exists, skip that occurrence and record the limitation in the UI/QA evidence.
- Convert each series rule to UTC instants only for the requested calendar range, skipping local dates before `startDate`. Ranges remain half-open (`from` inclusive, `to` exclusive) and sorted by instant, then id.
- Target resolution for assistant edits/deletions groups generated occurrences of the same series into one candidate; distinct one-off events, exceptions, and different series still require disambiguation.
- `ListEvents` merges one-off rows, generated occurrences, and exception overrides. Each returned occurrence carries `id`, `title`, `startsAt`, `timeZone`, `version`, `source`, `seriesId?`, `occurrenceKey?`, and `isException?`.

### Mutations and concurrency

- `POST /api/events` accepts an optional `recurrence` object with `frequency: "weekly"` and `byWeekday: number[]` containing exactly one weekday (`0`–`6`). Multiple weekdays in one rule require separate series and are rejected in this increment with `UNSUPPORTED_RECURRENCE`, as are any other cadence or an end date.
- `AssistantDraft` gains the same optional `recurrence`. Confirmation still goes through the existing event endpoints, preserving ADR 0009: the assistant never writes directly.
- `PATCH` and `DELETE /api/events/:id` accept `scope: "occurrence" | "series"` and `version`.
  - `scope: "series"` targets the `RecurringEvent` row and its version.
  - `scope: "occurrence"` targets a synthetic id or an exception row; editing a generated occurrence creates an exception, while editing an existing exception updates it.
- The version checked for an occurrence edit is the series version when no exception exists, then the exception version afterwards. Conflicts keep returning `409 VERSION_CONFLICT`.
- Deleting a series sets `deletedAt` and cancels its reminders. Exceptions remain attached for audit and are ignored while the series is deleted. If a series weekday changes, exceptions stay bound to their original `localDate`.

### Reminders

- Extend `Reminder` with nullable `seriesId` and `occurrenceKey`, plus snapshot `eventTitle` and `eventStartsAt` for push payloads. Make `eventId` nullable for series reminders and add unique keys for `(eventId, offsetMinutes)` and `(seriesId, occurrenceKey, offsetMinutes)`.
- `ReminderService` reschedules a series whenever the rule, an exception, or the deletion state changes. It generates reminder rows only for occurrences within a rolling 48-hour horizon from now, skipping past reminder times.
- The in-process scheduler refreshes series horizons before claiming due reminders and uses the snapshot fields instead of joining `CalendarEvent`. This preserves the single-process, durable-row design from the architecture overview. No external queue or worker is introduced.

## Consequences

- The calendar can display an endless weekly series without storing endless rows or reminders.
- Reminders for distant weeks are created when they enter the 48-hour horizon; a scheduler outage longer than that window can miss them, which is consistent with the existing best-effort delivery limitation.
- DST adjustments are deterministic and testable, but a shifted hour differs from the literal local time typed at creation; QA must cover an ambiguous and a nonexistent case.
- Frontend, assistant, API, and reminder payload contracts all gain optional recurrence fields. The UI must show the rule in the review card and ask for the occurrence/series scope before every edit or deletion of a recurrent event.
- Versioning has two levels (series and exception). Clients must send the correct version for the chosen scope; QA must cover a stale series version and a stale exception version.
- Deferred: daily/monthly cadences, multiple weekdays in one rule, end dates, timezone changes on series edit, and occurrence-level permission rules.
