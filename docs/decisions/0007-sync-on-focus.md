# ADR 0007: Cross-device synchronization on focus

- **Status:** Accepted
- **Date:** 2026-11-26

## Context

US-10 requires changes made on one device to appear on other devices signed in to the same account. The user chose refresh on focus instead of background polling or push. Sessions are already per-device from US-03, and edits/deletes already use optimistic versioning from ADR 0005 and ADR 0006.

## Decision

- Each calendar view refetches its current range when the window gains focus or the document becomes visible. Repeated focus/visibility events within one second are coalesced into one refresh.
- There is no polling, websocket, or server push in the MVP. A background tab may therefore show stale data until the user returns to it; the interface states this limit.
- Devices keep independent sign-in sessions for the same account. Signing out on one device revokes only that device's session.
- If a device writes using data older than the server version, the API returns `409 VERSION_CONFLICT` and the UI offers a reload. The same conflict contract covers both edits and deletes.

## Consequences

- Cross-device updates are visible without manual reload after returning to the tab, with no streaming infrastructure or polling cost.
- The product is honest that updates are not immediate in background tabs.
- Concurrent edits are not silently lost: the version check surfaces the conflict when the stale device saves.
- QA evidence must cover two sessions for one account, a change from session A observed after focusing session B, independent logout, and the stated limitation.
