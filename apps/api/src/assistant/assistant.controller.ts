import { BadRequestException, Body, Controller, Post, Req, UseGuards } from "@nestjs/common";
import { SessionGuard, type AuthenticatedRequest } from "../auth/delivery/session.guard";
import { AssistantService } from "./assistant.service";
import type { AssistantResult } from "./assistant.types";

interface InterpretBody {
  text?: unknown;
  timeZone?: unknown;
  now?: unknown;
}

function validTimeZone(value: string): boolean {
  try {
    new Intl.DateTimeFormat("pt-BR", { timeZone: value }).format();
    return true;
  } catch {
    return false;
  }
}

@Controller("assistant")
export class AssistantController {
  constructor(private readonly assistant: AssistantService) {}

  @Post("interpret")
  @UseGuards(SessionGuard)
  async interpret(@Req() request: AuthenticatedRequest, @Body() body: InterpretBody): Promise<AssistantResult> {
    const text = body?.text;
    if (typeof text !== "string" || !text.trim() || text.length > 500) {
      throw new BadRequestException({
        code: "VALIDATION_ERROR",
        field: "text",
        message: "A valid request text is required.",
      });
    }

    const timeZone = body?.timeZone;
    if (typeof timeZone !== "string" || !validTimeZone(timeZone)) {
      throw new BadRequestException({
        code: "VALIDATION_ERROR",
        field: "timeZone",
        message: "A valid IANA time zone is required.",
      });
    }

    const now = body?.now;
    let reference = new Date();
    if (now !== undefined) {
      if (typeof now !== "string" || Number.isNaN(Date.parse(now))) {
        throw new BadRequestException({
          code: "VALIDATION_ERROR",
          field: "now",
          message: "A valid ISO reference instant is required.",
        });
      }
      reference = new Date(now);
    }

    return this.assistant.interpret(request.sessionUser.id, text.trim(), timeZone, reference);
  }
}
