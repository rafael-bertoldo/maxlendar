import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Delete,
  Get,
  Post,
  Req,
  ServiceUnavailableException,
  UseGuards,
} from "@nestjs/common";
import { SessionGuard, type AuthenticatedRequest } from "../auth/delivery/session.guard";
import { PrismaService } from "../database/prisma.service";
import { PushSender } from "./push-sender";
import { ReminderService } from "./reminder.service";

interface SubscriptionBody {
  endpoint?: unknown;
  keys?: { p256dh?: unknown; auth?: unknown } | unknown;
}

const invalid = (field: string, message: string) =>
  new BadRequestException({ code: "VALIDATION_ERROR", field, message });

@Controller("push")
export class PushController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sender: PushSender,
    private readonly reminders: ReminderService,
  ) {}

  @Get("vapid-public-key")
  publicKey() {
    const publicKey = this.sender.publicKey;
    if (!publicKey) {
      throw new ServiceUnavailableException({
        code: "PUSH_NOT_CONFIGURED",
        message: "Push notifications are not configured on this server.",
      });
    }

    return { publicKey };
  }

  @Post("subscriptions")
  @UseGuards(SessionGuard)
  async subscribe(@Req() request: AuthenticatedRequest, @Body() body: SubscriptionBody) {
    const endpoint = body?.endpoint;
    const keys = body?.keys as { p256dh?: unknown; auth?: unknown } | undefined;
    const p256dh = keys?.p256dh;
    const auth = keys?.auth;

    if (typeof endpoint !== "string" || !endpoint.startsWith("https://")) {
      throw invalid("endpoint", "A valid push endpoint is required.");
    }
    if (typeof p256dh !== "string" || !p256dh) {
      throw invalid("p256dh", "A valid subscription key is required.");
    }
    if (typeof auth !== "string" || !auth) {
      throw invalid("auth", "A valid subscription key is required.");
    }

    const existing = await this.prisma.pushSubscription.findUnique({ where: { endpoint } });
    if (existing && existing.userId !== request.sessionUser.id) {
      throw new ConflictException({
        code: "SUBSCRIPTION_OWNER_CONFLICT",
        message: "This push subscription belongs to another account.",
      });
    }

    await this.prisma.pushSubscription.upsert({
      where: { endpoint },
      create: { userId: request.sessionUser.id, endpoint, p256dh, auth },
      update: { p256dh, auth },
    });

    await this.reminders.scheduleAllForUser(request.sessionUser.id);
    return { ok: true };
  }

  @Delete("subscriptions")
  @UseGuards(SessionGuard)
  async unsubscribe(@Req() request: AuthenticatedRequest, @Body() body: SubscriptionBody) {
    const endpoint = body?.endpoint;
    if (typeof endpoint !== "string" || !endpoint) {
      throw invalid("endpoint", "A valid push endpoint is required.");
    }

    await this.prisma.pushSubscription.deleteMany({
      where: { userId: request.sessionUser.id, endpoint },
    });
    return { ok: true };
  }
}
