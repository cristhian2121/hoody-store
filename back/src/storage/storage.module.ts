import { Global, Module } from "@nestjs/common";
import { STORAGE_PROVIDER } from "./interfaces/storage-provider.interface";
import { LocalDiskStorageProvider } from "./providers/local-disk-storage.provider";
import { S3StorageProvider } from "./providers/s3-storage.provider";

export const STORAGE_DRIVERS = ["local", "s3"] as const;
export type StorageDriver = (typeof STORAGE_DRIVERS)[number];

/**
 * El driver se elige una sola vez, al arrancar. Un valor desconocido tumba la
 * aplicacion en vez de caer al local en silencio: escribir en el disco efimero
 * de un contenedor creyendo que se esta escribiendo en el bucket es como se
 * pierden los archivos de ordenes ya pagadas.
 */
const resolveDriver = (): StorageDriver => {
  const raw = (process.env.STORAGE_DRIVER || "local").trim().toLowerCase();
  if (!(STORAGE_DRIVERS as readonly string[]).includes(raw)) {
    throw new Error(
      `STORAGE_DRIVER invalido: ${JSON.stringify(raw)}. Valores validos: ${STORAGE_DRIVERS.join(", ")}.`,
    );
  }
  return raw as StorageDriver;
};

@Global()
@Module({
  providers: [
    {
      provide: STORAGE_PROVIDER,
      useFactory: () =>
        resolveDriver() === "s3" ? new S3StorageProvider() : new LocalDiskStorageProvider(),
    },
  ],
  exports: [STORAGE_PROVIDER],
})
export class StorageModule {}
