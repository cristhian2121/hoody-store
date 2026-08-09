import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Res,
  UploadedFile,
  UseFilters,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { memoryStorage } from "multer";
import { Throttle, ThrottlerGuard } from "@nestjs/throttler";
import { ApiConsumes, ApiOperation, ApiTags } from "@nestjs/swagger";
import type { Response } from "express";
import { DesignImageService } from "./design-image.service";
import { UploadSizeExceptionFilter } from "./upload-size.filter";
import { MAX_UPLOAD_BYTES } from "./upload-limits";

@ApiTags("uploads")
@Controller("api/uploads")
export class UploadsController {
  constructor(private readonly designImages: DesignImageService) {}

  /**
   * Endpoint publico a proposito: el cliente sube su diseno antes de existir
   * como comprador, asi que no hay nadie a quien autenticar.
   *
   * La contencion es en capas: limite de peticiones por IP, tope de bytes en
   * multer (corta el stream sin llegar a memoria completa), validacion por
   * decodificacion y barrido de los que nunca terminan en una compra.
   */
  @Post("design-image")
  @UseFilters(UploadSizeExceptionFilter)
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 20, ttl: 600_000 } })
  @UseInterceptors(
    FileInterceptor("file", {
      storage: memoryStorage(),
      limits: { fileSize: MAX_UPLOAD_BYTES, files: 1 },
    }),
  )
  @ApiConsumes("multipart/form-data")
  @ApiOperation({ summary: "Sube una imagen para estampar" })
  async uploadDesignImage(@UploadedFile() file: Express.Multer.File) {
    return this.designImages.createFromUpload(file);
  }

  /**
   * Los masters nunca se sirven por aqui. El preview si es publico: lo pinta el
   * editor y el carrito, y su clave es un uuid, asi que se cachea para siempre.
   */
  @Get("design-image/:assetId/preview")
  @ApiOperation({ summary: "Preview de una imagen subida" })
  async getPreview(
    @Param("assetId", new ParseUUIDPipe()) assetId: string,
    @Res() res: Response,
  ): Promise<void> {
    const { body, contentType } = await this.designImages.readPreview(assetId);
    res.setHeader("Content-Type", contentType);
    res.setHeader("Content-Length", body.byteLength);
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    res.end(body);
  }
}
