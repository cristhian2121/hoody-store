import { Module, OnModuleInit } from "@nestjs/common";
import { UploadsController } from "./uploads.controller";
import { DesignImageService } from "./design-image.service";
import { DesignAssetSweepService } from "./design-asset-sweep.service";
import { DesignsRepositoryPrisma } from "../repositories/prisma/designs.repository";
import { DESIGNS_REPOSITORY } from "../repositories/interfaces/designs.repository.interface";
import { configureSharpRuntime } from "../config/sharp-runtime";

@Module({
  controllers: [UploadsController],
  providers: [
    DesignImageService,
    DesignAssetSweepService,
    {
      provide: DESIGNS_REPOSITORY,
      useClass: DesignsRepositoryPrisma,
    },
  ],
  exports: [DesignImageService, DESIGNS_REPOSITORY],
})
export class UploadsModule implements OnModuleInit {
  onModuleInit() {
    configureSharpRuntime();
  }
}
