import { Injectable, Logger } from "@nestjs/common";
import webPush from "web-push";

export type StoredPushSubscription = {
  endpoint: string;
  p256dh: string;
  auth: string;
};

@Injectable()
export class PushSender {
  private readonly logger = new Logger(PushSender.name);
  private readonly configured: boolean;

  constructor() {
    const publicKey = process.env.VAPID_PUBLIC_KEY;
    const privateKey = process.env.VAPID_PRIVATE_KEY;
    const subject = process.env.VAPID_SUBJECT || "mailto:dev@localhost";

    this.configured = Boolean(publicKey && privateKey);
    if (publicKey && privateKey) {
      webPush.setVapidDetails(subject, publicKey, privateKey);
    } else {
      this.logger.warn("VAPID keys are missing; push delivery is disabled.");
    }
  }

  get publicKey(): string | null {
    return process.env.VAPID_PUBLIC_KEY || null;
  }

  async send(subscription: StoredPushSubscription, payload: string): Promise<{ expired: boolean }> {
    if (!this.configured) {
      throw new Error("Push delivery is not configured.");
    }

    try {
      await webPush.sendNotification(
        {
          endpoint: subscription.endpoint,
          keys: { p256dh: subscription.p256dh, auth: subscription.auth },
        },
        payload,
      );
      return { expired: false };
    } catch (error) {
      const statusCode = (error as { statusCode?: number }).statusCode;
      if (statusCode === 404 || statusCode === 410) {
        return { expired: true };
      }

      throw error;
    }
  }
}
