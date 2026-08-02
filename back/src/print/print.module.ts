import { Logger, Module, OnModuleInit } from "@nestjs/common";
import { assertFontFilesExist, FONTS_DIR, SUPPORTED_FONT_FAMILIES } from "./fonts/font-registry";

@Module({})
export class PrintModule implements OnModuleInit {
  private readonly logger = new Logger(PrintModule.name);

  onModuleInit() {
    // Falla al arrancar, no al renderizar el arte de una orden ya pagada.
    assertFontFilesExist();
    this.logger.log(
      `Fuentes de impresion verificadas en ${FONTS_DIR}: ${SUPPORTED_FONT_FAMILIES.join(", ")}`,
    );
  }
}
