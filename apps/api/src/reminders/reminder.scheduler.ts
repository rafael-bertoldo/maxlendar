import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { PrismaService } from "../database/prisma.service";
import { PushSender } from "./push-sender";
import { ReminderService } from "./reminder.service";

const MAX_LOOKBACK_MS = 10 * 60_000;

@Injectable()
export class ReminderScheduler implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ReminderScheduler.name);
  private timer?: NodeJS.Timeout;

  constructor(
    private readonly prisma: PrismaService,
    private readonly sender: PushSender,
    private readonly reminders: ReminderService,
  ) {}

  onModuleInit(): void {
    const configured = Number(process.env.REMINDER_INTERVAL_MS);
    const interval = Number.isFinite(configured) && configured >= 5_000 ? configured : 15_000;
    this.timer = setInterval(() => void this.tick(), interval);
    this.timer.unref();
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  private async refreshSeriesHorizons(): Promise<void> {
    const series = await this.prisma.recurringEvent.findMany({
      where: { deletedAt: null },
      select: { id: true },
    });

    for (const entry of series) {
      await this.reminders.rescheduleSeries(entry.id);
    }
  }

  async tick(): Promise<void> {
    await this.refreshSeriesHorizons();

    const due = await this.prisma.reminder.findMany({
      where: { status: "pending", scheduledFor: { lte: new Date() } },
      select: {
        id: true,
        eventId: true,
        seriesId: true,
        occurrenceKey: true,
        eventTitle: true,
        eventStartsAt: true,
        scheduledFor: true,
        user: { select: { pushSubscriptions: true } },
      },
      take: 50,
    });

    for (const reminder of due) {
      if (reminder.scheduledFor.getTime() < Date.now() - MAX_LOOKBACK_MS) {
        await this.prisma.reminder.update({ where: { id: reminder.id }, data: { status: "expired" } });
        continue;
      }

      const claimed = await this.prisma.reminder.updateMany({
        where: { id: reminder.id, status: "pending" },
        data: { status: "sending" },
      });

      if (claimed.count !== 1) continue;

      const payload = JSON.stringify({
        title: "Lembrete do maxlendar",
        body: `${reminder.eventTitle} começa em breve.`,
        url: "/",
        eventTitle: reminder.eventTitle,
        eventId: reminder.eventId,
        seriesId: reminder.seriesId,
        occurrenceKey: reminder.occurrenceKey,
        startsAt: reminder.eventStartsAt.toISOString(),
      });

      let delivered = false;
      for (const subscription of reminder.user.pushSubscriptions) {
        try {
          const result = await this.sender.send(
            {
              endpoint: subscription.endpoint,
              p256dh: subscription.p256dh,
              auth: subscription.auth,
            },
            payload,
          );
          if (result.expired) {
            await this.prisma.pushSubscription.delete({ where: { id: subscription.id } });
          } else {
            delivered = true;
          }
        } catch (error) {
          this.logger.warn(`Push delivery failed for subscription ${subscription.id}: ${String(error)}`);
        }
      }

      await this.prisma.reminder.update({
        where: { id: reminder.id },
        data: {
          status: delivered ? "sent" : "failed",
          sentAt: delivered ? new Date() : null,
        },
      });
    }
  }
}
