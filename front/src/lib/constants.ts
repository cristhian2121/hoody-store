import type { ProductCategory, PrintSide, Gender } from "./types";

export type HorizontalPosition = "left" | "center" | "right";
export type VerticalPosition = "top" | "middle" | "bottom";

export const POSITION_MAP: Record<
  "horizontal" | "vertical",
  Record<string, number>
> = {
  horizontal: { left: 25, center: 50, right: 75 },
  vertical: { top: 30, middle: 50, bottom: 70 },
};

export const HORIZONTAL_POSITIONS: HorizontalPosition[] = [
  "left",
  "center",
  "right",
];

export const VERTICAL_POSITIONS: VerticalPosition[] = ["middle"]; // ["top", "middle", "bottom"];

export const PRINT_AREAS: Record<
  ProductCategory,
  Record<
    PrintSide,
    { top: string; bottom: string; left: string; right: string }
  >
> = {
  hoodies: {
    front: { top: "41%", bottom: "30%", left: "32%", right: "32%" },
    back: { top: "30%", bottom: "41%", left: "32%", right: "32%" },
  },
  camisetas: {
    front: { top: "28%", bottom: "22%", left: "25%", right: "25%" },
    back: { top: "28%", bottom: "22%", left: "25%", right: "25%" },
  },
};

export const FONTS = [
  "Plus Jakarta Sans",
  "Arial",
  "Georgia",
  "Courier New",
  "Impact",
  "Comic Sans MS",
] as const;

export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export const ALLOWED_IMAGE_TYPES = [
  "image/png",
  "image/jpeg",
  "image/svg+xml",
] as const;

export const SIZE_DATA: Record<
  ProductCategory,
  Record<
    Gender,
    Record<string, { chest: string; length: string; shoulder: string }>
  >
> = {
  hoodies: {
    hombre: {
      S: { chest: "96", length: "68", shoulder: "44" },
      M: { chest: "102", length: "70", shoulder: "46" },
      L: { chest: "108", length: "72", shoulder: "48" },
      XL: { chest: "114", length: "74", shoulder: "50" },
      XXL: { chest: "120", length: "76", shoulder: "52" },
    },
    mujer: {
      XS: { chest: "84", length: "60", shoulder: "38" },
      S: { chest: "90", length: "62", shoulder: "40" },
      M: { chest: "96", length: "64", shoulder: "42" },
      L: { chest: "102", length: "66", shoulder: "44" },
      XL: { chest: "108", length: "68", shoulder: "46" },
    },
  },
  camisetas: {
    hombre: {
      S: { chest: "92", length: "70", shoulder: "43" },
      M: { chest: "98", length: "72", shoulder: "45" },
      L: { chest: "104", length: "74", shoulder: "47" },
      XL: { chest: "110", length: "76", shoulder: "49" },
      XXL: { chest: "116", length: "78", shoulder: "51" },
    },
    mujer: {
      XS: { chest: "80", length: "60", shoulder: "36" },
      S: { chest: "86", length: "62", shoulder: "38" },
      M: { chest: "92", length: "64", shoulder: "40" },
      L: { chest: "98", length: "66", shoulder: "42" },
      XL: { chest: "104", length: "68", shoulder: "44" },
    },
  },
};

export const POSITION_TOLERANCE = 6;

export const BLUR_DELAY_MS = 150;

export const IMAGE_MAX_DIMENSION = 800;

export const DEFAULT_TEXT_CONTENT = "Tu texto";

export const DEFAULT_TEXT_POSITION = { x: 50, y: 60 };

export const DEFAULT_IMAGE_POSITION = { x: 50, y: 50 };

export const DEFAULT_SCALE = 1;

export const DEFAULT_ROTATION = 0;

export const DEFAULT_FONT_SIZE = 24;

export const DEFAULT_TEXT_COLOR = "#ffffff";

export const GARMENT_COLORS: Record<
  ProductCategory,
  { id: string; name: { es: string; en: string }; hex: string }[]
> = {
  hoodies: [
    { id: "negro", name: { es: "Negro", en: "Black" }, hex: "#1a1a1a" },
    { id: "gris", name: { es: "Gris", en: "Gray" }, hex: "#9ca3af" },
    {
      id: "verde",
      name: { es: "Verde oscuro", en: "Dark Green" },
      hex: "#166534",
    },
    { id: "rojo", name: { es: "Rojo", en: "Red" }, hex: "#ff0000" },
    { id: "azul", name: { es: "Azul", en: "Blue" }, hex: "#0000ff" },
  ],
  camisetas: [
    { id: "negro", name: { es: "Negro", en: "Black" }, hex: "#1a1a1a" },
    { id: "gris", name: { es: "Gris", en: "Gray" }, hex: "#9ca3af" },
    { id: "oliva", name: { es: "Oliva", en: "Olive" }, hex: "#6b7c3e" },
  ],
};
