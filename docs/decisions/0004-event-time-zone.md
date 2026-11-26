# ADR 0004: Store events as instants and display them in the viewer's time zone

- **Status:** Accepted
- **Date:** 2026-11-26
- **Decision owner:** User

## Context

The product brief says an event's date and time are interpreted in the local time zone of the device that creates it, but left the display rule for a calendar opened in another time zone unresolved. US-05, US-06 and US-07 need a defined rule to place events in day, week and month ranges and to show their scheduled time. The MVP has no recurring events and reminders are planned as future work.

Three options were considered:

1. Store a fixed instant and render it in the viewer's local time zone.
2. Preserve the creator's wall-clock time on every device, independent of the viewer's zone.
3. Defer the rule and keep the stories blocked.

## Decision

Adopt option 1. The client converts the entered local date and time to an ISO 8601 instant and sends it with the creating device's IANA time zone. The API stores the instant in UTC and keeps the creation time zone as provenance. Calendar ranges are calculated and queried by instant. Every client renders the stored instant in its own local time zone.

The week starts on Monday in the week view, following ISO 8601 and the common Brazilian convention.

## Consequences

- A trip to another time zone changes the displayed hour while the event keeps its real instant, which is compatible with future reminder scheduling.
- Ambiguous or nonexistent local times during daylight-saving transitions are resolved by the browser's `Date` conversion at input time; the API accepts only unambiguous ISO instants with an explicit offset.
- Users can observe different local hours for the same event on different devices. The event card shows the viewer-local date/time and, when the creator's IANA zone differs, the original wall-clock time as provenance.
- Time-zone provenance is stored but is not used to force a fixed display hour.
- Range queries must use half-open intervals (`from` inclusive, `to` exclusive) so adjacent day/week/month ranges do not duplicate events.
