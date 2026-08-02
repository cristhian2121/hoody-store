import { BadRequestException, Inject, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { createHash, randomUUID } from "node:crypto";
import * as sharp from "sharp";
import {
  DESIGNS_REPOSITORY,
  DesignsRepository,
} from "../repositories/interfaces/designs.repository.interface";
import {
  STORAGE_PROVIDER,
  StorageProvider,
} from "../storage/interfaces/storage-provider.interface";
import { getBackendBaseUrl } from "../config/urls";
import {
  ACCEPTED_INPUT_FORMATS,
  MASTER_CONTENT_TYPE,
  MAX_DIMENSION_PX,
  MAX_INPUT_PIXELS,
  MAX_UPLOAD_BYTES,
  MIN_DIMENSION_PX,
  PREVIEW_CONTENT_TYPE,
  PREVIEW_MAX_PX,
  masterStorageKey,
  previewStorageKey,
} from "./upload-limits";

export interface DesignImageUploadResult {
  assetId: string;
  previewUrl: string;
  /** Dimensiones del master, ya con la orientacion EXIF aplicada. */
  width: number;
  height: number;
  /** Cierto solo si hay pixeles realmente translucidos, no solo canal alfa. */
  hasAlpha: boolean;
  /** Bytes del master, no del archivo original. */
  bytes: number;
}

export const designPreviewUrl = (assetId: string): string =>
  `${getBackendBaseUrl()}/api/uploads/design-image/${assetId}/preview`;

/**
 * Recibe la imagen que sube el cliente y produce dos derivados:
 *
 * - `master.png`: resolucion completa con alfa. Es el unico artefacto
 *   irrecuperable; de el sale el archivo de impresion.
 * - `preview.webp`: 600 px, lo que ve el editor y el carrito.
 *
 * Todo se vuelve a codificar en el servidor. Esa recodificacion ES el antivirus
 * a esta escala: lo que sale es un PNG generado por libvips a partir de los
 * pixeles decodificados, asi que cualquier EXIF raro, perfil ICC malformado o
 * payload adjunto al final del archivo simplemente no sobrevive.
 */
@Injectable()
export class DesignImageService {
  private readonly logger = new Logger(DesignImageService.name);

  constructor(
    @Inject(STORAGE_PROVIDER) private readonly storage: StorageProvider,
    @Inject(DESIGNS_REPOSITORY) private readonly designs: DesignsRepository,
  ) {}

  async createFromUpload(file?: {
    buffer?: Buffer;
    size?: number;
    originalname?: string;
  }): Promise<DesignImageUploadResult> {
    const buffer = file?.buffer;
    if (!buffer || buffer.length === 0) {
      throw new BadRequestException("No recibimos ningun archivo.");
    }
    if (buffer.length > MAX_UPLOAD_BYTES) {
      throw new BadRequestException(
        `La imagen supera el maximo de ${Math.round(MAX_UPLOAD_BYTES / 1024 / 1024)} MB.`,
      );
    }

    const metadata = await this.readMetadata(buffer);
    this.assertUsable(metadata);

    const hasAlpha = await this.detectRealTransparency(buffer, metadata.hasAlpha === true);

    const assetId = randomUUID();
    const master = await this.encodeMaster(buffer);
    const preview = await this.encodePreview(master.data);

    const storageKey = masterStorageKey(assetId);
    const previewKey = previewStorageKey(assetId);

    // Primero el almacenamiento y despues la fila. Al reves quedaria una fila
    // apuntando a un objeto que no existe, que es peor que un objeto huerfano:
    // el huerfano lo recoge el barrido, la fila rota reventaria al imprimir.
    await this.storage.put(storageKey, master.data, MASTER_CONTENT_TYPE);
    await this.storage.put(previewKey, preview, PREVIEW_CONTENT_TYPE);

    try {
      await this.designs.createAsset({
        id: assetId,
        storageKey,
        previewKey,
        mimeType: MASTER_CONTENT_TYPE,
        bytes: master.info.size,
        width: master.info.width,
        height: master.info.height,
        hasAlpha,
        checksumSha256: createHash("sha256").update(master.data).digest("hex"),
      });
    } catch (error) {
      await this.removeQuietly(storageKey);
      await this.removeQuietly(previewKey);
      throw error;
    }

    this.logger.log(
      `Diseno subido ${assetId}: ${master.info.width}x${master.info.height}, ` +
        `${Math.round(master.info.size / 1024)} KB, alfa=${hasAlpha}`,
    );

    return {
      assetId,
      previewUrl: designPreviewUrl(assetId),
      width: master.info.width,
      height: master.info.height,
      hasAlpha,
      bytes: master.info.size,
    };
  }

  async readPreview(assetId: string): Promise<{ body: Buffer; contentType: string }> {
    const asset = await this.designs.findAssetById(assetId);
    if (!asset) {
      throw new NotFoundException("Esa imagen ya no existe.");
    }
    return { body: await this.storage.get(asset.previewKey), contentType: PREVIEW_CONTENT_TYPE };
  }

  private async readMetadata(buffer: Buffer): Promise<sharp.Metadata> {
    try {
      return await sharp(buffer, { limitInputPixels: MAX_INPUT_PIXELS }).metadata();
    } catch {
      // Nunca se filtra el mensaje de libvips: describe el parser interno y no
      // le sirve a nadie que subio un .docx renombrado a .png.
      throw new BadRequestException("No pudimos leer la imagen. Debe ser PNG, JPG o WebP.");
    }
  }

  /**
   * El formato lo decide el contenido decodificado, no `file.mimetype`: ese
   * campo lo escribe el navegador y un cliente hecho a mano pone lo que quiera.
   */
  private assertUsable(metadata: sharp.Metadata): void {
    const format = metadata.format ?? "";
    if (!(ACCEPTED_INPUT_FORMATS as readonly string[]).includes(format)) {
      throw new BadRequestException(
        `El formato ${format || "desconocido"} no sirve para estampar. Sube un PNG, JPG o WebP.`,
      );
    }

    if ((metadata.pages ?? 1) > 1) {
      throw new BadRequestException(
        "Las imagenes animadas no se pueden estampar. Sube una imagen fija.",
      );
    }

    const { width, height } = metadata;
    if (!width || !height) {
      throw new BadRequestException("No pudimos determinar el tamano de la imagen.");
    }

    if (width * height > MAX_INPUT_PIXELS) {
      throw new BadRequestException("La imagen tiene demasiados pixeles para procesarla.");
    }

    if (width > MAX_DIMENSION_PX || height > MAX_DIMENSION_PX) {
      throw new BadRequestException(
        `La imagen no puede superar los ${MAX_DIMENSION_PX} px por lado.`,
      );
    }

    if (width < MIN_DIMENSION_PX || height < MIN_DIMENSION_PX) {
      throw new BadRequestException(
        `La imagen es demasiado pequena para estampar (minimo ${MIN_DIMENSION_PX} px por lado).`,
      );
    }
  }

  /**
   * Tener canal alfa no es lo mismo que usarlo: casi todo PNG exportado lo trae
   * completamente opaco. La diferencia importa porque decide si al cliente se le
   * avisa que su estampado saldra con un rectangulo de fondo.
   *
   * Solo se paga el costo de leer los pixeles cuando existe el canal.
   */
  private async detectRealTransparency(buffer: Buffer, hasAlphaChannel: boolean): Promise<boolean> {
    if (!hasAlphaChannel) return false;
    try {
      const stats = await sharp(buffer, { limitInputPixels: MAX_INPUT_PIXELS }).stats();
      return !stats.isOpaque;
    } catch (error) {
      this.logger.warn(`No se pudo calcular la transparencia: ${(error as Error).message}`);
      return true;
    }
  }

  private async encodeMaster(buffer: Buffer) {
    return sharp(buffer, { limitInputPixels: MAX_INPUT_PIXELS })
      // Sin esto, una foto tomada con el telefono en vertical llega acostada:
      // el sensor la guarda apaisada y deja la orientacion en el EXIF, que el
      // navegador respeta y el rasterizador de impresion no.
      .rotate()
      // Convierte desde el perfil de origen (Display P3, Adobe RGB) a sRGB. Sin
      // esto los valores crudos se reinterpretan como sRGB y los colores se
      // desplazan entre lo que el cliente aprobo y lo que se imprime.
      .withIccProfile("srgb")
      // Master siempre RGBA, tenga o no transparencia real: el compositor de
      // impresion trabaja sobre un unico formato en vez de ramificar.
      .ensureAlpha()
      .png({ compressionLevel: 9 })
      .toBuffer({ resolveWithObject: true });
  }

  /**
   * El preview sale del master, no del original: asi es imposible que difieran
   * en rotacion o en color, que es justo lo que el cliente esta aprobando.
   */
  private async encodePreview(master: Buffer): Promise<Buffer> {
    return sharp(master, { limitInputPixels: MAX_INPUT_PIXELS })
      .resize(PREVIEW_MAX_PX, PREVIEW_MAX_PX, { fit: "inside", withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer();
  }

  private async removeQuietly(key: string): Promise<void> {
    try {
      await this.storage.remove(key);
    } catch (error) {
      this.logger.warn(`No se pudo borrar ${key}: ${(error as Error).message}`);
    }
  }
}
