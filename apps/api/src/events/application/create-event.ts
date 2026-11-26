import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";
import { readInstant, readTimeZone, readTitle } from "../domain/event-input";
import type { CalendarEventDto } from "./event-dto";

export interface CreateEventInput {
  userId: string;
  title: unknown;
  startsAt: unknown;
  timeZone: unknown;
}

@Injectable()
export class CreateEvent {
  constructor(private readonly prisma: PrismaService) {}

  async execute(input: CreateEventInput): Promise<CalendarEventDto> {
    const title = readTitle(input.title);
    const startsAt = readInstant(input.startsAt, "startsAt");
    const creationTimeZone = readTimeZone(input.timeZone);

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

    return {
      id: event.id,
      title: event.title,
      startsAt: event.startsAt.toISOString(),
      timeZone: event.creationTimeZone,
      version: event.version,
    };
  }
}
