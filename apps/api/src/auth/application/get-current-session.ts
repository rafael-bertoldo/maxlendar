import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";
import { hashSessionToken } from "../domain/session-token";

@Injectable()
export class GetCurrentSession {
  constructor(private readonly prisma: PrismaService) {}

  async execute(token: string | null): Promise<{ user: { id: string; username: string } }> {
    if (!token) throw this.unauthenticated();

    const session = await this.prisma.session.findUnique({
      where: { tokenHash: hashSessionToken(token) },
      select: {
        revokedAt: true,
        user: { select: { id: true, username: true } },
      },
    });

    if (!session || session.revokedAt) throw this.unauthenticated();
    return { user: session.user };
  }

  private unauthenticated(): UnauthorizedException {
    return new UnauthorizedException({
      code: "UNAUTHENTICATED",
      message: "You are not signed in.",
    });
  }
}
