import { Injectable, Logger } from "@nestjs/common";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join, resolve, sep } from "node:path";
import {
  assertSafeStorageKey,
  StorageProvider,
} from "../interfaces/storage-provider.interface";

/**
 * Almacenamiento en disco local. Es el driver por defecto a proposito: hace que
 * `docker compose up` funcione sin credenciales de ningun bucket.
 *
 * La raiz esta FUERA de `public/`, que se sirve estaticamente en /static. Los
 * masters de diseno no deben ser descargables por cualquiera que adivine una
 * ruta; el preview se entrega por un endpoint que si es publico a proposito.
 */
@Injectable()
export class LocalDiskStorageProvider implements StorageProvider {
  private readonly logger = new Logger(LocalDiskStorageProvider.name);
  private readonly root: string;

  constructor() {
    this.root = resolve(process.cwd(), process.env.STORAGE_LOCAL_ROOT || "var/storage");
    this.logger.log(`Almacenamiento local en ${this.root}`);
  }

  private pathFor(key: string): string {
    assertSafeStorageKey(key);
    const full = resolve(join(this.root, key));
    // Segunda barrera, independiente del regex: aunque la clave pasara la
    // validacion, el resultado tiene que quedar dentro de la raiz.
    if (full !== this.root && !full.startsWith(this.root + sep)) {
      throw new Error(`Clave de almacenamiento fuera de la raiz: ${key}`);
    }
    return full;
  }

  async put(key: string, body: Buffer, _contentType: string): Promise<void> {
    const path = this.pathFor(key);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, body);
  }

  async get(key: string): Promise<Buffer> {
    return readFile(this.pathFor(key));
  }

  async remove(key: string): Promise<void> {
    await rm(this.pathFor(key), { force: true });
  }

  async exists(key: string): Promise<boolean> {
    return existsSync(this.pathFor(key));
  }
}
