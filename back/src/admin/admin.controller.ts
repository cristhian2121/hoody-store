import { Controller, Get, Param, ParseUUIDPipe, Post, Query, Res, UseGuards } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import type { Response } from "express";
import { AdminGuard } from "../auth/guards/admin.guard";
import { AdminService } from "./admin.service";
import { PrintDownloadTokenService } from "../print/print-download-token.service";

@ApiTags("admin")
@Controller("api/admin")
@UseGuards(AdminGuard)
export class AdminController {
  constructor(
    private readonly admin: AdminService,
    private readonly downloadTokens: PrintDownloadTokenService,
  ) {}

  @Get("orders")
  @ApiOperation({ summary: "Lista de pedidos con el estado de su arte" })
  async listOrders() {
    return { orders: await this.admin.listOrders() };
  }

  @Get("orders/:id")
  async getOrder(@Param("id", new ParseUUIDPipe()) id: string) {
    return this.admin.getOrder(id);
  }

  /**
   * Link de descarga para compartir.
   *
   * Devuelve una URL firmada y con expiracion en vez de exigir el token de
   * admin, para que el dueno pueda abrirla desde el celular o mandarsela al
   * taller sin entregar su sesion.
   */
  @Post("orders/:id/download-link")
  async createDownloadLink(@Param("id", new ParseUUIDPipe()) id: string) {
    await this.admin.getOrder(id);
    return this.downloadTokens.downloadUrl(id);
  }

  @Post("orders/:id/rerender")
  @ApiOperation({ summary: "Vuelve a encolar el arte de la orden" })
  async rerender(@Param("id", new ParseUUIDPipe()) id: string) {
    return { queued: await this.admin.requeue(id) };
  }

  @Get("print-assets/:printAssetId/proof")
  @ApiOperation({ summary: "Imagen de prueba, para revisar sin bajar el archivo grande" })
  async getProof(
    @Param("printAssetId", new ParseUUIDPipe()) printAssetId: string,
    @Res() res: Response,
  ): Promise<void> {
    const file = await this.admin.readPrintAssetFile(printAssetId, "proof");
    res.setHeader("Content-Type", file.contentType);
    res.setHeader("Content-Length", file.body.byteLength);
    // Privado: la prueba muestra el diseno que compro un cliente.
    res.setHeader("Cache-Control", "private, max-age=300");
    res.end(file.body);
  }

  @Get("print-assets/:printAssetId/download")
  async downloadPrintFile(
    @Param("printAssetId", new ParseUUIDPipe()) printAssetId: string,
    @Res() res: Response,
  ): Promise<void> {
    const file = await this.admin.readPrintAssetFile(printAssetId, "print");
    res.setHeader("Content-Type", file.contentType);
    res.setHeader("Content-Length", file.body.byteLength);
    res.setHeader("Content-Disposition", `attachment; filename="${file.filename}"`);
    res.end(file.body);
  }
}

/**
 * Descarga del ZIP con token firmado, fuera del guard de admin.
 *
 * Va en su propio controlador porque `@UseGuards(AdminGuard)` esta a nivel de
 * clase en el de arriba: un guard heredado que hubiera que desactivar por ruta es
 * justo el tipo de excepcion que despues alguien borra sin entender.
 */
@ApiTags("print")
@Controller("api/print")
export class PrintDownloadController {
  constructor(
    private readonly admin: AdminService,
    private readonly downloadTokens: PrintDownloadTokenService,
  ) {}

  @Get("orders/:id/bundle.zip")
  @ApiOperation({ summary: "ZIP con todo el arte de la orden (token firmado)" })
  async downloadBundle(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Query("token") token: string | undefined,
    @Res() res: Response,
  ): Promise<void> {
    this.downloadTokens.assertValid(id, token);

    const { stream, filename } = await this.admin.buildPrintBundle(id);

    res.setHeader("Content-Type", "application/zip");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    stream.pipe(res);
  }
}
