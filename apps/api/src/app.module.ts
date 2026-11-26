import { Module } from "@nestjs/common";
import { AssistantModule } from "./assistant/assistant.module";
import { AuthModule } from "./auth/auth.module";
import { DatabaseModule } from "./database/database.module";
import { EventsModule } from "./events/events.module";
import { RemindersModule } from "./reminders/reminders.module";

@Module({
  imports: [DatabaseModule, AuthModule, EventsModule, RemindersModule, AssistantModule],
})
export class AppModule {}
