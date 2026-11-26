import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import { SessionGuard } from "../../auth/delivery/session.guard";
import type { AuthenticatedRequest } from "../../auth/delivery/session.guard";
import { CreateEvent } from "../application/create-event";
import { ListEvents } from "../application/list-events";
import { UpdateEvent } from "../application/update-event";

interface CreateEventBody {
  title?: unknown;
  startsAt?: unknown;
  timeZone?: unknown;
}

interface UpdateEventBody {
  title?: unknown;
  startsAt?: unknown;
  timeZone?: unknown;
  version?: unknown;
}

@Controller("events")
@UseGuards(SessionGuard)
export class EventsController {
  constructor(
    private readonly createEvent: CreateEvent,
    private readonly listEvents: ListEvents,
    private readonly updateEvent: UpdateEvent,
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

  @Patch(":id")
  async update(
    @Req() request: AuthenticatedRequest,
    @Param("id") id: string,
    @Body() body: UpdateEventBody,
  ) {
    const event = await this.updateEvent.execute({
      userId: request.sessionUser.id,
      id,
      title: body?.title,
      startsAt: body?.startsAt,
      timeZone: body?.timeZone,
      version: body?.version,
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
