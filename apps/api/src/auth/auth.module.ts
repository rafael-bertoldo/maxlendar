import { Module } from "@nestjs/common";
import { AuthController } from "./delivery/auth.controller";
import { SignUp } from "./application/sign-up";
import { SignIn } from "./application/sign-in";
import { GetCurrentSession } from "./application/get-current-session";
import { Logout } from "./application/logout";
import { DatabaseModule } from "../database/database.module";
import { SessionGuard } from "./delivery/session.guard";

@Module({
  imports: [DatabaseModule],
  controllers: [AuthController],
  providers: [SignUp, SignIn, GetCurrentSession, Logout, SessionGuard],
  exports: [GetCurrentSession],
})
export class AuthModule {}
