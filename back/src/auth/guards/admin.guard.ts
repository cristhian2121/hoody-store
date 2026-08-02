import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import type { Request } from "express";
import { AuthService } from "../../services/auth.service";

/**
 * Exige un bearer token de administrador valido.
 *
 * Se aplica por ruta (denylist explicita), no globalmente: el checkout, el catalogo,
 * las ubicaciones, la cotizacion de envio y el webhook de Mercado Pago deben seguir
 * siendo publicos, y una allowlist de rutas publicas es mas facil de romper por
 * descuido que marcar a mano lo que se protege.
 */
@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractBearerToken(request.headers.authorization);

    if (!token) {
      throw new UnauthorizedException("Falta el token de administrador.");
    }

    try {
      (request as Request & { admin?: unknown }).admin = await this.authService.verifyToken(token);
      return true;
    } catch {
      throw new UnauthorizedException("Token de administrador invalido o expirado.");
    }
  }

  private extractBearerToken(header?: string): string | null {
    if (!header) return null;
    const [scheme, value] = header.split(" ");
    if (scheme?.toLowerCase() !== "bearer" || !value) return null;
    return value.trim() || null;
  }
}
