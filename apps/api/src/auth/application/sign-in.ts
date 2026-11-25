import { Injectable, BadRequestException, UnauthorizedException } from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";
import { verifyPassword } from "../domain/credentials";
import { createSessionToken, hashSessionToken } from "../domain/session-token";

export interface SignInInput {
  username: string;
  password: string;
}

export interface SignInResult {
  user: { id: string; username: string };
  sessionToken: string;
}

@Injectable()
export class SignIn {
  constructor(private readonly prisma: PrismaService) {}

  async execute(input: SignInInput): Promise<SignInResult> {
    if (
      typeof input.username !== "string" ||
      input.username.trim().length === 0 ||
      typeof input.password !== "string" ||
      input.password.length === 0
    ) {
      throw new BadRequestException({
        code: "VALIDATION_ERROR",
        message: "Username and password are required.",
      });
    }

    const user = await this.prisma.user.findUnique({
      where: { username: input.username },
      select: { id: true, username: true, passwordHash: true },
    });

    if (!user || !(await verifyPassword(input.password, user.passwordHash))) {
      throw new UnauthorizedException({
        code: "INVALID_CREDENTIALS",
        message: "Username or password is incorrect.",
      });
    }

    const sessionToken = createSessionToken();
    await this.prisma.session.create({
      data: {
        tokenHash: hashSessionToken(sessionToken),
        userId: user.id,
      },
    });

    return {
      user: { id: user.id, username: user.username },
      sessionToken,
    };
  }
}
