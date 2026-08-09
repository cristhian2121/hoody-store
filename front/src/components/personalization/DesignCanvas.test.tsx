import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { createRef } from "react";
import { LanguageProvider } from "@/lib/i18n";
import { PRINT_AREAS } from "@/lib/constants";
import { DesignCanvas } from "./DesignCanvas";
import type { DesignLayer } from "@/lib/types";

const layer = (overrides: Partial<DesignLayer> = {}): DesignLayer => ({
  image: {
    assetId: "6f1c2a90-0000-4000-8000-000000000001",
    previewUrl: "https://api.test/api/uploads/design-image/6f1c2a90/preview",
    naturalWidth: 1500,
    naturalHeight: 900,
    hasAlpha: true,
    x: 50,
    y: 50,
    scale: 1,
    rotation: 0,
  },
  texts: [
    {
      id: "t1",
      content: "Hola",
      x: 50,
      y: 70,
      fontFamily: "Plus Jakarta Sans",
      fontSize: 24,
      color: "#ffffff",
      bold: false,
      italic: false,
      scale: 1,
      rotation: 0,
    },
  ],
  ...overrides,
});

const renderCanvas = (props: Partial<Parameters<typeof DesignCanvas>[0]> = {}) =>
  render(
    <LanguageProvider>
      <DesignCanvas
        category="camisetas"
        garmentColor="#1a1a1a"
        activeSide="front"
        currentLayer={layer()}
        selectedTextId={null}
        containerRef={createRef<HTMLDivElement>()}
        onPointerMove={() => {}}
        onPointerUp={() => {}}
        onImagePointerDown={() => {}}
        onTextPointerDown={() => {}}
        {...props}
      />
    </LanguageProvider>,
  );

describe("DesignCanvas: preview determinista", () => {
  // El bug original: `w-28 sm:w-36` hacia que el diseno cambiara de tamano al
  // cruzar un breakpoint, asi que lo que veia el cliente en el celular no era
  // lo que veia en el escritorio ni lo que se iba a imprimir.
  it("la imagen no usa clases de ancho dependientes del breakpoint", () => {
    const { container } = renderCanvas();
    const img = container.querySelector("img[alt='Design']") as HTMLElement;

    expect(img.className).not.toMatch(/\bw-\d+\b/);
    expect(img.className).not.toMatch(/\bsm:|md:|lg:|xl:/);
    expect(img.className).toContain("w-full");
  });

  it("ningun estilo del diseno depende del viewport", () => {
    const { container } = renderCanvas();
    const styled = [...container.querySelectorAll("[style]")] as HTMLElement[];
    const offenders = styled.filter((el) => /\d(vw|vh|vmin|vmax)\b/.test(el.getAttribute("style") ?? ""));
    expect(offenders).toHaveLength(0);
  });

  // Si el aspect-ratio no sale de los milimetros, la caja en pantalla puede
  // contradecir al rectangulo fisico y el preview vuelve a mentir.
  it("el area de estampado toma su aspect-ratio de los milimetros reales", () => {
    const { container } = renderCanvas({ category: "camisetas", activeSide: "front" });
    const area = PRINT_AREAS.camisetas.front;
    const box = [...container.querySelectorAll("div")].find((d) => d.style.aspectRatio);

    expect(box?.style.aspectRatio).toBe(`${area.widthMm} / ${area.heightMm}`);
    expect(box?.style.containerType).toBe("inline-size");
  });

  it("cada categoria y lado usa su propia area fisica", () => {
    for (const category of ["hoodies", "camisetas"] as const) {
      for (const side of ["front", "back"] as const) {
        const { container, unmount } = renderCanvas({ category, activeSide: side });
        const area = PRINT_AREAS[category][side];
        const box = [...container.querySelectorAll("div")].find((d) => d.style.aspectRatio);
        expect(box?.style.aspectRatio).toBe(`${area.widthMm} / ${area.heightMm}`);
        unmount();
      }
    }
  });

  // DTF deposita tinta opaca sobre una base blanca: `multiply` fundia el diseno
  // con la foto de la prenda y mostraba algo que la impresion no reproduce.
  it("no usa mix-blend-mode en el diseno", () => {
    const { container } = renderCanvas();
    const styled = [...container.querySelectorAll("[style]")] as HTMLElement[];
    const blended = styled.filter((el) => el.style.mixBlendMode);
    expect(blended).toHaveLength(0);
  });

  // El editor muestra el derivado de 600 px, nunca un data URL: el original
  // vive en el servidor y meterlo en el estado seria volver a la bomba de
  // localStorage que este cambio elimina.
  it("pinta el preview servido, no una imagen embebida", () => {
    const { container } = renderCanvas();
    const img = container.querySelector("img[alt='Design']") as HTMLImageElement;

    expect(img.getAttribute("src")).toBe(
      "https://api.test/api/uploads/design-image/6f1c2a90/preview",
    );
    expect(img.getAttribute("src")).not.toMatch(/^data:/);
  });

  it("el area recorta lo que se salga", () => {
    const { container } = renderCanvas();
    const box = [...container.querySelectorAll("div")].find((d) => d.style.aspectRatio);
    expect(box?.className).toContain("overflow-hidden");
  });
});
