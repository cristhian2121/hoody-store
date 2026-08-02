import { existsSync, readFileSync } from "node:fs";
import { basename } from "node:path";
import {
  FONTS_DIR,
  SUPPORTED_FONT_FAMILIES,
  allFontFilePaths,
  assertFontFilesExist,
  getFontCapabilities,
  isSupportedFontFamily,
  listFontFiles,
  resolveFontFile,
} from "./font-registry";

describe("font-registry", () => {
  it("todos los archivos declarados existen en disco", () => {
    expect(() => assertFontFilesExist()).not.toThrow();
  });

  it("los archivos son TrueType reales, no HTML de error ni vacios", () => {
    for (const path of allFontFilePaths()) {
      const buffer = readFileSync(path);
      expect(buffer.byteLength).toBeGreaterThan(10_000);
      // sfnt version 0x00010000 = TrueType
      expect(buffer.readUInt32BE(0)).toBe(0x00010000);
    }
  });

  it("expone exactamente las cuatro familias con licencia libre", () => {
    expect(SUPPORTED_FONT_FAMILIES).toEqual([
      "Plus Jakarta Sans",
      "Bebas Neue",
      "Playfair Display",
      "Comic Neue",
    ]);
  });

  // Ninguna de estas se puede empaquetar legalmente en la imagen de Docker.
  it("no quedo ninguna fuente licenciada de Microsoft/Monotype", () => {
    for (const banned of ["Arial", "Georgia", "Courier New", "Impact", "Comic Sans MS"]) {
      expect(isSupportedFontFamily(banned)).toBe(false);
      expect(resolveFontFile(banned)).toBeNull();
    }
  });

  describe("resolveFontFile", () => {
    it("resuelve cada combinacion de estilo a un archivo distinto", () => {
      const combos = [
        [false, false],
        [true, false],
        [false, true],
        [true, true],
      ] as const;

      const paths = combos.map(([bold, italic]) =>
        resolveFontFile("Plus Jakarta Sans", bold, italic),
      );

      expect(new Set(paths).size).toBe(4);
      paths.forEach((path) => expect(existsSync(path as string)).toBe(true));
    });

    it("devuelve null para una familia desconocida", () => {
      expect(resolveFontFile("Wingdings")).toBeNull();
    });

    // Bebas Neue solo tiene un archivo: pedir negrita debe caer al regular
    // real, nunca dejar que el rasterizador sustituya por otra fuente.
    it("cae al estilo mas cercano cuando la familia no tiene ese estilo", () => {
      const regular = resolveFontFile("Bebas Neue", false, false);
      expect(resolveFontFile("Bebas Neue", true, false)).toBe(regular);
      expect(resolveFontFile("Bebas Neue", false, true)).toBe(regular);
      expect(resolveFontFile("Bebas Neue", true, true)).toBe(regular);
      expect(basename(regular as string)).toBe("bebas-neue-regular.ttf");
    });
  });

  describe("getFontCapabilities", () => {
    it("reporta que Bebas Neue no tiene negrita ni italica", () => {
      expect(getFontCapabilities("Bebas Neue")).toEqual({
        family: "Bebas Neue",
        hasBold: false,
        hasItalic: false,
      });
    });

    it("reporta las familias completas con ambos estilos", () => {
      for (const family of ["Plus Jakarta Sans", "Playfair Display", "Comic Neue"]) {
        expect(getFontCapabilities(family)).toEqual({ family, hasBold: true, hasItalic: true });
      }
    });

    it("devuelve null para una familia desconocida", () => {
      expect(getFontCapabilities("Helvetica")).toBeNull();
    });
  });

  it("no hay dos entradas para el mismo estilo de la misma familia", () => {
    const keys = listFontFiles().map((f) => `${f.family}|${f.bold}|${f.italic}`);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("la ruta de fuentes se resuelve desde la raiz del proyecto", () => {
    expect(FONTS_DIR.endsWith("assets/fonts")).toBe(true);
  });
});
