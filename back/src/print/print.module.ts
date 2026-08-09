import { Logger, Module, OnModuleInit } from "@nestjs/common";
import { assertFontFilesExist, FONTS_DIR, SUPPORTED_FONT_FAMILIES } from "./fonts/font-registry";
import { DesignValidationService } from "./design-validation.service";
import { PrintDownloadTokenService } from "./print-download-token.service";
import { PrintFileRendererService } from "./services/print-file-renderer.service";
import { PrintWorkerService } from "./services/print-worker.service";
import { UploadsModule } from "../uploads/uploads.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { PrintAssetsRepositoryPrisma } from "../repositories/prisma/print-assets.repository";
import { PRINT_ASSETS_REPOSITORY } from "../repositories/interfaces/print-assets.repository.interface";
import { OrdersRepository } from "../repositories/prisma/orders.repository";
import { configureSharpRuntime } from "../config/sharp-runtime";

@Module({
  // UploadsModule exporta DESIGNS_REPOSITORY, que la validacion necesita para
  // confirmar que la imagen referenciada existe de verdad. NotificationsModule
  // es para avisar cuando el arte de una orden queda completo.
  imports: [UploadsModule, NotificationsModule],
  providers: [
    DesignValidationService,
    PrintFileRendererService,
    PrintWorkerService,
    PrintDownloadTokenService,
    {
      provide: PRINT_ASSETS_REPOSITORY,
      useClass: PrintAssetsRepositoryPrisma,
    },
    {
      provide: "OrderRepository",
      useClass: OrdersRepository,
    },
  ],
  exports: [
    DesignValidationService,
    PrintFileRendererService,
    PrintDownloadTokenService,
    PRINT_ASSETS_REPOSITORY,
  ],
})
export class PrintModule implements OnModuleInit {
  private readonly logger = new Logger(PrintModule.name);

  onModuleInit() {
    // Falla al arrancar, no al renderizar el arte de una orden ya pagada.
    assertFontFilesExist();
    configureSharpRuntime();
    this.logger.log(
      `Fuentes de impresion verificadas en ${FONTS_DIR}: ${SUPPORTED_FONT_FAMILIES.join(", ")}`,
    );
  }
}
