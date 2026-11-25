import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
} from "@nestjs/common";
import type { Request, Response } from "express";
import { SignUp } from "../application/sign-up";
import { SignIn } from "../application/sign-in";
import { GetCurrentSession } from "../application/get-current-session";
import { Logout } from "../application/logout";
import {
  clearSessionCookie,
  readSessionCookie,
  setSessionCookie,
} from "./session-cookie";

interface SignUpBody {
  username: string;
  password: string;
}

@Controller("auth")
export class AuthController {
  constructor(
    private readonly signUp: SignUp,
    private readonly signIn: SignIn,
    private readonly getCurrentSession: GetCurrentSession,
    private readonly logout: Logout,
  ) {}

  @Post("signup")
  @HttpCode(HttpStatus.CREATED)
  async signUpUser(
    @Body() body: SignUpBody,
    @Res({ passthrough: true }) response: Response,
  ): Promise<{ user: { id: string; username: string } }> {
    const result = await this.signUp.execute(body ?? {} as SignUpBody);
    setSessionCookie(response, result.sessionToken);
    return { user: result.user };
  }

  @Post("login")
  @HttpCode(HttpStatus.OK)
  async signInUser(
    @Body() body: SignUpBody,
    @Res({ passthrough: true }) response: Response,
  ): Promise<{ user: { id: string; username: string } }> {
    const result = await this.signIn.execute(body ?? {} as SignUpBody);
    setSessionCookie(response, result.sessionToken);
    return { user: result.user };
  }

  @Get("session")
  async currentSession(@Req() request: Request) {
    return this.getCurrentSession.execute(readSessionCookie(request));
  }

  @Post("logout")
  @HttpCode(HttpStatus.OK)
  async signOut(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<{ ok: true }> {
    const result = await this.logout.execute(readSessionCookie(request));
    clearSessionCookie(response);
    return result;
  }
}
