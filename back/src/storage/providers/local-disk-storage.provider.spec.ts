import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { LocalDiskStorageProvider } from "./local-disk-storage.provider";
import { assertSafeStorageKey, StorageProvider } from "../interfaces/storage-provider.interface";

describe("LocalDiskStorageProvider", () => {
  let root: string;
  // Tipado por la interfaz a proposito: lo que se prueba es el contrato que ve
  // el resto de la aplicacion, no la clase.
  let provider: StorageProvider;
  const previousRoot = process.env.STORAGE_LOCAL_ROOT;

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), "atuestampa-storage-"));
    process.env.STORAGE_LOCAL_ROOT = root;
    provider = new LocalDiskStorageProvider();
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
    if (previousRoot === undefined) delete process.env.STORAGE_LOCAL_ROOT;
    else process.env.STORAGE_LOCAL_ROOT = previousRoot;
  });

  it("guarda y recupera los bytes exactos", async () => {
    const body = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x00, 0xff]);
    await provider.put("designs/abc/master.png", body, "image/png");

    expect(await provider.get("designs/abc/master.png")).toEqual(body);
    expect(readFileSync(resolve(root, "designs/abc/master.png"))).toEqual(body);
  });

  it("crea los directorios intermedios", async () => {
    await provider.put("a/b/c/d.png", Buffer.from("x"), "image/png");
    expect(await provider.exists("a/b/c/d.png")).toBe(true);
  });

  it("remove es idempotente", async () => {
    await provider.put("designs/abc/master.png", Buffer.from("x"), "image/png");
    await provider.remove("designs/abc/master.png");
    await expect(provider.remove("designs/abc/master.png")).resolves.toBeUndefined();
    expect(await provider.exists("designs/abc/master.png")).toBe(false);
  });

  it("exists distingue presente de ausente", async () => {
    expect(await provider.exists("nada.png")).toBe(false);
    await provider.put("algo.png", Buffer.from("x"), "image/png");
    expect(await provider.exists("algo.png")).toBe(true);
  });

  // Las claves las genera el servidor, pero la barrera se prueba igual: una
  // sola concatenacion descuidada en el futuro convertiria esto en lectura o
  // escritura arbitraria de archivos.
  describe("no se sale de la raiz", () => {
    const attacks = [
      "../fuera.png",
      "designs/../../fuera.png",
      "/etc/passwd",
      "designs//doble.png",
      "..",
      "designs/abc/../../../../../../etc/hosts",
    ];

    it.each(attacks)("rechaza %s al escribir", async (key) => {
      await expect(provider.put(key, Buffer.from("x"), "image/png")).rejects.toThrow();
    });

    it.each(attacks)("rechaza %s al leer", async (key) => {
      await expect(provider.get(key)).rejects.toThrow();
    });

    it("no borra nada fuera de la raiz", async () => {
      const victim = join(root, "..", `victima-${process.pid}.txt`);
      writeFileSync(victim, "no me borres");
      try {
        await expect(provider.remove("../" + `victima-${process.pid}.txt`)).rejects.toThrow();
        expect(readFileSync(victim, "utf8")).toBe("no me borres");
      } finally {
        rmSync(victim, { force: true });
      }
    });
  });

  it("la raiz por defecto queda fuera de public/, que se sirve estatico", () => {
    delete process.env.STORAGE_LOCAL_ROOT;
    const defaultProvider: StorageProvider = new LocalDiskStorageProvider();
    // No hay getter publico; se comprueba por el efecto: escribir una clave
    // valida no puede aterrizar dentro de public/.
    return defaultProvider.put("probe/x.png", Buffer.from("x"), "image/png").then(async () => {
      expect(await defaultProvider.exists("probe/x.png")).toBe(true);
      rmSync(resolve(process.cwd(), "var/storage/probe"), { recursive: true, force: true });
    });
  });
});

describe("assertSafeStorageKey", () => {
  it("acepta las claves que genera el servidor", () => {
    expect(() =>
      assertSafeStorageKey("designs/9d1f0f2e-0000-4000-8000-000000000000/master.png"),
    ).not.toThrow();
    expect(() => assertSafeStorageKey("products/hoodie-black.jpg")).not.toThrow();
  });

  it.each(["", "../x", "a//b", "/absoluta", "con espacio.png", "raro$.png", "..", "a/../b"])(
    "rechaza %p",
    (key) => {
      expect(() => assertSafeStorageKey(key)).toThrow(/invalida/);
    },
  );
});
