import { Inject, Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import {
  DESIGNS_REPOSITORY,
  DesignsRepository,
} from "../repositories/interfaces/designs.repository.interface";
import {
  STORAGE_PROVIDER,
  StorageProvider,
} from "../storage/interfaces/storage-provider.interface";

const DEFAULT_RETENTION_DAYS = 7;
const BATCH_SIZE = 500;

/**
 * Borra las imagenes que se subieron y nunca terminaron en una compra.
 *
 * La subida no requiere autenticacion, asi que sin esto el almacenamiento crece
 * sin techo con cada persona que abre el editor, juega un rato y se va. Es la
 * contrapartida obligatoria de tener el endpoint abierto.
 *
 * Solo toca assets sin ningun OrderItemDesign: un diseno comprado no se borra
 * nunca, por viejo que sea, porque el arte se puede tener que reimprimir.
 */
@Injectable()
export class DesignAssetSweepService {
  private readonly logger = new Logger(DesignAssetSweepService.name);

  constructor(
    @Inject(DESIGNS_REPOSITORY) private readonly designs: DesignsRepository,
    @Inject(STORAGE_PROVIDER) private readonly storage: StorageProvider,
  ) {}

  private retentionDays(): number {
    const raw = Number(process.env.DESIGN_ASSET_RETENTION_DAYS);
    return Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_RETENTION_DAYS;
  }

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async sweepScheduled(): Promise<void> {
    try {
      const removed = await this.sweep();
      if (removed > 0) {
        this.logger.log(`Barrido de huerfanos: ${removed} imagenes eliminadas`);
      }
    } catch (error) {
      // Un fallo del barrido no puede tumbar el proceso: es limpieza, no negocio.
      this.logger.error(`Barrido de huerfanos fallido: ${(error as Error).message}`);
    }
  }

  async sweep(now: Date = new Date()): Promise<number> {
    const cutoff = new Date(now.getTime() - this.retentionDays() * 24 * 60 * 60 * 1000);
    const orphans = await this.designs.findOrphanAssets(cutoff, BATCH_SIZE);
    if (orphans.length === 0) return 0;

    const deletable: string[] = [];

    for (const asset of orphans) {
      try {
        await this.storage.remove(asset.storageKey);
        await this.storage.remove(asset.previewKey);
        deletable.push(asset.id);
      } catch (error) {
        // Se conserva la fila para reintentar manana. Borrarla dejaria el objeto
        // en el bucket sin nada que lo apunte: invisible y pagandose para siempre.
        this.logger.warn(
          `No se pudieron borrar los archivos de ${asset.id}: ${(error as Error).message}`,
        );
      }
    }

    return this.designs.deleteAssets(deletable);
  }
}
