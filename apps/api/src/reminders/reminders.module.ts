import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { SessionGuard } from "../auth/delivery/session.guard";
import { DatabaseModule } from "../database/database.module";
import { PushController } from "./push.controller";
import { PushSender } from "./push-sender";
import { ReminderScheduler } from "./reminder.scheduler";
import { ReminderService } from "./reminder.service";

@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [PushController],
  providers: [PushSender, ReminderService, ReminderScheduler, SessionGuard],
  exports: [ReminderService],
})
export class RemindersModule {}
