import { existsSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Mapa de (familia, negrita, italica) al archivo .ttf real.
 *
 * Debe mantenerse sincronizado con FONT_OPTIONS y fonts.css del frontend: son
 * las mismas familias, en la misma version. Cualquier desfase se traduce en un
 * estampado distinto al que aprobo el cliente.
 *
 * Se usa .ttf y no .woff2 porque el rasterizador de SVG del servidor los carga
 * sin necesidad de habilitar la descompresion de woff2.
 */

export interface FontFile {
  /** Debe coincidir exactamente con el font-family del CSS. */
  family: string;
  bold: boolean;
  italic: boolean;
  file: string;
}

export interface FontFamilyCapabilities {
  family: string;
  hasBold: boolean;
  hasItalic: boolean;
}

const FONT_FILES: FontFile[] = [
  {
    family: "Plus Jakarta Sans",
    bold: false,
    italic: false,
    file: "plus-jakarta-sans-regular.ttf",
  },
  { family: "Plus Jakarta Sans", bold: true, italic: false, file: "plus-jakarta-sans-bold.ttf" },
  { family: "Plus Jakarta Sans", bold: false, italic: true, file: "plus-jakarta-sans-italic.ttf" },
  {
    family: "Plus Jakarta Sans",
    bold: true,
    italic: true,
    file: "plus-jakarta-sans-bolditalic.ttf",
  },

  // Bebas Neue solo existe en un peso y sin italica.
  { family: "Bebas Neue", bold: false, italic: false, file: "bebas-neue-regular.ttf" },

  { family: "Playfair Display", bold: false, italic: false, file: "playfair-display-regular.ttf" },
  { family: "Playfair Display", bold: true, italic: false, file: "playfair-display-bold.ttf" },
  { family: "Playfair Display", bold: false, italic: true, file: "playfair-display-italic.ttf" },
  { family: "Playfair Display", bold: true, italic: true, file: "playfair-display-bolditalic.ttf" },

  { family: "Comic Neue", bold: false, italic: false, file: "comic-neue-regular.ttf" },
  { family: "Comic Neue", bold: true, italic: false, file: "comic-neue-bold.ttf" },
  { family: "Comic Neue", bold: false, italic: true, file: "comic-neue-italic.ttf" },
  { family: "Comic Neue", bold: true, italic: true, file: "comic-neue-bolditalic.ttf" },
];

export const FONTS_DIR = resolve(process.cwd(), "assets/fonts");

const key = (family: string, bold: boolean, italic: boolean) =>
  `${family}|${bold ? "b" : ""}${italic ? "i" : ""}`;

const byKey = new Map(FONT_FILES.map((font) => [key(font.family, font.bold, font.italic), font]));

export const SUPPORTED_FONT_FAMILIES: string[] = [...new Set(FONT_FILES.map((f) => f.family))];

export const isSupportedFontFamily = (family: string): boolean =>
  SUPPORTED_FONT_FAMILIES.includes(family);

export const getFontCapabilities = (family: string): FontFamilyCapabilities | null => {
  if (!isSupportedFontFamily(family)) return null;
  return {
    family,
    hasBold: byKey.has(key(family, true, false)),
    hasItalic: byKey.has(key(family, false, true)),
  };
};

/**
 * Ruta absoluta del archivo para un estilo.
 *
 * Si la familia no tiene ese estilo cae al mas cercano que si exista, en vez de
 * dejar que el rasterizador sustituya por una fuente cualquiera del sistema.
 * Devuelve null solo si la familia no esta soportada.
 */
export const resolveFontFile = (family: string, bold = false, italic = false): string | null => {
  const candidates = [
    key(family, bold, italic),
    key(family, bold, false),
    key(family, false, italic),
    key(family, false, false),
  ];

  for (const candidate of candidates) {
    const font = byKey.get(candidate);
    if (font) return resolve(FONTS_DIR, font.file);
  }
  return null;
};

/** Todas las rutas, para pasarselas al rasterizador con loadSystemFonts: false. */
export const allFontFilePaths = (): string[] =>
  FONT_FILES.map((font) => resolve(FONTS_DIR, font.file));

/**
 * Verifica que cada archivo exista.
 *
 * Se llama al inicializar el modulo: es preferible que la aplicacion no arranque
 * a que falle al renderizar el arte de una orden que el cliente ya pago.
 */
export const assertFontFilesExist = (): void => {
  const missing = FONT_FILES.filter((font) => !existsSync(resolve(FONTS_DIR, font.file))).map(
    (font) => font.file,
  );

  if (missing.length > 0) {
    throw new Error(
      `Faltan archivos de fuente en ${FONTS_DIR}: ${missing.join(", ")}. ` +
        "El render de impresion no puede arrancar sin ellos.",
    );
  }
};

export const listFontFiles = (): readonly FontFile[] => FONT_FILES;
