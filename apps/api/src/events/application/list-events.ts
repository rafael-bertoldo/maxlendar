import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";
import { readRange } from "../domain/event-input";
import type { CalendarEventDto } from "./event-dto";

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

    const events = await this.prisma.calendarEvent.findMany({
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
    });

    return {
      events: events.map((event) => ({
        id: event.id,
        title: event.title,
        startsAt: event.startsAt.toISOString(),
        timeZone: event.creationTimeZone,
        version: event.version,
      })),
    };
  }
}
