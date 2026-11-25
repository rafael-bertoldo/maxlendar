import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Res,
} from "@nestjs/common";
import type { Response } from "express";
import { SignUp } from "../application/sign-up";
import { SignIn } from "../application/sign-in";

interface SignUpBody {
  username: string;
  password: string;
}

const SESSION_COOKIE_NAME = "maxlendar_session";
const PERSISTENT_COOKIE_MAX_AGE_MS = 2_147_483_647_000;

@Controller("auth")
export class AuthController {
  constructor(
    private readonly signUp: SignUp,
    private readonly signIn: SignIn,
  ) {}

  @Post("signup")
  @HttpCode(HttpStatus.CREATED)
  async signUpUser(
    @Body() body: SignUpBody,
    @Res({ passthrough: true }) response: Response,
  ): Promise<{ user: { id: string; username: string } }> {
    const result = await this.signUp.execute(body ?? {} as SignUpBody);
    response.cookie(SESSION_COOKIE_NAME, result.sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: PERSISTENT_COOKIE_MAX_AGE_MS,
    });
    return { user: result.user };
  }

  @Post("login")
  @HttpCode(HttpStatus.OK)
  async signInUser(
    @Body() body: SignUpBody,
    @Res({ passthrough: true }) response: Response,
  ): Promise<{ user: { id: string; username: string } }> {
    const result = await this.signIn.execute(body ?? {} as SignUpBody);
    response.cookie(SESSION_COOKIE_NAME, result.sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: PERSISTENT_COOKIE_MAX_AGE_MS,
    });
    return { user: result.user };
  }
}
