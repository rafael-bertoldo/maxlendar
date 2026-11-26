# Product Backlog

**Status:** MVP draft; US-01 to US-10 implemented, with QA evidence recorded under [`docs/qa/`](qa/).  
**Source:** [Product brief](product-brief.md), [architecture overview](architecture/overview.md), and ADRs 0001–0007.  

The stories below describe observable user outcomes. Items marked **Open decision** have acceptance details that must be settled before implementation or final QA sign-off; they are not implicit product decisions.

## MVP user stories

### US-01 — Create an account with a unique username and password

**Description:** As a new user, I want to create an account with a username and password, so that I can have my own calendar without providing an email address.

**Acceptance criteria:**

- Given a username that is not registered, when I submit it with a password, then an account and its calendar are created and I am signed in.
- Given a username that is already registered, when I try to create an account with it, then the product explains that it is in use and offers me the choice to sign in or try another username.
- Given a password that meets the implementation's basic input requirements, when I submit it, then the product does not reject it for lacking a particular character type or symbol.
- When account creation succeeds, then no email address is required or collected as part of this flow.
- **Open decision:** Username format, length, normalization, reserved names, and minimum password input requirements are not defined.

### US-02 — Sign in to an existing account

**Description:** As a returning user, I want to sign in with my username and password, so that I can access my calendar on another device.

**Acceptance criteria:**

- Given a registered username, when I choose to sign in and submit the matching password, then I am signed in to that account's calendar.
- Given an unknown username or a password that does not match, when I submit the sign-in form, then access is not granted and I see an actionable error.
- Given a username is already registered during account creation, when I choose the sign-in option, then the sign-in flow uses that username.
- **Open decision:** Error wording and behavior for repeated failed attempts are not defined; authentication rate limiting is an architecture/security requirement, not a username policy decision.

### US-03 — Keep each device signed in until local sign-out

**Description:** As a signed-in user, I want my session to persist independently on each device until I sign out there, so that I do not have to repeat login on that device.

**Acceptance criteria:**

- Given I have signed in on a device, when I close and reopen the PWA on that device, then I remain signed in.
- Given I sign out on one device, when I later open the PWA on that device, then I must sign in again.
- Given I sign out on one device, then sessions on my other devices remain signed in.
- Given I have signed in, then the product provides a clear sign-out action.
- **Open decision:** The authentication mechanism and client-side persistence mechanism are architecture decisions. The user's `localStorage` suggestion is not selected; the architecture proposal recommends a persistent, secure, HttpOnly cookie and server-side per-device session.
- **Open decision:** The product requirement is no automatic expiry. Architecture review must reconcile that requirement with session protection before implementation; the story does not select an expiry policy.

### US-04 — Use the calendar as an installable responsive web app

**Description:** As a user, I want to use and install the calendar from the web on desktop or mobile, so that I can access it across devices without separate app-store releases.

**Acceptance criteria:**

- Given I open the product on a supported desktop or mobile browser, when I use its core calendar screens, then the layout adapts to the available screen size.
- Given I use a browser that supports PWA installation, when I choose its install action, then the calendar can be installed from the web and opened as an app.
- **Open decision:** Hosting, browser support matrix, and exact PWA installation capabilities are not selected.

### US-05 — View calendar events by day, week, and month

**Delivery:** Implemented in `850130a`, adjusted in `020bd2d`; QA report: [US-05](qa/US-05.md).

**Description:** As a user, I want to see my calendar by day, week, or month, so that I can review events at different levels of detail.

**Acceptance criteria:**

- When I open the calendar, then the day view is selected by default.
- When I choose week or month, then the calendar displays the corresponding range.
- When I navigate between ranges, then the displayed events correspond to the selected range.
- **Decided 2026-11-26:** Events are stored as fixed instants and displayed in the viewer's local time zone ([ADR 0004](decisions/0004-event-time-zone.md)).
- **Decided 2026-11-26:** The week starts on Monday.

### US-06 — Create a one-off event manually

**Delivery:** Implemented in `bfedb1c`, adjusted in `1ae5d12`; QA report: [US-06](qa/US-06.md).

**Description:** As a user, I want to create an event with a title, date, and time, so that I can record a single scheduled occurrence in my calendar.

**Acceptance criteria:**

