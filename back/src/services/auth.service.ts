import { Injectable, Logger, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { timingSafeEqual } from "node:crypto";
import * as bcrypt from "bcryptjs";

export interface AdminTokenPayload {
  sub: string;
  role: "admin";
}

/**
 * Autenticacion de la unica cuenta administradora.
 *
 * No hay tabla de usuarios: las credenciales viven en variables de entorno.
 * Falla al arrancar si la configuracion esta incompleta, igual que
 * MercadoPagoService con su access token. Nunca degradar a "auth desactivada":
 * una variable mal puesta debe tumbar la app, no exponer el PII de los clientes.
 */
@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly adminEmail: string;
  private readonly adminPasswordHash: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
  ) {
    const adminEmail = this.configService.get<string>("ADMIN_EMAIL");
    const adminPasswordHash = this.configService.get<string>("ADMIN_PASSWORD_HASH");

    if (!adminEmail) {
      throw new Error("Missing required environment variable: ADMIN_EMAIL");
    }
    if (!adminPasswordHash) {
      throw new Error("Missing required environment variable: ADMIN_PASSWORD_HASH");
    }
    if (!/^\$2[aby]\$/.test(adminPasswordHash)) {
      throw new Error(
        "ADMIN_PASSWORD_HASH must be a bcrypt hash (starts with $2a$/$2b$/$2y$), not a plaintext password. " +
          "Generate one with: node -e \"console.log(require('bcryptjs').hashSync(process.argv[1], 12))\" 'tu-clave'",
      );
    }

    this.adminEmail = adminEmail.trim().toLowerCase();
    this.adminPasswordHash = adminPasswordHash;
  }

  async login(
    email: string,
    password: string,
  ): Promise<{ accessToken: string; expiresIn: string }> {
    const emailMatches = this.constantTimeEquals(email.trim().toLowerCase(), this.adminEmail);
    // Siempre se corre bcrypt, incluso con email equivocado, para que el tiempo de
    // respuesta no revele si el email existe.
    const passwordMatches = await bcrypt.compare(password, this.adminPasswordHash);

    if (!emailMatches || !passwordMatches) {
      this.logger.warn(`Intento de login admin fallido para "${email}"`);
      throw new UnauthorizedException("Credenciales invalidas.");
    }

    const payload: AdminTokenPayload = { sub: this.adminEmail, role: "admin" };
    const accessToken = await this.jwtService.signAsync(payload);

    return {
      accessToken,
      expiresIn: this.configService.get<string>("JWT_EXPIRES_IN") || "12h",
    };
  }

  async verifyToken(token: string): Promise<AdminTokenPayload> {
    const payload = await this.jwtService.verifyAsync<AdminTokenPayload>(token);
    if (payload?.role !== "admin") {
      throw new UnauthorizedException("Token sin rol de administrador.");
    }
    return payload;
  }

  private constantTimeEquals(a: string, b: string): boolean {
    const bufferA = Buffer.from(a, "utf8");
    const bufferB = Buffer.from(b, "utf8");
    if (bufferA.length !== bufferB.length) {
      return false;
    }
    return timingSafeEqual(bufferA, bufferB);
  }
}
