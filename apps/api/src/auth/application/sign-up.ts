import { ConflictException, Injectable, BadRequestException } from "@nestjs/common";
import { Prisma } from "../../generated/prisma/client";
import { PrismaService } from "../../database/prisma.service";
import { hashPassword } from "../domain/credentials";
import { createSessionToken, hashSessionToken } from "../domain/session-token";

export interface SignUpInput {
  username: string;
  password: string;
}

export interface SignUpResult {
  user: { id: string; username: string };
  sessionToken: string;
}

@Injectable()
export class SignUp {
  constructor(private readonly prisma: PrismaService) {}

  async execute(input: SignUpInput): Promise<SignUpResult> {
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

    const passwordHash = await hashPassword(input.password);
    const sessionToken = createSessionToken();

    try {
      const user = await this.prisma.$transaction(async (transaction) => {
        const createdUser = await transaction.user.create({
          data: {
            username: input.username,
            passwordHash,
            calendar: { create: {} },
            sessions: { create: { tokenHash: hashSessionToken(sessionToken) } },
          },
          select: { id: true, username: true },
        });
        return createdUser;
      });

      return { user, sessionToken };
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw new ConflictException({
          code: "USERNAME_TAKEN",
          message: "That username is already in use.",
        });
      }
      throw error;
    }
  }
}
