import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";
import {
  firstFutureOccurrence,
  localDateKey,
  partsInZone,
} from "../../recurrence/local-time";
import { ReminderService } from "../../reminders/reminder.service";
import {
  readInstant,
  readLocalTime,
  readRecurrence,
  readTimeZone,
  readTitle,
  validationError,
} from "../domain/event-input";
import { toRecurringEventDto, type CalendarEventDto } from "./event-dto";

export interface CreateEventInput {
  userId: string;
  title: unknown;
  startsAt: unknown;
  timeZone: unknown;
  recurrence?: unknown;
}

@Injectable()
export class CreateEvent {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reminders: ReminderService,
  ) {}

  async execute(input: CreateEventInput): Promise<CalendarEventDto> {
    const title = readTitle(input.title);
    const startsAt = readInstant(input.startsAt, "startsAt");
    const creationTimeZone = readTimeZone(input.timeZone);
    const recurrence = readRecurrence(input.recurrence);

    const calendar = await this.prisma.calendar.findUnique({
      where: { userId: input.userId },
      select: { id: true },
    });

    if (!calendar) {
      throw new NotFoundException({
        code: "CALENDAR_NOT_FOUND",
        message: "The signed-in account has no calendar.",
      });
    }

    if (!recurrence) {
      const event = await this.prisma.calendarEvent.create({
        data: {
          calendarId: calendar.id,
          title,
          startsAt,
          creationTimeZone,
        },
        select: {
          id: true,
          title: true,
          startsAt: true,
          creationTimeZone: true,
          version: true,
        },
      });

      await this.reminders.schedule(event.id);

      return {
        id: event.id,
        title: event.title,
        startsAt: event.startsAt.toISOString(),
        timeZone: event.creationTimeZone,
        version: event.version,
        source: "one-off",
      };
    }

    const local = partsInZone(startsAt, creationTimeZone);
    const localTime = readLocalTime(startsAt, creationTimeZone);
    const now = new Date();
    const created: Array<{ seriesId: string; weekday: number; startsAt: Date }> = [];

    for (const weekday of recurrence.byWeekday) {
      const first = firstFutureOccurrence(
        weekday,
        local.hour,
        local.minute,
        creationTimeZone,
        now,
      );
      if (!first) {
        throw validationError("startsAt", "The recurrence has no valid future occurrence.");
      }

      const series = await this.prisma.recurringEvent.create({
        data: {
          calendarId: calendar.id,
          title,
          weekday,
          localTime,
          timeZone: creationTimeZone,
        },
        select: { id: true },
      });
      created.push({ seriesId: series.id, weekday, startsAt: first });
    }

    for (const series of created) {
      await this.reminders.rescheduleSeries(series.seriesId);
    }

    created.sort(
      (left, right) =>
        left.startsAt.getTime() - right.startsAt.getTime() || left.seriesId.localeCompare(right.seriesId),
    );
    const first = created[0];
    const occurrenceKey = localDateKey(partsInZone(first.startsAt, creationTimeZone));

    return toRecurringEventDto(
      {
        id: `${first.seriesId}@${occurrenceKey}`,
        title,
        startsAt: first.startsAt,
        timeZone: creationTimeZone,
        version: 1,
        seriesId: first.seriesId,
        occurrenceKey,
        isException: false,
      },
      { frequency: "weekly", byWeekday: recurrence.byWeekday },
    );
  }
}
