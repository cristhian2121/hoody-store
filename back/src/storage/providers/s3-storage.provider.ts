import { Injectable, Logger } from "@nestjs/common";
import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { assertSafeStorageKey, StorageProvider } from "../interfaces/storage-provider.interface";

/**
 * Almacenamiento compatible con S3. Pensado para Cloudflare R2 (egress $0), que
 * es lo que importa cuando el dueno descarga el mismo PNG de 40 MB varias veces
 * hasta que la impresion sale bien. Tambien sirve para S3 o MinIO.
 *
 * Falla al construirse si falta configuracion, en vez de descubrirlo cuando un
 * cliente ya subio su imagen.
 */
@Injectable()
export class S3StorageProvider implements StorageProvider {
  private readonly logger = new Logger(S3StorageProvider.name);
  private readonly client: S3Client;
  private readonly bucket: string;

  constructor() {
    const bucket = process.env.S3_BUCKET;
    const accessKeyId = process.env.S3_ACCESS_KEY_ID;
    const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY;

    const missing = [
      !bucket && "S3_BUCKET",
      !accessKeyId && "S3_ACCESS_KEY_ID",
      !secretAccessKey && "S3_SECRET_ACCESS_KEY",
    ].filter(Boolean);

    if (missing.length > 0) {
      throw new Error(`STORAGE_DRIVER=s3 pero faltan variables de entorno: ${missing.join(", ")}.`);
    }

    this.bucket = bucket as string;
    this.client = new S3Client({
      // R2 ignora la region pero el SDK exige una.
      region: process.env.S3_REGION || "auto",
      endpoint: process.env.S3_ENDPOINT || undefined,
      forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true",
      credentials: {
        accessKeyId: accessKeyId as string,
        secretAccessKey: secretAccessKey as string,
      },
    });

    this.logger.log(`Almacenamiento S3 en bucket ${this.bucket}`);
  }

  async put(key: string, body: Buffer, contentType: string): Promise<void> {
    assertSafeStorageKey(key);
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
      }),
    );
  }

  async get(key: string): Promise<Buffer> {
    assertSafeStorageKey(key);
    const result = await this.client.send(new GetObjectCommand({ Bucket: this.bucket, Key: key }));
    const bytes = await result.Body?.transformToByteArray();
    if (!bytes) throw new Error(`Objeto vacio o ilegible: ${key}`);
    return Buffer.from(bytes);
  }

  async remove(key: string): Promise<void> {
    assertSafeStorageKey(key);
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }

  async exists(key: string): Promise<boolean> {
    assertSafeStorageKey(key);
    try {
      await this.client.send(new HeadObjectCommand({ Bucket: this.bucket, Key: key }));
      return true;
    } catch {
      return false;
    }
  }
}
