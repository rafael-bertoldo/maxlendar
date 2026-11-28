import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";
import { expandSeriesOccurrences } from "../../recurrence/local-time";
import { readRange } from "../domain/event-input";
import { toRecurringEventDto, weeklyRecurrence, type CalendarEventDto } from "./event-dto";

export interface ListEventsInput {
  userId: string;
  from: unknown;
  to: unknown;
}

@Injectable()
export class ListEvents {
  constructor(private readonly prisma: PrismaService) {}

  async execute(input: ListEventsInput): Promise<{ events: CalendarEventDto[] }> {
    const { from, to } = readRange(input.from, input.to);

    const [oneOffEvents, calendar] = await Promise.all([
      this.prisma.calendarEvent.findMany({
        where: {
          calendar: { userId: input.userId },
          startsAt: { gte: from, lt: to },
        },
        orderBy: [{ startsAt: "asc" }, { id: "asc" }],
        select: {
          id: true,
          title: true,
          startsAt: true,
          creationTimeZone: true,
          version: true,
        },
      }),
      this.prisma.calendar.findUnique({
        where: { userId: input.userId },
        select: {
          recurringEvents: {
            where: { deletedAt: null },
            select: {
              id: true,
              title: true,
              weekday: true,
              localTime: true,
              timeZone: true,
              version: true,
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
          },
        },
      }),
    ]);

    const events: CalendarEventDto[] = oneOffEvents.map((event) => ({
      id: event.id,
      title: event.title,
      startsAt: event.startsAt.toISOString(),
      timeZone: event.creationTimeZone,
      version: event.version,
      source: "one-off",
    }));

    for (const series of calendar?.recurringEvents ?? []) {
      const occurrences = expandSeriesOccurrences(
        {
          id: series.id,
          title: series.title,
          weekday: series.weekday,
          localTime: series.localTime,
          timeZone: series.timeZone,
          version: series.version,
        },
        series.occurrences,
        from,
        to,
      );

      for (const occurrence of occurrences) {
        events.push(toRecurringEventDto(occurrence, weeklyRecurrence(series.weekday)));
      }
    }

    events.sort(
      (left, right) =>
        Date.parse(left.startsAt) - Date.parse(right.startsAt) || left.id.localeCompare(right.id),
    );

    return { events };
  }
}
