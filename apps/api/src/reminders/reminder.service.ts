import { Injectable } from "@nestjs/common";
import { PrismaService } from "../database/prisma.service";

export const REMINDER_OFFSETS_MINUTES = [10, 1];

@Injectable()
export class ReminderService {
  constructor(private readonly prisma: PrismaService) {}

  async schedule(eventId: string): Promise<void> {
    const event = await this.prisma.calendarEvent.findUnique({
      where: { id: eventId },
      select: {
        id: true,
        startsAt: true,
        calendar: { select: { userId: true } },
      },
    });

    if (!event) return;

    await this.prisma.reminder.deleteMany({ where: { eventId, status: "pending" } });

    const now = Date.now();
    const reminders = REMINDER_OFFSETS_MINUTES.flatMap((offsetMinutes) => {
      const scheduledFor = new Date(event.startsAt.getTime() - offsetMinutes * 60_000);
      if (scheduledFor.getTime() <= now) return [];
      return [{
        eventId: event.id,
        userId: event.calendar.userId,
        offsetMinutes,
        scheduledFor,
      }];
    });

    if (reminders.length > 0) {
      await this.prisma.reminder.createMany({ data: reminders });
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
}
