import { describe, it, expect } from "vitest";
import golden from "./__fixtures__/print-geometry.golden.json";
import { PRINT_AREAS } from "../constants";
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
  imageWidthCqw,
  textFontSizeCqw,
} from "./print-geometry";

const label = (c: { name?: string }, fallback: string) => c.name ?? fallback;

describe("print-geometry contra el fixture dorado", () => {
  it("las constantes coinciden con el fixture", () => {
    expect(MM_PER_INCH).toBe(golden.constants.MM_PER_INCH);
    expect(IMAGE_BASE_WIDTH_PCT).toBe(golden.constants.IMAGE_BASE_WIDTH_PCT);
    expect(TEXT_REFERENCE_UNITS).toBe(golden.constants.TEXT_REFERENCE_UNITS);
  });

  // Si alguien cambia un area en constants.ts sin actualizar el fixture, el
  // backend seguiria renderizando con la medida vieja.
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
      it(label(c, `${c.width}x${c.height} rotado ${c.rotationDeg}deg`), () => {
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
      it(`${c.dpi}dpi = ${c.expected}`, () => {
        expect(dpiVerdict(c.dpi)).toBe(c.expected);
      });
    });
  });
});

describe("propiedades de print-geometry", () => {
  it("mmToPx y pxToMm son inversas", () => {
    for (const mm of [10, 50, 100, 260, 280, 400]) {
      expect(pxToMm(mmToPx(mm, 300), 300)).toBeCloseTo(mm, 1);
    }
  });

  it("la caja envolvente nunca encoge respecto al rectangulo original", () => {
    for (let deg = 0; deg <= 180; deg += 15) {
      const box = rotatedAabb(100, 40, deg);
      expect(box.width).toBeGreaterThanOrEqual(Math.min(100, 40) - 1e-9);
      expect(box.height).toBeGreaterThanOrEqual(Math.min(100, 40) - 1e-9);
    }
  });

  // Esta es la propiedad que impide que un diseno termine sobre la manga.
  it("el resultado del clamp siempre queda dentro del area", () => {
    const areaW = 280;
    const areaH = 400;
    const size = { width: 100, height: 60 };

    for (const x of [-50, 0, 25, 50, 75, 100, 150]) {
      for (const y of [-50, 0, 50, 100, 150]) {
        const result = clampElementToPrintArea({ x, y }, size, areaW, areaH, 0);
        const halfW = (size.width / areaW) * 50;
        const halfH = (size.height / areaH) * 50;
        expect(result.x).toBeGreaterThanOrEqual(halfW - 1e-9);
        expect(result.x).toBeLessThanOrEqual(100 - halfW + 1e-9);
        expect(result.y).toBeGreaterThanOrEqual(halfH - 1e-9);
        expect(result.y).toBeLessThanOrEqual(100 - halfH + 1e-9);
      }
    }
  });

  it("el clamp es idempotente", () => {
    const size = { width: 140, height: 100 };
    const once = clampElementToPrintArea({ x: 0, y: 0 }, size, 280, 400, 30);
    const twice = clampElementToPrintArea(once, size, 280, 400, 30);
    expect(twice).toEqual(once);
  });

  // El tamano impreso solo debe depender del area y del scale, nunca del ancho
  // de la pantalla: ese era exactamente el bug de `w-28 sm:w-36`.
  it("el tamano dibujado escala linealmente con scale", () => {
    const a = imageDrawSizeMm(280, 1, 1000, 500);
    const b = imageDrawSizeMm(280, 2, 1000, 500);
    expect(b.width).toBeCloseTo(a.width * 2, 9);
    expect(b.height).toBeCloseTo(a.height * 2, 9);
  });

  // jsdom descarta las unidades de container query, asi que estas dos funciones
  // no se pueden verificar leyendo el DOM. Se prueban aqui, en el mismo lugar
  // donde se calculan.
  describe("unidades de pantalla", () => {
    it("el ancho de la imagen en cqw es proporcional al scale", () => {
      expect(imageWidthCqw(1)).toBe(60);
      expect(imageWidthCqw(1.5)).toBe(90);
      expect(imageWidthCqw(0.5)).toBe(30);
      expect(imageWidthCqw(2)).toBe(120);
    });

    it("el tamano de texto en cqw sale de fontSize y scale", () => {
      expect(textFontSizeCqw(24, 1)).toBe(6);
      expect(textFontSizeCqw(24, 2)).toBe(12);
      expect(textFontSizeCqw(48, 1)).toBe(12);
      expect(textFontSizeCqw(8, 0.5)).toBe(1);
    });

    // Esta es la equivalencia que garantiza que el preview y el archivo
    // impreso coincidan: el mismo porcentaje del area en ambos mundos.
    it("cqw y mm describen la misma fraccion del area", () => {
      for (const areaWidthMm of [260, 280]) {
        for (const scale of [0.5, 1, 2]) {
          const mm = imageDrawSizeMm(areaWidthMm, scale, 1000, 1000).width;
          expect((mm / areaWidthMm) * 100).toBeCloseTo(imageWidthCqw(scale), 9);
        }
      }
      for (const areaWidthMm of [260, 280]) {
        for (const fontSize of [8, 24, 72]) {
          const mm = textFontSizeMm(areaWidthMm, fontSize, 1.5);
          expect((mm / areaWidthMm) * 100).toBeCloseTo(textFontSizeCqw(fontSize, 1.5), 9);
        }
      }
    });
  });

  it("agrandar el diseno baja el dpi efectivo", () => {
    const small = imageDrawSizeMm(280, 0.5, 1000, 1000);
    const big = imageDrawSizeMm(280, 2, 1000, 1000);
    expect(effectiveDpi(1000, small.width)).toBeGreaterThan(effectiveDpi(1000, big.width));
  });
});
