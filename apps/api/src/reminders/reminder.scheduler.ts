import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { PrismaService } from "../database/prisma.service";
import { PushSender } from "./push-sender";

const MAX_LOOKBACK_MS = 10 * 60_000;

@Injectable()
export class ReminderScheduler implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ReminderScheduler.name);
  private timer?: NodeJS.Timeout;

  constructor(
    private readonly prisma: PrismaService,
    private readonly sender: PushSender,
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

  async tick(): Promise<void> {
    const due = await this.prisma.reminder.findMany({
      where: { status: "pending", scheduledFor: { lte: new Date() } },
      include: {
        event: { select: { title: true, startsAt: true } },
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
        body: `${reminder.event.title} começa às ${new Intl.DateTimeFormat('pt-BR', {
          hour: '2-digit',
          minute: '2-digit',
        }).format(reminder.event.startsAt)} no fuso deste dispositivo.`,
        url: "/",
        eventId: reminder.eventId,
        startsAt: reminder.event.startsAt.toISOString(),
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
