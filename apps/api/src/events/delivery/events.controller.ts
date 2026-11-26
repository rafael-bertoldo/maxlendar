import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import { SessionGuard } from "../../auth/delivery/session.guard";
import type { AuthenticatedRequest } from "../../auth/delivery/session.guard";
import { CreateEvent } from "../application/create-event";
import { ListEvents } from "../application/list-events";

interface CreateEventBody {
  title?: unknown;
  startsAt?: unknown;
  timeZone?: unknown;
}

@Controller("events")
@UseGuards(SessionGuard)
export class EventsController {
  constructor(
    private readonly createEvent: CreateEvent,
    private readonly listEvents: ListEvents,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Req() request: AuthenticatedRequest, @Body() body: CreateEventBody) {
    const event = await this.createEvent.execute({
      userId: request.sessionUser.id,
      title: body?.title,
      startsAt: body?.startsAt,
      timeZone: body?.timeZone,
    });
    return { event };
  }

  @Get()
  async list(
    @Req() request: AuthenticatedRequest,
    @Query("from") from: unknown,
    @Query("to") to: unknown,
  ) {
    return this.listEvents.execute({ userId: request.sessionUser.id, from, to });
  }
}
