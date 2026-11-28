import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { SessionGuard } from "../auth/delivery/session.guard";
import { EventsModule } from "../events/events.module";
import { AssistantController } from "./assistant.controller";
import { AssistantService } from "./assistant.service";

@Module({
  imports: [EventsModule, AuthModule],
  controllers: [AssistantController],
  providers: [AssistantService, SessionGuard],
})
export class AssistantModule {}
