import type { Request, Response } from "express";

export const SESSION_COOKIE_NAME = "maxlendar_session";
const PERSISTENT_COOKIE_MAX_AGE_MS = 2_147_483_647_000;

function cookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
  };
}

export function setSessionCookie(response: Response, token: string): void {
  response.cookie(SESSION_COOKIE_NAME, token, {
    ...cookieOptions(),
    maxAge: PERSISTENT_COOKIE_MAX_AGE_MS,
  });
}

export function clearSessionCookie(response: Response): void {
  response.clearCookie(SESSION_COOKIE_NAME, cookieOptions());
}

export function readSessionCookie(request: Request): string | null {
  const cookieHeader = request.headers.cookie;
  if (!cookieHeader) return null;

  for (const part of cookieHeader.split(";")) {
    const separator = part.indexOf("=");
    if (separator < 0) continue;

    const name = part.slice(0, separator).trim();
    if (name !== SESSION_COOKIE_NAME) continue;

    const value = part.slice(separator + 1).trim();
    if (!value) return null;

    try {
      return decodeURIComponent(value);
    } catch {
      return null;
    }
  }

  return null;
}
