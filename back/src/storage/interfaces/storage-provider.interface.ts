/**
 * Seam de almacenamiento de archivos binarios.
 *
 * Espeja el patron de ShippingPricingProvider: una interfaz, un token de DI y
 * varias implementaciones elegidas por variable de entorno. El objetivo es que
 * el dia que el almacenamiento pase a Cloudflare R2 no haya que tocar ni el
 * servicio de subida ni el renderer de impresion.
 *
 * Las claves son rutas relativas tipo "designs/<uuid>/master.png". Nunca
 * absolutas y nunca provenientes del cliente.
 */

export interface StorageProvider {
  /** Escribe (o sobrescribe) el objeto. */
  put(key: string, body: Buffer, contentType: string): Promise<void>;

  /** Lee el objeto completo. Lanza si no existe. */
  get(key: string): Promise<Buffer>;

  /** Borra el objeto. Idempotente: no lanza si ya no existe. */
  remove(key: string): Promise<void>;

  exists(key: string): Promise<boolean>;
}

export const STORAGE_PROVIDER = "StorageProvider";

/**
 * Las claves las genera siempre el servidor, pero se validan igual antes de
 * tocar el disco: una sola concatenacion descuidada en el futuro convertiria un
 * "../../.env" en lectura arbitraria de archivos.
 */
const SAFE_KEY = /^[A-Za-z0-9][A-Za-z0-9/_.-]*$/;

export const assertSafeStorageKey = (key: string): void => {
  if (!SAFE_KEY.test(key) || key.includes("..") || key.includes("//")) {
    throw new Error(`Clave de almacenamiento invalida: ${JSON.stringify(key)}`);
  }
};