- Given I am signed in, when I submit a title, date, and time, then one event is created in my calendar.
- Given a required field is missing or invalid, when I submit the form, then the event is not created and I am shown which input needs attention.
- When I view the saved event, then it represents one point in time and has no recurrence, description, location, duration, or end time in the MVP.
- **Decided 2026-11-26:** The device converts the entered date/time in its local zone to an ISO instant; the calendar displays that instant in the viewer's zone ([ADR 0004](decisions/0004-event-time-zone.md)).

### US-07 — View events in my calendar

**Description:** As a user, I want to see the events in my calendar, so that I can understand what I have scheduled.

**Acceptance criteria:**

- Given my calendar has events in the selected day, week, or month range, when I view that range, then its events are displayed.
- Given there are no events in the selected range, when I view it, then the calendar displays an empty state.
- When events are displayed, then each event's title and scheduled date/time are visible.
- **MVP rule 2026-11-26:** Events are sorted by scheduled instant ascending; display uses the viewer's local time zone ([ADR 0004](decisions/0004-event-time-zone.md)).
- **Display rule 2026-11-26:** Each event shows its title and viewer-local date/time; when the creator's time zone differs, the original wall-clock time is also shown. An empty range shows an explicit empty state with a creation action.

**Delivery:** Implemented in `ba52a68`, adjusted in `7f3055a`; QA report: [US-07](qa/US-07.md).

### US-08 — Edit a saved event

**Description:** As a user, I want to edit an event's title, date, or time, so that my calendar reflects updated plans.

**Acceptance criteria:**

- Given an event in my calendar, when I save valid replacement title, date, and/or time values, then the event displays the saved values.
- Given my edit is invalid, when I try to save it, then the existing event remains unchanged and the product identifies the invalid input.
- When an event is changed, then its reminder schedule is updated to correspond to the saved event time, subject to the reminder rules.
- **Decided 2026-11-26:** Concurrent edits use optimistic versioning with `409 VERSION_CONFLICT`; the form prefills in the viewer's local zone and saves with the editor's IANA zone ([ADR 0005](decisions/0005-event-editing.md)).
- **Deferred 2026-11-26:** Reminder rescheduling depends on US-11; US-08 acceptance covers the event record only and QA must mark this criterion as not executable yet.

**Delivery:** Implemented in `7801fbb`, adjusted in `c758e56`; QA report: [US-08](qa/US-08.md). Reminder criterion remains deferred to US-11.

### US-09 — Delete a saved event

**Description:** As a user, I want to delete an event, so that a canceled plan no longer appears in my calendar.

**Acceptance criteria:**

- Given an event in my calendar, when I confirm its deletion, then it no longer appears in calendar views.
- When an event is deleted, then its pending reminders are canceled.
- **Decided 2026-11-26:** Manual deletion requires explicit confirmation showing the target event; deletion uses optimistic versioning with `409 VERSION_CONFLICT` ([ADR 0006](decisions/0006-event-deletion.md)).
- **Deferred 2026-11-26:** Reminder cancellation depends on US-11; US-09 acceptance covers the event record only and QA must mark this criterion as not executable yet.

**Delivery:** Implemented in `5969035`, adjusted in `59ab350`; QA report: [US-09](qa/US-09.md). Reminder criterion remains deferred to US-11.

### US-10 — Synchronize calendar changes across devices

**Description:** As a user, I want event changes made on one device to appear on my other devices, so that I work with the same calendar everywhere.

**Acceptance criteria:**

- Given I create, edit, or delete an event on one device, when another device accesses the same account, then it reflects the saved change.
- Given I am signed in on multiple devices, then each device continues to use the same account calendar while maintaining its own sign-in session.
- **Decided 2026-11-26:** Connected devices refresh the current range on window focus/visibility instead of polling; stale writes return `409 VERSION_CONFLICT` ([ADR 0007](decisions/0007-sync-on-focus.md)).
- **Accepted limitation:** Background tabs may remain stale until focused; the interface states this explicitly.

**Delivery:** Implemented in `0764bf0`, adjusted in `4acb87c`; QA report: [US-10](qa/US-10.md).

### US-11 — Receive the standard push reminders

**Description:** As a user, I want push reminders 10 minutes and 1 minute before each event, so that I am notified even when the app is closed.

**Acceptance criteria:**

