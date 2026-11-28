import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";
import { ReminderService } from "../../reminders/reminder.service";
import { readScope, readVersionParam } from "../domain/event-input";
import {
  findExceptionLookup,
  findSeriesLookup,
  type ExceptionLookup,
  type SeriesLookup,
} from "./recurrence-targets";

export interface DeleteEventInput {
  userId: string;
  id: string;
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
export class DeleteEvent {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reminders: ReminderService,
  ) {}

  async execute(input: DeleteEventInput): Promise<{ ok: true }> {
    const expectedVersion = readVersionParam(input.version);
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
      if (exception) return this.deleteException(exception, expectedVersion);

      const series = await findSeriesLookup(this.prisma, input.userId, input.id);
      if (series) return this.deleteGeneratedOccurrence(series, expectedVersion);
      throw notFound();
    }

    const series = await findSeriesLookup(this.prisma, input.userId, input.id);
    if (series) return this.deleteSeries(series, expectedVersion);

    return this.deleteOneOff(input, calendar.id, expectedVersion);
  }

  private async deleteOneOff(
    input: DeleteEventInput,
    calendarId: string,
    expectedVersion: number,
  ): Promise<{ ok: true }> {
    const existing = await this.prisma.calendarEvent.findFirst({
      where: { id: input.id, calendarId },
      select: { id: true },
    });
    if (!existing) throw notFound();

    const result = await this.prisma.calendarEvent.deleteMany({
      where: { id: existing.id, calendarId, version: expectedVersion },
    });
    if (result.count !== 1) throw versionConflict();

    await this.reminders.cancel(existing.id);
    return { ok: true };
  }

  private async deleteSeries(
    lookup: SeriesLookup,
    expectedVersion: number,
  ): Promise<{ ok: true }> {
    const result = await this.prisma.recurringEvent.updateMany({
      where: {
        id: lookup.series.id,
        calendarId: lookup.series.calendarId,
        version: expectedVersion,
        deletedAt: null,
      },
      data: {
        deletedAt: new Date(),
        version: { increment: 1 },
      },
    });
    if (result.count !== 1) throw versionConflict();

    await this.reminders.cancelSeries(lookup.series.id);
    return { ok: true };
  }

  private async deleteGeneratedOccurrence(
    lookup: SeriesLookup,
    expectedVersion: number,
  ): Promise<{ ok: true }> {
    if (!lookup.occurrenceKey) throw notFound();
    if (lookup.series.version !== expectedVersion) throw versionConflict();
    if (lookup.series.deletedAt) throw notFound();

    await this.prisma.recurringOccurrence.create({
      data: {
        seriesId: lookup.series.id,
        localDate: lookup.occurrenceKey,
        deleted: true,
        version: 1,
      },
    });

    await this.reminders.cancelSeriesOccurrence(lookup.series.id, lookup.occurrenceKey);
    await this.reminders.rescheduleSeries(lookup.series.id);
    return { ok: true };
  }

  private async deleteException(
    lookup: ExceptionLookup,
    expectedVersion: number,
  ): Promise<{ ok: true }> {
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
        deleted: true,
        version: { increment: 1 },
      },
    });
    if (result.count !== 1) throw versionConflict();

    await this.reminders.cancelSeriesOccurrence(lookup.series.id, lookup.exception.localDate);
    await this.reminders.rescheduleSeries(lookup.series.id);
    return { ok: true };
  }
}
