import { Injectable, UnauthorizedException } from "@nestjs/common";
import { createHmac, timingSafeEqual } from "node:crypto";
import { getBackendBaseUrl } from "../config/urls";

const DEFAULT_TTL_MINUTES = 60;

/**
 * Token firmado de un solo proposito para descargar el arte de una orden.
 *
 * No se usa el token de admin: el link viaja por WhatsApp, y Meta descarga el
 * archivo desde sus propios servidores para mostrarlo. Mandar ahi una credencial
 * que abre todo el panel —con el PII de todos los clientes— seria regalarla a un
 * tercero y a cualquiera que reenvie el mensaje.
 *
 * Este token sirve para una sola orden, caduca, y no permite nada mas.
 */
@Injectable()
export class PrintDownloadTokenService {
  private readonly secret: string;

  constructor() {
    const secret = process.env.JWT_SECRET;
    // Se reusa JWT_SECRET a proposito: ya es obligatorio para arrancar y ya se
    // valida su longitud, asi que no agrega una variable mas que se pueda
    // olvidar en produccion.
    if (!secret || secret.length < 32) {
      throw new Error(
        "JWT_SECRET es obligatorio y debe tener al menos 32 caracteres para firmar los links de descarga.",
      );
    }
    this.secret = secret;
  }

  private ttlMinutes(): number {
    const raw = Number(process.env.PRINT_DOWNLOAD_TTL_MINUTES);
    return Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_TTL_MINUTES;
  }

  private sign(orderId: string, expiresAt: number): string {
    return createHmac("sha256", this.secret).update(`${orderId}.${expiresAt}`).digest("hex");
  }

  issue(orderId: string): { token: string; expiresAt: number; expiresInMinutes: number } {
    const minutes = this.ttlMinutes();
    const expiresAt = Date.now() + minutes * 60_000;
    return {
      token: `${expiresAt}.${this.sign(orderId, expiresAt)}`,
      expiresAt,
      expiresInMinutes: minutes,
    };
  }

  downloadUrl(orderId: string): { url: string; expiresInMinutes: number } {
    const { token, expiresInMinutes } = this.issue(orderId);
    return {
      url: `${getBackendBaseUrl()}/api/print/orders/${orderId}/bundle.zip?token=${token}`,
      expiresInMinutes,
    };
  }

  assertValid(orderId: string, token: string | undefined): void {
    if (!token) throw new UnauthorizedException("Falta el token de descarga.");

    const [rawExpiry, signature] = token.split(".");
    const expiresAt = Number(rawExpiry);

    if (!Number.isFinite(expiresAt) || !signature) {
      throw new UnauthorizedException("Token de descarga invalido.");
    }
    if (Date.now() > expiresAt) {
      throw new UnauthorizedException("El link de descarga expiro. Pedí uno nuevo desde el admin.");
    }

    const expected = Buffer.from(this.sign(orderId, expiresAt), "hex");
    const received = Buffer.from(signature, "hex");

    // Comparacion de tiempo constante: comparar con === filtra informacion sobre
    // cuantos bytes del prefijo acerto quien esta probando firmas.
    if (expected.length !== received.length || !timingSafeEqual(expected, received)) {
      throw new UnauthorizedException("Token de descarga invalido.");
    }
  }
}
