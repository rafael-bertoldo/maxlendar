PRAGMA foreign_keys=OFF;

-- CreateTable
CREATE TABLE "RecurringEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "calendarId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "weekday" INTEGER NOT NULL,
    "localTime" TEXT NOT NULL,
    "timeZone" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME,
    CONSTRAINT "RecurringEvent_calendarId_fkey" FOREIGN KEY ("calendarId") REFERENCES "Calendar" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RecurringOccurrence" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "seriesId" TEXT NOT NULL,
    "localDate" TEXT NOT NULL,
    "startsAt" DATETIME,
    "title" TEXT,
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "RecurringOccurrence_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "RecurringEvent" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Reminder_new" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventId" TEXT,
    "seriesId" TEXT,
    "occurrenceKey" TEXT,
    "eventTitle" TEXT NOT NULL,
    "eventStartsAt" DATETIME NOT NULL,
    "userId" TEXT NOT NULL,
    "offsetMinutes" INTEGER NOT NULL,
    "scheduledFor" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "sentAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Reminder_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "CalendarEvent" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Reminder_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "RecurringEvent" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Reminder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Copy existing one-off reminders with event snapshots, keeping one row per unique key.
INSERT INTO "Reminder_new" (
    "id", "eventId", "seriesId", "occurrenceKey", "eventTitle", "eventStartsAt",
    "userId", "offsetMinutes", "scheduledFor", "status", "sentAt", "createdAt", "updatedAt"
)
SELECT
    ranked."id", ranked."eventId", NULL, NULL, ranked."title", ranked."startsAt",
    ranked."userId", ranked."offsetMinutes", ranked."scheduledFor", ranked."status",
    ranked."sentAt", ranked."createdAt", ranked."updatedAt"
FROM (
    SELECT
        reminder.*,
        event."title" AS "title",
        event."startsAt" AS "startsAt",
        ROW_NUMBER() OVER (
            PARTITION BY reminder."eventId", reminder."offsetMinutes"
            ORDER BY reminder."createdAt" DESC, reminder."id" DESC
        ) AS "rank"
    FROM "Reminder" reminder
    INNER JOIN "CalendarEvent" event ON event."id" = reminder."eventId"
) ranked
WHERE ranked."rank" = 1;

DROP TABLE "Reminder";

ALTER TABLE "Reminder_new" RENAME TO "Reminder";

-- CreateIndex
CREATE INDEX "RecurringEvent_calendarId_deletedAt_idx" ON "RecurringEvent"("calendarId", "deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "RecurringOccurrence_seriesId_localDate_key" ON "RecurringOccurrence"("seriesId", "localDate");

-- CreateIndex
CREATE INDEX "RecurringOccurrence_seriesId_deleted_idx" ON "RecurringOccurrence"("seriesId", "deleted");

-- CreateIndex
CREATE UNIQUE INDEX "Reminder_eventId_offsetMinutes_key" ON "Reminder"("eventId", "offsetMinutes");

-- CreateIndex
CREATE UNIQUE INDEX "Reminder_seriesId_occurrenceKey_offsetMinutes_key" ON "Reminder"("seriesId", "occurrenceKey", "offsetMinutes");

-- CreateIndex
CREATE INDEX "Reminder_scheduledFor_status_idx" ON "Reminder"("scheduledFor", "status");

-- CreateIndex
CREATE INDEX "Reminder_eventId_status_idx" ON "Reminder"("eventId", "status");

-- CreateIndex
CREATE INDEX "Reminder_seriesId_status_idx" ON "Reminder"("seriesId", "status");

-- CreateIndex
CREATE INDEX "Reminder_seriesId_occurrenceKey_scheduledFor_idx" ON "Reminder"("seriesId", "occurrenceKey", "scheduledFor");

PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
