/**
 * URL publica del backend.
 *
 * Vive aparte porque la usan cosas que no se parecen entre si: las fotos de
 * catalogo servidas en /static, el preview de una imagen subida y (mas adelante)
 * los links de descarga del arte. Tener una sola definicion evita que en ngrok o
 * en produccion unas queden absolutas y otras apuntando a localhost.
 */

export const stripTrailingSlash = (value: string): string => value.replace(/\/+$/, "");

export const stripLeadingSlash = (value: string): string => value.replace(/^\/+/, "");

export const getBackendBaseUrl = (): string =>
  stripTrailingSlash(process.env.BACKEND_URL || "http://localhost:4242");

/**
 * Cierto cuando la URL apunta a la maquina local y por lo tanto no es alcanzable
 * desde afuera (Mercado Pago descargando `picture_url`, Meta descargando un
 * archivo de WhatsApp).
 */
export const isLoopbackUrl = (url: string): boolean =>
  /^https?:\/\/(localhost|127\.0\.0\.1|\[?::1\]?)(:|\/|$)/i.test(url);
