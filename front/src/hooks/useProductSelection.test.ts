import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useProductSelection } from "./useProductSelection";
import type { Product, ProductVariant } from "@/lib/types";

const variant = (overrides: Partial<ProductVariant>): ProductVariant => ({
  id: `v-${overrides.colorId}-${overrides.gender}-${overrides.size}`,
  sku: "SKU",
  colorId: "negro",
  gender: "hombre",
  size: "M",
  price: 119900,
  available: true,
  ...overrides,
});

const product = (variants: ProductVariant[]): Product => ({
  id: "p1",
  slug: "hoodie-premium",
  category: "hoodies",
  name: { es: "Hoodie Premium", en: "Premium Hoodie" },
  description: { es: "d", en: "d" },
  priceFrom: 99900,
  images: ["a.jpg"],
  colors: [
    { id: "negro", name: { es: "Negro", en: "Black" }, hex: "#000" },
    { id: "verde", name: { es: "Verde", en: "Green" }, hex: "#0f0" },
  ],
  sizes: { hombre: ["S", "M", "L", "XL"], mujer: ["XS", "S", "M"] },
  variants,
  sizeGuide: {},
});

const setup = (variants: ProductVariant[]) =>
  renderHook(() => useProductSelection({ product: product(variants) }));

describe("useProductSelection", () => {
  // Antes las tallas salian de una tabla fija, asi que se podia agregar al
  // carrito una combinacion de color y talla que nunca se fabrico.
  it("solo ofrece tallas que existen para el genero y color elegidos", () => {
    const { result } = setup([
      variant({ colorId: "negro", gender: "hombre", size: "M" }),
      variant({ colorId: "negro", gender: "hombre", size: "L" }),
      variant({ colorId: "verde", gender: "hombre", size: "S" }),
    ]);

    expect(result.current.sizes).toEqual(["M", "L"]);

    act(() => result.current.setSelectedColorIdx(1));
    expect(result.current.sizes).toEqual(["S"]);
  });

  it("respeta el orden del catalogo y no el de las variantes", () => {
    const { result } = setup([
      variant({ size: "XL" }),
      variant({ size: "S" }),
      variant({ size: "M" }),
    ]);

    expect(result.current.sizes).toEqual(["S", "M", "XL"]);
  });

  it("ignora las variantes no disponibles", () => {
    const { result } = setup([
      variant({ size: "M" }),
      variant({ size: "L", available: false }),
    ]);

    expect(result.current.sizes).toEqual(["M"]);
  });

  it("resuelve la variante concreta al elegir talla", () => {
    const { result } = setup([
      variant({ colorId: "negro", gender: "hombre", size: "M", id: "correcta" }),
      variant({ colorId: "verde", gender: "hombre", size: "M", id: "otra" }),
    ]);

    expect(result.current.selectedVariant).toBeUndefined();
    expect(result.current.isValidSelection).toBe(false);

    act(() => result.current.setSelectedSize("M"));

    expect(result.current.selectedVariant?.id).toBe("correcta");
    expect(result.current.isValidSelection).toBe(true);
  });

  // Sin esto quedaria un boton de talla marcado sin ninguna variante detras, y
  // el boton de comprar fallaria sin explicacion.
  it("limpia la talla si deja de estar disponible al cambiar de color", () => {
    const { result } = setup([
      variant({ colorId: "negro", size: "L" }),
      variant({ colorId: "verde", size: "S" }),
    ]);

    act(() => result.current.setSelectedSize("L"));
    expect(result.current.selectedSize).toBe("L");

    act(() => result.current.setSelectedColorIdx(1));
    expect(result.current.selectedSize).toBe("");
    expect(result.current.isValidSelection).toBe(false);
  });

  it("limpia la talla al cambiar de genero", () => {
    const { result } = setup([
      variant({ gender: "hombre", size: "M" }),
      variant({ gender: "mujer", size: "M" }),
    ]);

    act(() => result.current.setSelectedSize("M"));
    act(() => result.current.setSelectedGender("mujer"));

    expect(result.current.selectedSize).toBe("");
  });

  it("muestra el 'desde' hasta que hay variante, y luego su precio", () => {
    const { result } = setup([variant({ size: "M", price: 149900 })]);

    expect(result.current.displayPrice).toBe(99900);

    act(() => result.current.setSelectedSize("M"));
    expect(result.current.displayPrice).toBe(149900);
  });

  it("no ofrece tallas cuando el color no tiene ninguna", () => {
    const { result } = setup([variant({ colorId: "negro", size: "M" })]);

    act(() => result.current.setSelectedColorIdx(1));

    expect(result.current.sizes).toEqual([]);
    expect(result.current.isValidSelection).toBe(false);
  });
});
