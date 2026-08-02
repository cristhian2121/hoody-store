/**
 * Unico lugar donde una clave de almacenamiento se vuelve una URL absoluta.
 *
 * En la base de datos las imagenes se guardan como claves relativas
 * ("products/hoodie-black.jpg") para que sobrevivan cambios de dominio entre
 * desarrollo, ngrok, staging y produccion. La API siempre responde URLs
 * absolutas porque Mercado Pago exige `picture_url` absoluto y porque
 * OrderItem.imageUrl debe seguir resolviendo para siempre.
 *
 * Cuando el almacenamiento pase a un bucket, este es el unico archivo a cambiar.
 */

import {
  getBackendBaseUrl,
  isLoopbackUrl,
  stripLeadingSlash,
  stripTrailingSlash,
} from "../config/urls";

const DEFAULT_STATIC_PATH = "/static";

export const getPublicAssetsBaseUrl = (): string => {
  const explicit = process.env.PUBLIC_ASSETS_BASE_URL;
  if (explicit) return stripTrailingSlash(explicit);

  return `${getBackendBaseUrl()}${DEFAULT_STATIC_PATH}`;
};

export const toPublicUrl = (storageKey: string): string =>
  `${getPublicAssetsBaseUrl()}/${stripLeadingSlash(storageKey)}`;

/**
 * Mercado Pago descarga `picture_url` desde sus propios servidores, asi que una
 * URL de localhost no le sirve. Devuelve undefined en ese caso para omitir el
 * campo en vez de mandar algo inalcanzable.
 */
export const toRemoteFetchableUrl = (storageKey: string): string | undefined => {
  const url = toPublicUrl(storageKey);
  return isLoopbackUrl(url) ? undefined : url;
};
