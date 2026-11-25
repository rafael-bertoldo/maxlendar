# maxlendar Product Brief

**Status:** Discovery draft  
**Audience:** Product, design, engineering, and QA  
**Product:** AI-first, cross-device personal calendar

## Product summary

maxlendar is a simple calendar for creating and managing one-off events across web and mobile devices without repeated sign-in on the same device. A person creates or opens a calendar with a unique username and a simple password. Events can be managed manually or with an AI assistant that understands natural language, answers questions about the calendar, and prepares changes for the user's review.

## Problem and intended outcome

The user wants to access the same calendar on different devices without repeated logins. They also want event reminders to arrive before an event, including when the app is closed, and a quick way to add or query events using natural language.

## Target user and project context

- A person who wants a lightweight personal calendar available on multiple devices.
- The initial product is intended as a portfolio project, not a commercial service.
- The product is not intended for sensitive personal data.

## MVP decisions

### Technology and architecture direction

- Backend: Node.js with NestJS.
- Language: TypeScript on both backend and frontend.
- ORM: Prisma.
- Database: SQLite; the user does not expect the MVP to scale.
- Frontend: React with TypeScript; Next.js is not required.
- The user wants a solid architecture informed by Clean Architecture and SOLID principles.
- The frontend should use an atomic or component-based organization.
- Use CQRS only if it solves a concrete need for this product; it is not a requirement by itself.
- Hosting, AI provider, and detailed component boundaries remain for architecture evaluation.

### Access and synchronization

- The user signs up or signs in with a unique username and password; email is not required.
- A username that does not exist can be used to create a new calendar.
- If the username already exists, explain that it is in use and offer to sign in to that account or choose another username.
- Passwords have no character-complexity or special-character requirements. Password recovery is not offered in the MVP because no email address is collected.
- After a successful sign-in, keep the session on that device until the user signs out; the user prefers no automatic session expiry.
- Each device manages its own session. Signing out on one device does not sign out other devices.
- `localStorage` is a proposed implementation detail, not an architectural decision. The Architect should review session persistence and storage before implementation.
- The technical design must define appropriate password protection; the simple password rule is a usability decision, not permission to expose stored passwords.
- Creating, editing, or deleting an event on one device synchronizes to the same calendar on other devices.

### Platforms and calendar views

- Deliver a responsive website that works on desktop and mobile and can be installed from the web as a Progressive Web App (PWA).
- The default calendar view is day. Users can switch to week and month views.
- App-store distribution is not required for the MVP.

### Events

- An event is a single point in time, with a required title, date, and time.
- Events do not repeat in the MVP.
- Description, location, duration, and end time are out of scope for the initial event model.
- Users can create events manually and edit or delete saved events.

### Reminders

- Every event has two standard reminders: 10 minutes and 1 minute before its scheduled time.
- Reminders should arrive when the app is closed, using browser or device push notifications after the user grants permission.
- Reminders are the same for all events; per-event reminder customization is out of scope.

### Time zone

- Interpret the event's date and time in the local time zone of the device used to create it.
- The display behavior when the same calendar is opened from a device in a different time zone remains to be decided.

### AI-first experience

- Users can enter event details manually or describe an event in natural language, such as “Dentist tomorrow at 3 PM.”
- The AI extracts the event title, date, and time and presents them for review. It must not save a proposed event without user confirmation.
- Users can ask questions about their calendar, such as “What do I have tomorrow?” Answers should be grounded in the calendar's events.
- Users can ask the AI to prepare event changes or deletions. The proposed change must be shown for review and confirmation before it is applied.
- AI is intended to reduce friction in creating, understanding, and managing events. Manual calendar controls remain available.

## Initial acceptance outcomes

1. Signing up with an unused username creates a calendar; an existing username offers sign-in with its password or the option to choose another name.
2. A user can create an event manually with a title, date, and time, then edit or delete it.
3. A user can create an event from natural language, review the extracted fields, and confirm before it is saved.
4. A user can ask about events in their calendar and receive an answer based on those events.
5. A user can ask the AI to change or delete an event, review the proposed action, and confirm before it takes effect.
6. The same calendar changes appear across the user's devices.
7. Day view is the default, with week and month views available.
8. Each event has reminders scheduled 10 minutes and 1 minute before its time, subject to notification permission and platform availability.

## Accepted trade-offs and risks

- The product is not intended for sensitive event data. A simple password with no complexity rules improves ease of use but requires a considered implementation for secure storage and authentication.
- A session that does not expire automatically can remain usable by anyone with access to a signed-in device. Provide a clear sign-out action.
- Push notification delivery depends on device/browser support and permission. The exact behavior when permission is denied, unavailable, or later revoked remains to be specified.
- AI output may be incomplete or wrong. User review and confirmation are required before any AI-proposed create, edit, or delete operation is saved.
- The timezone behavior across devices in different time zones remains open.

## Open questions for design and implementation planning

- How should events display when a calendar is opened from a device in a different time zone?
- What should the experience do when push permission is denied or the PWA/browser cannot deliver notifications?
- What username format, length, normalization, and reserved names should be allowed?
- Which session storage approach meets the persistent-login requirement while limiting exposure? The user suggested `localStorage`; this requires architecture review.
- What confirmation and disambiguation behavior should the AI use for ambiguous dates, event references, or requests that match multiple events?
- What representative examples and quality criteria will be used to evaluate AI-created events and calendar answers?
- What behavior is expected when the same event is edited from multiple devices at nearly the same time?

## Out of scope for the MVP

- Email collection and password recovery.
- Recurring events.
- Event descriptions, locations, durations, and end times.
- Per-event reminder settings.
- Native app-store releases.
