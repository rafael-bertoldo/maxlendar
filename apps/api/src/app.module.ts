import { Module } from "@nestjs/common";
import { AuthModule } from "./auth/auth.module";
import { DatabaseModule } from "./database/database.module";
import { EventsModule } from "./events/events.module";

@Module({
  imports: [DatabaseModule, AuthModule, EventsModule],
})
export class AppModule {}
