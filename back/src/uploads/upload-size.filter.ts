import { ArgumentsHost, Catch, ExceptionFilter, PayloadTooLargeException } from "@nestjs/common";
import type { Response } from "express";
import { MAX_UPLOAD_BYTES } from "./upload-limits";

/**
 * Multer corta el stream al pasarse del tope y Nest lo traduce a un 413 con el
 * texto "File too large". Es el unico mensaje en ingles que puede ver un
 * cliente, y justo el que le toca a quien sube la foto de la camara sin
 * reducirla. Se reemplaza por el mismo texto que muestra el frontend.
 */
@Catch(PayloadTooLargeException)
export class UploadSizeExceptionFilter implements ExceptionFilter {
  catch(_exception: PayloadTooLargeException, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    response.status(413).json({
      statusCode: 413,
      error: "Payload Too Large",
      message: `La imagen supera el maximo de ${Math.round(
        MAX_UPLOAD_BYTES / 1024 / 1024,
      )} MB. Reducila o exportala con menos calidad.`,
    });
  }
}
