import { Injectable } from "@nestjs/common";
import { PrismaService } from "../database/prisma.service";
import { expandSeriesOccurrences } from "../recurrence/local-time";

export const REMINDER_OFFSETS_MINUTES = [10, 1];
export const SERIES_REMINDER_HORIZON_MS = 48 * 60 * 60 * 1000;

interface PendingReminder {
  userId: string;
  offsetMinutes: number;
  scheduledFor: Date;
  eventTitle: string;
  eventStartsAt: Date;
  eventId?: string;
  seriesId?: string;
  occurrenceKey?: string;
}

@Injectable()
export class ReminderService {
  constructor(private readonly prisma: PrismaService) {}

  private async upsertPending(reminder: PendingReminder): Promise<string> {
    const existing = await this.prisma.reminder.findFirst({
      where: reminder.eventId
        ? { eventId: reminder.eventId, offsetMinutes: reminder.offsetMinutes }
        : {
            seriesId: reminder.seriesId,
            occurrenceKey: reminder.occurrenceKey,
            offsetMinutes: reminder.offsetMinutes,
          },
      select: { id: true, status: true },
    });

    const data = {
      eventId: reminder.eventId,
      seriesId: reminder.seriesId,
      occurrenceKey: reminder.occurrenceKey,
      eventTitle: reminder.eventTitle,
      eventStartsAt: reminder.eventStartsAt,
      userId: reminder.userId,
      offsetMinutes: reminder.offsetMinutes,
      scheduledFor: reminder.scheduledFor,
    };

    if (!existing) {
      const created = await this.prisma.reminder.create({ data });
      return created.id;
    }
    if (existing.status !== "pending") return existing.id;

    await this.prisma.reminder.update({
      where: { id: existing.id },
      data: { ...data, status: "pending", sentAt: null },
    });
    return existing.id;
  }

  async schedule(eventId: string): Promise<void> {
    const event = await this.prisma.calendarEvent.findUnique({
      where: { id: eventId },
      select: {
        id: true,
        title: true,
        startsAt: true,
        calendar: { select: { userId: true } },
      },
    });

    if (!event) return;

    await this.prisma.reminder.deleteMany({ where: { eventId, status: "pending" } });

    const now = Date.now();
    for (const offsetMinutes of REMINDER_OFFSETS_MINUTES) {
      const scheduledFor = new Date(event.startsAt.getTime() - offsetMinutes * 60_000);
      if (scheduledFor.getTime() <= now) continue;

      await this.upsertPending({
        eventId,
        eventTitle: event.title,
        eventStartsAt: event.startsAt,
        userId: event.calendar.userId,
        offsetMinutes,
        scheduledFor,
      });
    }
  }

  async scheduleAllForUser(userId: string): Promise<void> {
    const events = await this.prisma.calendarEvent.findMany({
      where: { calendar: { userId }, startsAt: { gt: new Date() } },
      select: { id: true },
    });

    for (const event of events) {
      await this.schedule(event.id);
    }
  }

  async cancel(eventId: string): Promise<void> {
    await this.prisma.reminder.deleteMany({ where: { eventId, status: "pending" } });
  }

  async cancelSeries(seriesId: string): Promise<void> {
    await this.prisma.reminder.deleteMany({ where: { seriesId, status: "pending" } });
  }

  async cancelSeriesOccurrence(seriesId: string, occurrenceKey: string): Promise<void> {
    await this.prisma.reminder.deleteMany({
      where: { seriesId, occurrenceKey, status: "pending" },
    });
  }

  async rescheduleSeries(seriesId: string): Promise<void> {
    const series = await this.prisma.recurringEvent.findUnique({
      where: { id: seriesId },
      select: {
        id: true,
        title: true,
        weekday: true,
        localTime: true,
        timeZone: true,
        version: true,
        deletedAt: true,
        calendar: { select: { userId: true } },
        occurrences: {
          select: {
            localDate: true,
            startsAt: true,
            title: true,
            deleted: true,
            version: true,
          },
        },
      },
    });

    if (!series || series.deletedAt) {
      await this.cancelSeries(seriesId);
      return;
    }

    const from = new Date();
    const to = new Date(from.getTime() + SERIES_REMINDER_HORIZON_MS);
    const occurrences = expandSeriesOccurrences(series, series.occurrences, from, to);
    const desiredIds: string[] = [];

    for (const occurrence of occurrences) {
      for (const offsetMinutes of REMINDER_OFFSETS_MINUTES) {
        const scheduledFor = new Date(occurrence.startsAt.getTime() - offsetMinutes * 60_000);
        if (scheduledFor.getTime() <= from.getTime()) continue;

        const reminderId = await this.upsertPending({
          seriesId,
          occurrenceKey: occurrence.occurrenceKey,
          eventTitle: occurrence.title,
          eventStartsAt: occurrence.startsAt,
          userId: series.calendar.userId,
          offsetMinutes,
          scheduledFor,
        });
        desiredIds.push(reminderId);
      }
    }

    await this.prisma.reminder.deleteMany({
      where: { seriesId, status: "pending", id: { notIn: desiredIds } },
    });
  }
}
