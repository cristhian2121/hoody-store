import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import golden from "./__fixtures__/print-geometry.golden.json";
import { PRINT_AREAS } from "./print-areas";
import {
  MM_PER_INCH,
  IMAGE_BASE_WIDTH_PCT,
  TEXT_REFERENCE_UNITS,
  mmToPx,
  pxToMm,
  imageDrawSizeMm,
  textFontSizeMm,
  rotatedAabb,
  clampElementToPrintArea,
  effectiveDpi,
  dpiVerdict,
} from "./print-geometry";

const label = (c: { name?: string }, fallback: string) => c.name ?? fallback;

describe("print-geometry (servidor) contra el fixture dorado", () => {
  it("las constantes coinciden con el fixture", () => {
    expect(MM_PER_INCH).toBe(golden.constants.MM_PER_INCH);
    expect(IMAGE_BASE_WIDTH_PCT).toBe(golden.constants.IMAGE_BASE_WIDTH_PCT);
    expect(TEXT_REFERENCE_UNITS).toBe(golden.constants.TEXT_REFERENCE_UNITS);
  });

  // Si alguien cambia un area en el frontend sin actualizar esta copia, el
  // servidor validaria contra un rectangulo distinto al que vio el cliente.
  it("las areas de estampado coinciden con el fixture", () => {
    for (const [category, sides] of Object.entries(golden.printAreas)) {
      for (const [side, expected] of Object.entries(sides)) {
        const actual = PRINT_AREAS[category as keyof typeof PRINT_AREAS][side as "front" | "back"];
        expect({ widthMm: actual.widthMm, heightMm: actual.heightMm }).toEqual(expected);
      }
    }
  });

  describe("mmToPx", () => {
    golden.mmToPx.forEach((c) => {
      it(`${c.mm}mm @ ${c.dpi}dpi = ${c.expected}px`, () => {
        expect(mmToPx(c.mm, c.dpi)).toBe(c.expected);
      });
    });
  });

  describe("imageDrawSizeMm", () => {
    golden.imageDrawSizeMm.forEach((c, i) => {
      it(label(c, `caso ${i}`), () => {
        const result = imageDrawSizeMm(c.areaWidthMm, c.scale, c.naturalWidth, c.naturalHeight);
        expect(result.width).toBeCloseTo(c.expected.width, 9);
        expect(result.height).toBeCloseTo(c.expected.height, 9);
      });
    });
  });

  describe("textFontSizeMm", () => {
    golden.textFontSizeMm.forEach((c, i) => {
      it(`caso ${i}: fontSize ${c.fontSize} x${c.scale} sobre ${c.areaWidthMm}mm`, () => {
        expect(textFontSizeMm(c.areaWidthMm, c.fontSize, c.scale)).toBeCloseTo(c.expected, 9);
      });
    });
  });

  describe("rotatedAabb", () => {
    golden.rotatedAabb.forEach((c, i) => {
      it(label(c, `${c.width}x${c.height} a ${c.rotationDeg} grados (caso ${i})`), () => {
        const result = rotatedAabb(c.width, c.height, c.rotationDeg);
        expect(result.width).toBeCloseTo(c.expected.width, 9);
        expect(result.height).toBeCloseTo(c.expected.height, 9);
      });
    });
  });

  describe("clampElementToPrintArea", () => {
    golden.clampElementToPrintArea.forEach((c, i) => {
      it(label(c, `caso ${i}`), () => {
        const result = clampElementToPrintArea(
          c.position,
          c.elementSizeMm,
          c.areaWidthMm,
          c.areaHeightMm,
          c.rotationDeg,
        );
        expect(result.x).toBeCloseTo(c.expected.x, 9);
        expect(result.y).toBeCloseTo(c.expected.y, 9);
      });
    });
  });

  describe("effectiveDpi", () => {
    golden.effectiveDpi.forEach((c, i) => {
      it(label(c, `caso ${i}`), () => {
        expect(effectiveDpi(c.naturalWidthPx, c.drawWidthMm)).toBeCloseTo(c.expected, 6);
      });
    });
  });

  describe("dpiVerdict", () => {
    golden.dpiVerdict.forEach((c) => {
      it(`${c.dpi} dpi -> ${c.expected}`, () => {
        expect(dpiVerdict(c.dpi)).toBe(c.expected);
      });
    });
  });
});

/**
 * El fixture existe en dos copias porque los proyectos tienen lockfiles
 * separados. Que ambas suites pasen no basta: si alguien edita una sola copia,
 * cada suite sigue verde contra su propio archivo y las implementaciones se
 * separan en silencio, que es exactamente el fallo que el fixture existe para
 * evitar.
 */
describe("las dos copias del fixture no se separaron", () => {
  const backCopy = resolve(__dirname, "__fixtures__/print-geometry.golden.json");
  const frontCopy = resolve(
    process.cwd(),
    "../front/src/lib/utils/__fixtures__/print-geometry.golden.json",
  );

  const bothPresent = existsSync(frontCopy);

  // En la imagen de Docker el contexto de build es solo back/, asi que la copia
  // del frontend no existe. Se omite en vez de fallar: la comparacion importa
  // en el repo, que es donde se editan los archivos.
  (bothPresent ? it : it.skip)("son byte a byte identicas", () => {
    expect(readFileSync(backCopy)).toEqual(readFileSync(frontCopy));
  });
});

describe("propiedades que el fixture no cubre", () => {
  it("mmToPx y pxToMm son inversas dentro del redondeo", () => {
    for (const mm of [10, 84.6, 260, 280, 400]) {
      expect(pxToMm(mmToPx(mm, 300), 300)).toBeCloseTo(mm, 1);
    }
  });

  it("el clamp deja siempre el elemento dentro del area", () => {
    const area = { widthMm: 280, heightMm: 400 };
    for (const x of [-500, -1, 0, 33, 50, 99, 101, 900]) {
      for (const y of [-500, 0, 50, 100, 900]) {
        for (const rotation of [0, 30, 45, 90, 137, 180]) {
          const size = { width: 60, height: 40 };
          const clamped = clampElementToPrintArea(
            { x, y },
            size,
            area.widthMm,
            area.heightMm,
            rotation,
          );
          const aabb = rotatedAabb(size.width, size.height, rotation);
          const halfW = (aabb.width / area.widthMm) * 50;
          const halfH = (aabb.height / area.heightMm) * 50;

          expect(clamped.x).toBeGreaterThanOrEqual(halfW - 1e-9);
          expect(clamped.x).toBeLessThanOrEqual(100 - halfW + 1e-9);
          expect(clamped.y).toBeGreaterThanOrEqual(halfH - 1e-9);
          expect(clamped.y).toBeLessThanOrEqual(100 - halfH + 1e-9);
        }
      }
    }
  });

  it("el clamp es idempotente", () => {
    const size = { width: 200, height: 120 };
    const once = clampElementToPrintArea({ x: 5, y: 95 }, size, 280, 400, 20);
    const twice = clampElementToPrintArea(once, size, 280, 400, 20);
    expect(twice).toEqual(once);
  });

  it("un elemento mas grande que el area se centra", () => {
    expect(
      clampElementToPrintArea({ x: 10, y: 90 }, { width: 999, height: 999 }, 280, 400),
    ).toEqual({ x: 50, y: 50 });
  });
});
