import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { SessionGuard } from "../auth/delivery/session.guard";
import { DatabaseModule } from "../database/database.module";
import { CreateEvent } from "./application/create-event";
import { ListEvents } from "./application/list-events";
import { UpdateEvent } from "./application/update-event";
import { EventsController } from "./delivery/events.controller";

@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [EventsController],
  providers: [CreateEvent, ListEvents, UpdateEvent, SessionGuard],
})
export class EventsModule {}
