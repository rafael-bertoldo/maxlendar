import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";
import { ReminderService } from "../../reminders/reminder.service";
import { readInstant, readTimeZone, readTitle, readVersion } from "../domain/event-input";
import type { CalendarEventDto } from "./event-dto";

export interface UpdateEventInput {
  userId: string;
  id: string;
  title: unknown;
  startsAt: unknown;
  timeZone: unknown;
  version: unknown;
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

    const existing = await this.prisma.calendarEvent.findFirst({
      where: { id: input.id, calendarId: calendar.id },
      select: { id: true },
    });

    if (!existing) {
      throw new NotFoundException({
        code: "EVENT_NOT_FOUND",
        message: "The event was not found.",
      });
    }

    const result = await this.prisma.calendarEvent.updateMany({
      where: { id: existing.id, calendarId: calendar.id, version: expectedVersion },
      data: {
        title,
        startsAt,
        creationTimeZone: editorTimeZone,
        version: { increment: 1 },
      },
    });

    if (result.count !== 1) {
      throw new ConflictException({
        code: "VERSION_CONFLICT",
        message: "This event was changed on another device. Reload and try again.",
      });
    }

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

    if (!event) {
      throw new NotFoundException({
        code: "EVENT_NOT_FOUND",
        message: "The event was not found.",
      });
    }

    await this.reminders.schedule(event.id);

    return {
      id: event.id,
      title: event.title,
      startsAt: event.startsAt.toISOString(),
      timeZone: event.creationTimeZone,
      version: event.version,
    };
  }
}
