import { Module } from "@nestjs/common";
import { AuthController } from "./delivery/auth.controller";
import { SignUp } from "./application/sign-up";
import { DatabaseModule } from "../database/database.module";

@Module({
  imports: [DatabaseModule],
  controllers: [AuthController],
  providers: [SignUp],
})
export class AuthModule {}
