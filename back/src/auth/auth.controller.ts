import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from "@nestjs/common";
import { Throttle, ThrottlerGuard } from "@nestjs/throttler";
import { AuthService } from "../services/auth.service";
import { LoginDto } from "./dto/login.dto";

@Controller("api/admin")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // Una sola cuenta admin es un blanco obvio de fuerza bruta.
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post("login")
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto.email, loginDto.password);
  }
}
