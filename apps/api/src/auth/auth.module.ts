import { Module } from "@nestjs/common";
import { AuthController } from "./delivery/auth.controller";
import { SignUp } from "./application/sign-up";
import { SignIn } from "./application/sign-in";
import { DatabaseModule } from "../database/database.module";

@Module({
  imports: [DatabaseModule],
  controllers: [AuthController],
  providers: [SignUp, SignIn],
})
export class AuthModule {}
