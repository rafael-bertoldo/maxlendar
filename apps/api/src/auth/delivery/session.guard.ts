import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import type { Request } from "express";
import { GetCurrentSession } from "../application/get-current-session";
import { readSessionCookie } from "./session-cookie";

export interface AuthenticatedRequest extends Request {
  sessionUser: { id: string; username: string };
}

@Injectable()
export class SessionGuard implements CanActivate {
  constructor(private readonly getCurrentSession: GetCurrentSession) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const session = await this.getCurrentSession.execute(readSessionCookie(request));
    request.sessionUser = session.user;
    return true;
  }
}
