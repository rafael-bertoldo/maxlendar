import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";
import {
  firstFutureOccurrence,
  localDateKey,
  partsInZone,
  weekdayOfLocalDate,
} from "../../recurrence/local-time";
import { ReminderService } from "../../reminders/reminder.service";
import {
  readInstant,
  readLocalTime,
  readScope,
  readTimeZone,
  readTitle,
  readVersion,
  validationError,
} from "../domain/event-input";
import { toRecurringEventDto, weeklyRecurrence, type CalendarEventDto } from "./event-dto";
import {
  findExceptionLookup,
  findSeriesLookup,
  type ExceptionLookup,
  type SeriesLookup,
} from "./recurrence-targets";

export interface UpdateEventInput {
  userId: string;
  id: string;
  title: unknown;
  startsAt: unknown;
  timeZone: unknown;
  version: unknown;
  scope?: unknown;
}

function notFound(): NotFoundException {
  return new NotFoundException({
    code: "EVENT_NOT_FOUND",
    message: "The event was not found.",
  });
}

function versionConflict(): ConflictException {
  return new ConflictException({
    code: "VERSION_CONFLICT",
    message: "This event was changed on another device. Reload and try again.",
  });
}

@Injectable()
export class UpdateEvent {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reminders: ReminderService,
  ) {}

  async execute(input: UpdateEventInput): Promise<CalendarEventDto> {
    const title = readTitle(input.title);
    const startsAt = readInstant(input.startsAt, "startsAt");
    const editorTimeZone = readTimeZone(input.timeZone);
    const expectedVersion = readVersion(input.version);
    const scope = readScope(input.scope);

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

    if (scope === "occurrence") {
      const exception = await findExceptionLookup(this.prisma, input.userId, input.id);
      if (exception) {
        return this.updateException(exception, title, startsAt, expectedVersion);
      }

      const series = await findSeriesLookup(this.prisma, input.userId, input.id);
      if (series) {
        return this.createException(series, title, startsAt, expectedVersion);
      }
      throw notFound();
    }

    const series = await findSeriesLookup(this.prisma, input.userId, input.id);
    if (series) {
      return this.updateSeries(series, title, startsAt, editorTimeZone, expectedVersion);
    }

    return this.updateOneOff(input, calendar.id, title, startsAt, editorTimeZone, expectedVersion);
  }

  private async updateOneOff(
    input: UpdateEventInput,
    calendarId: string,
    title: string,
    startsAt: Date,
    editorTimeZone: string,
    expectedVersion: number,
  ): Promise<CalendarEventDto> {
    const existing = await this.prisma.calendarEvent.findFirst({
      where: { id: input.id, calendarId },
      select: { id: true },
    });
    if (!existing) throw notFound();

    const result = await this.prisma.calendarEvent.updateMany({
      where: { id: existing.id, calendarId, version: expectedVersion },
      data: {
        title,
        startsAt,
        creationTimeZone: editorTimeZone,
        version: { increment: 1 },
      },
    });
    if (result.count !== 1) throw versionConflict();

    const event = await this.prisma.calendarEvent.findUnique({
      where: { id: existing.id },
      select: {
        id: true,
        title: true,
        startsAt: true,
        creationTimeZone: true,
        version: true,
      },
    });
    if (!event) throw notFound();

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

  private async updateSeries(
    lookup: SeriesLookup,
    title: string,
    startsAt: Date,
    editorTimeZone: string,
    expectedVersion: number,
  ): Promise<CalendarEventDto> {
    const local = partsInZone(startsAt, editorTimeZone);
    const localTime = readLocalTime(startsAt, editorTimeZone);
    const result = await this.prisma.recurringEvent.updateMany({
      where: {
        id: lookup.series.id,
        calendarId: lookup.series.calendarId,
        version: expectedVersion,
        deletedAt: null,
      },
      data: {
        title,
        weekday: weekdayOfLocalDate(local),
        localTime,
        timeZone: editorTimeZone,
        version: { increment: 1 },
      },
    });
    if (result.count !== 1) throw versionConflict();

    const series = await this.prisma.recurringEvent.findUnique({
      where: { id: lookup.series.id },
      select: {
        id: true,
        title: true,
        weekday: true,
        localTime: true,
        timeZone: true,
        version: true,
      },
    });
    if (!series) throw notFound();

    await this.reminders.rescheduleSeries(series.id);

    const first = firstFutureOccurrence(
      series.weekday,
      local.hour,
      local.minute,
      series.timeZone,
      new Date(),
    );
    if (!first) throw validationError("startsAt", "The recurrence has no valid future occurrence.");

    const occurrenceKey = localDateKey(partsInZone(first, series.timeZone));
    return toRecurringEventDto(
      {
        id: `${series.id}@${occurrenceKey}`,
        title: series.title,
        startsAt: first,
        timeZone: series.timeZone,
        version: series.version,
        seriesId: series.id,
        occurrenceKey,
        isException: false,
      },
      weeklyRecurrence(series.weekday),
    );
  }

  private async createException(
    lookup: SeriesLookup,
    title: string,
    startsAt: Date,
    expectedVersion: number,
  ): Promise<CalendarEventDto> {
    if (!lookup.occurrenceKey) throw notFound();
    if (lookup.series.version !== expectedVersion) throw versionConflict();
    if (lookup.series.deletedAt) throw notFound();

    const exception = await this.prisma.recurringOccurrence.create({
      data: {
        seriesId: lookup.series.id,
        localDate: lookup.occurrenceKey,
        startsAt,
        title,
        version: 1,
      },
      select: { version: true },
    });

    await this.reminders.rescheduleSeries(lookup.series.id);

    return {
      id: `${lookup.series.id}@${lookup.occurrenceKey}`,
      title,
      startsAt: startsAt.toISOString(),
      timeZone: lookup.series.timeZone,
      version: exception.version,
      source: "recurring",
      seriesId: lookup.series.id,
      occurrenceKey: lookup.occurrenceKey,
      isException: true,
      recurrence: weeklyRecurrence(lookup.series.weekday),
    };
  }

  private async updateException(
    lookup: ExceptionLookup,
    title: string,
    startsAt: Date,
    expectedVersion: number,
  ): Promise<CalendarEventDto> {
    if (lookup.exception.version !== expectedVersion) throw versionConflict();
    if (lookup.series.deletedAt || lookup.exception.deleted) throw notFound();

    const result = await this.prisma.recurringOccurrence.updateMany({
      where: {
        id: lookup.exception.id,
        version: expectedVersion,
        deleted: false,
        series: { calendarId: lookup.series.calendarId },
      },
      data: {
        title,
        startsAt,
        deleted: false,
        version: { increment: 1 },
      },
    });
    if (result.count !== 1) throw versionConflict();

    await this.reminders.rescheduleSeries(lookup.series.id);

    return {
      id: `${lookup.series.id}@${lookup.exception.localDate}`,
      title,
      startsAt: startsAt.toISOString(),
      timeZone: lookup.series.timeZone,
      version: lookup.exception.version + 1,
      source: "recurring",
      seriesId: lookup.series.id,
      occurrenceKey: lookup.exception.localDate,
      isException: true,
      recurrence: weeklyRecurrence(lookup.series.weekday),
    };
  }
}
