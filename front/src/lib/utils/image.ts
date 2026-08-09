import type { ImageElement } from "../types";
import type { UploadedDesignImage } from "../uploads";
import {
  MAX_FILE_SIZE,
  ALLOWED_IMAGE_TYPES,
  DEFAULT_IMAGE_POSITION,
  DEFAULT_SCALE,
  DEFAULT_ROTATION,
} from "../constants";

export interface ImageValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validacion previa, no la definitiva.
 *
 * `file.type` lo deduce el navegador de la extension y se puede falsear
 * renombrando un archivo. La validacion que cuenta es la del servidor, que
 * decodifica la imagen; esta solo evita gastar una subida de 25 MB para
 * enterarse de algo que se sabia de antemano.
 */
export const validateImageFile = (file: File): ImageValidationResult => {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type as (typeof ALLOWED_IMAGE_TYPES)[number])) {
    return { valid: false, error: "Solo se permiten imagenes PNG, JPG o WebP." };
  }
  if (file.size > MAX_FILE_SIZE) {
    const mb = Math.round(MAX_FILE_SIZE / 1024 / 1024);
    return { valid: false, error: `La imagen supera el maximo de ${mb} MB.` };
  }
  return { valid: true };
};

/**
 * Convierte la respuesta de la subida en la capa que maneja el editor.
 *
 * `naturalWidth`/`naturalHeight` son los del master en el servidor, no los del
 * preview: son la unica cifra con la que se puede calcular el DPI efectivo del
 * estampado.
 */
export const createImageElement = (
  uploaded: UploadedDesignImage,
  x: number = DEFAULT_IMAGE_POSITION.x,
  y: number = DEFAULT_IMAGE_POSITION.y,
  scale: number = DEFAULT_SCALE,
  rotation: number = DEFAULT_ROTATION,
): ImageElement => ({
  assetId: uploaded.assetId,
  previewUrl: uploaded.previewUrl,
  naturalWidth: uploaded.width,
  naturalHeight: uploaded.height,
  hasAlpha: uploaded.hasAlpha,
  x,
  y,
  scale,
  rotation,
});
