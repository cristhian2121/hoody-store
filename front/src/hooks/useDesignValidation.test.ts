import { describe, it, expect } from "vitest";
import { evaluateLayer } from "./useDesignValidation";
import type { DesignLayer, ImageElement } from "@/lib/types";
import { PRINT_AREAS } from "@/lib/constants";

const image = (overrides: Partial<ImageElement> = {}): ImageElement => ({
  assetId: "a1",
  previewUrl: "https://api.test/preview",
  naturalWidth: 1500,
  naturalHeight: 900,
  hasAlpha: true,
  x: 50,
  y: 50,
  scale: 1,
  rotation: 0,
  ...overrides,
});

const layer = (img: ImageElement | null): DesignLayer => ({ image: img, texts: [] });

describe("evaluateLayer", () => {
  it("no dice nada cuando no hay imagen", () => {
    expect(evaluateLayer(layer(null), "camisetas", "front")).toBeNull();
  });

  // El frente de camiseta mide 280 mm; con scale 1 la imagen ocupa el 60%, es
  // decir 168 mm. Una imagen de 1500 px repartida en 168 mm da ~227 dpi.
  it("calcula el tamano fisico y el dpi resultante", () => {
    const quality = evaluateLayer(layer(image()), "camisetas", "front");

    expect(quality?.drawWidthMm).toBeCloseTo(168, 5);
    expect(quality?.drawHeightMm).toBeCloseTo(100.8, 5);
    expect(quality?.dpi).toBeCloseTo(226.79, 1);
    expect(quality?.verdict).toBe("ok");
  });

  // Es el caso que motiva todo el aviso: la misma imagen que se veia perfecta
  // se degrada al agrandarla, y en pantalla no se nota.
  it("la misma imagen empeora a medida que crece el estampado", () => {
    const verdicts = [1, 1.3, 2, 3].map(
      (scale) => evaluateLayer(layer(image({ scale })), "camisetas", "front")?.verdict,
    );

    expect(verdicts).toEqual(["ok", "warn", "poor", "block"]);
  });

  it("un area mas ancha baja el dpi para la misma escala", () => {
    const front = evaluateLayer(layer(image({ scale: 1 })), "hoodies", "front");
    const back = evaluateLayer(layer(image({ scale: 1 })), "hoodies", "back");

    expect(PRINT_AREAS.hoodies.back.widthMm).toBeGreaterThan(PRINT_AREAS.hoodies.front.widthMm);
    expect(back!.dpi).toBeLessThan(front!.dpi);
  });

  it("propaga si la imagen tiene transparencia real", () => {
    expect(evaluateLayer(layer(image({ hasAlpha: false })), "camisetas", "front")?.hasAlpha).toBe(
      false,
    );
    expect(evaluateLayer(layer(image({ hasAlpha: true })), "camisetas", "front")?.hasAlpha).toBe(
      true,
    );
  });

  it("conserva la relacion de aspecto del original", () => {
    const quality = evaluateLayer(
      layer(image({ naturalWidth: 800, naturalHeight: 1600 })),
      "camisetas",
      "front",
    );

    expect(quality!.drawHeightMm / quality!.drawWidthMm).toBeCloseTo(2, 5);
  });
});
