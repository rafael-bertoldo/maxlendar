import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";
import { ReminderService } from "../../reminders/reminder.service";
import { readVersionParam } from "../domain/event-input";

export interface DeleteEventInput {
  userId: string;
  id: string;
  version: unknown;
}

@Injectable()
export class DeleteEvent {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reminders: ReminderService,
  ) {}

  async execute(input: DeleteEventInput): Promise<{ ok: true }> {
    const expectedVersion = readVersionParam(input.version);

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

    const result = await this.prisma.calendarEvent.deleteMany({
      where: { id: existing.id, calendarId: calendar.id, version: expectedVersion },
    });

    if (result.count !== 1) {
      throw new ConflictException({
        code: "VERSION_CONFLICT",
        message: "This event was changed on another device. Reload and try again.",
      });
    }

    await this.reminders.cancel(existing.id);

    return { ok: true };
  }
}
