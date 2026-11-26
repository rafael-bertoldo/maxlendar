import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { SessionGuard } from "../auth/delivery/session.guard";
import { DatabaseModule } from "../database/database.module";
import { AssistantController } from "./assistant.controller";
import { AssistantService } from "./assistant.service";

@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [AssistantController],
  providers: [AssistantService, SessionGuard],
})
export class AssistantModule {}
