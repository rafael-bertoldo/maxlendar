import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";
import { hashSessionToken } from "../domain/session-token";

@Injectable()
export class Logout {
  constructor(private readonly prisma: PrismaService) {}

  async execute(token: string | null): Promise<{ ok: true }> {
    if (token) {
      await this.prisma.session.updateMany({
        where: {
          tokenHash: hashSessionToken(token),
          revokedAt: null,
        },
        data: { revokedAt: new Date() },
      });
    }

    return { ok: true };
  }
}