- Given push permission is granted and the platform supports delivery, when an event is scheduled in the future, then reminders are scheduled for 10 minutes and 1 minute before its time.
- Given an event is edited or deleted, then its pending reminders are updated or canceled to match the event's current state.
- Given an event is saved after one or both reminder times have passed, then no reminder is sent for a time that has already passed.
- Given a reminder is due, then the product attempts delivery through the registered browser/device push subscription while the app is closed.
- **Open decision:** User-facing behavior for denied, unavailable, or revoked notification permission is unresolved.
- **Open decision:** Push delivery depends on browser/platform support and is best-effort; exact supported platforms and delivery evidence are not defined.

### US-12 — Create an event from natural language with confirmation

**Description:** As a user, I want the assistant to turn a natural-language description into a draft event, so that I can add an event quickly while checking the extracted details before saving.

**Acceptance criteria:**

- Given I describe an event in natural language, when the assistant can interpret it, then it presents a draft containing title, date, and time.
- Given the draft is displayed, when I confirm it, then the event is saved to my calendar.
- Given the draft is displayed, when I reject it, then no event is saved.
- Given required details cannot be determined, then the assistant does not save an event without presenting a complete draft for confirmation.
- **Open decision:** Handling of ambiguous dates/times, missing details, daylight-saving cases, and evaluation examples/quality thresholds is unresolved.

### US-13 — Ask questions about my calendar

**Description:** As a user, I want to ask the assistant questions about my events, so that I can understand my schedule using natural language.

**Acceptance criteria:**

- Given events exist in the relevant calendar range, when I ask a question such as “What do I have tomorrow?”, then the response is based on events belonging to my calendar and relevant to the question.
- Given there are no matching events, then the assistant indicates that no matching events were found.
- Given the requested range or intent is ambiguous, then the assistant asks for clarification or otherwise avoids presenting an unsupported answer.
- **Open decision:** Representative question examples, answer quality criteria, date-range interpretation, and the assistant's clarification behavior are unresolved.

### US-14 — Review and confirm an AI-proposed event change

**Description:** As a user, I want the assistant to prepare an edit to an event and show me the proposed changes, so that I can correct my calendar with natural language while retaining control.

**Acceptance criteria:**

- Given I ask the assistant to change an event, when it can identify the target and proposed values, then it shows the target event and a reviewable proposal.
- Given the proposal is shown, when I confirm it, then the change is applied to the identified event.
- Given the proposal is shown, when I reject it, then the event remains unchanged.
- Given the target or requested change is ambiguous, then the assistant does not apply a change and requests clarification or presents a sufficiently clear proposal for review.
- **Open decision:** Event disambiguation and concurrent-edit/version-conflict behavior are unresolved.

### US-15 — Review and confirm an AI-proposed event deletion

**Description:** As a user, I want the assistant to prepare deletion of an event and show me which event it will remove, so that I can use natural language to manage my calendar without accidental deletion.

**Acceptance criteria:**

- Given I ask the assistant to delete an event, when it identifies a target, then it presents the target event for review before deletion.
- Given the proposed deletion is shown, when I confirm it, then the event is deleted and its pending reminders are canceled.
- Given the proposed deletion is shown, when I reject it, then the event remains unchanged.
- Given more than one event could match the request, then the assistant does not delete any event until the target is unambiguous and confirmed.
- **Open decision:** Event disambiguation and concurrent-edit/version-conflict behavior are unresolved.

## Out of scope for the MVP

- Email collection and password recovery.
- Recurring events.
- Event description, location, duration, and end time.
- Per-event reminder customization.
- Native app-store releases.
- AI operations that change or delete data without the user's review and confirmation.

## Open product and delivery questions

1. What username formats, lengths, normalization rules, reserved names, and minimum password input requirements should be supported?
2. ~~How should events be displayed when the user views the calendar in a different time zone, and how should daylight-saving ambiguous/nonexistent local times be handled?~~ Resolved for the MVP in [ADR 0004](decisions/0004-event-time-zone.md): fixed instant displayed in the viewer's zone, with browser-side conversion of local input.
3. What should happen when push permission is denied, unavailable, or revoked, and which browser/platform combinations are supported?
4. How quickly must changes appear on other devices, and how should concurrent edits be surfaced or resolved?
5. What should the assistant do for ambiguous event dates, incomplete requests, and multiple matching event targets? Which examples and quality criteria define acceptable AI results?
6. What authentication session mechanism satisfies persistent per-device sessions without automatic expiry, and how should architecture address loss of a device?
7. Which hosting and AI/Web Push providers meet the operational, privacy, cost, and availability needs of the MVP?
