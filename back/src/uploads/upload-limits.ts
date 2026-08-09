/**
 * Limites de la subida de imagenes de diseno.
 *
 * Estan aqui y no dentro del servicio porque el interceptor de multer necesita
 * el tope de bytes antes de que exista el servicio, y porque el frontend valida
 * los mismos numeros: si divergen, el cliente ve un error generico del servidor
 * en vez de un mensaje que le diga que hacer.
 */

/**
 * 25 MB. El limite anterior de 5 MB no alcanzaba: un original util para
 * estampar 280 mm a 300 dpi tiene ~3300 px de ancho, y un PNG con alfa de ese
 * tamano pesa entre 8 y 20 MB.
 */
export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

/**
 * Tope de pixeles a decodificar. Protege contra la "bomba de descompresion":
 * un PNG de 40 KB puede declarar 30000 x 30000 px y reventar la memoria del
 * proceso al expandirse.
 */
export const MAX_INPUT_PIXELS = 60_000_000;

/** Ningun estampado necesita mas; por encima es casi siempre un error o un ataque. */
export const MAX_DIMENSION_PX = 8000;

/** Por debajo de esto no hay nada imprimible, ni siquiera un logo pequeno. */
export const MIN_DIMENSION_PX = 64;

/** Lado mayor del derivado que se muestra en el editor y el carrito. */
export const PREVIEW_MAX_PX = 600;

/**
 * Formatos aceptados, determinados decodificando el archivo y NO por el
 * mimetype que declara el navegador, que es texto libre controlado por el
 * cliente.
 *
 * SVG quedo fuera a proposito: no tiene tamano en pixeles validable, resuelve
 * fuentes por su cuenta (lo que romperia la equivalencia preview/impresion) y
 * es un vector conocido de XSS y XXE.
 */
export const ACCEPTED_INPUT_FORMATS = ["png", "jpeg", "webp"] as const;

export const MASTER_CONTENT_TYPE = "image/png";
export const PREVIEW_CONTENT_TYPE = "image/webp";

export const masterStorageKey = (assetId: string): string => `designs/${assetId}/master.png`;
export const previewStorageKey = (assetId: string): string => `designs/${assetId}/preview.webp`;
