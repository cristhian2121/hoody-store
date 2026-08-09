import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import type { ReactNode } from "react";
import { CartProvider, useCart } from "./cart";
import type { CartItem } from "./types";

vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

const wrapper = ({ children }: { children: ReactNode }) => <CartProvider>{children}</CartProvider>;

const item = (overrides: Partial<CartItem> = {}) =>
  ({
    variantId: "variant-1",
    productId: "p1",
    slug: "hoodie-premium",
    name: { es: "Hoodie", en: "Hoodie" },
    price: 119900,
    gender: "hombre",
    size: "M",
    color: { id: "negro", name: { es: "Negro", en: "Black" }, hex: "#000" },
    image: "https://api.test/static/products/hoodie-black.jpg",
    category: "hoodies",
    ...overrides,
  }) as Omit<CartItem, "cartItemId" | "quantity">;

describe("CartProvider: almacenamiento", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("guarda bajo app-cart-v2", () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    act(() => result.current.addItem(item()));

    expect(JSON.parse(localStorage.getItem("app-cart-v2") as string)).toHaveLength(1);
  });

  // Los carritos v1 guardaban la imagen del diseno como data URL y sus URLs de
  // producto tenian hash de Vite: no hay nada rescatable, y arrastrarlos seria
  // arrastrar justo los megabytes que este cambio elimina.
  it("descarta un carrito v1 sin dejar restos", () => {
    localStorage.setItem(
      "app-cart",
      JSON.stringify([{ cartItemId: "viejo", personalization: { front: { image: { src: "data:image/jpeg;base64,AAAA" } } } }]),
    );

    const { result } = renderHook(() => useCart(), { wrapper });

    expect(result.current.items).toEqual([]);
    expect(localStorage.getItem("app-cart")).toBeNull();
  });

  it("sobrevive a un valor corrupto en localStorage", () => {
    localStorage.setItem("app-cart-v2", "{no es json");
    const { result } = renderHook(() => useCart(), { wrapper });
    expect(result.current.items).toEqual([]);
  });

  it("ignora un valor que no sea una lista", () => {
    localStorage.setItem("app-cart-v2", JSON.stringify({ items: [] }));
    const { result } = renderHook(() => useCart(), { wrapper });
    expect(result.current.items).toEqual([]);
  });

  // Antes esto era una excepcion sin capturar dentro de un effect de render:
  // React desmontaba el arbol y el cliente veia una pantalla en blanco.
  it("suma cantidad en vez de duplicar cuando es la misma variante", () => {
    const { result } = renderHook(() => useCart(), { wrapper });

    act(() => result.current.addItem(item()));
    act(() => result.current.addItem(item()));

    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0].quantity).toBe(2);
  });

  it("mantiene separadas dos variantes distintas", () => {
    const { result } = renderHook(() => useCart(), { wrapper });

    act(() => result.current.addItem(item({ variantId: "variant-1" })));
    act(() => result.current.addItem(item({ variantId: "variant-2" })));

    expect(result.current.items).toHaveLength(2);
  });

  // Cada linea personalizada lleva su propio diseno: fusionarlas borraria uno.
  it("nunca fusiona lineas personalizadas", () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    const personalization = {
      front: { image: null, texts: [] },
      back: { image: null, texts: [] },
    };

    act(() => result.current.addItem(item({ personalization })));
    act(() => result.current.addItem(item({ personalization })));

    expect(result.current.items).toHaveLength(2);
  });

  it("no revienta cuando localStorage esta lleno", async () => {
    const { toast } = await import("sonner");
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("exceeded the quota", "QuotaExceededError");
    });

    const { result } = renderHook(() => useCart(), { wrapper });
    expect(() => act(() => result.current.addItem(item()))).not.toThrow();

    expect(result.current.items).toHaveLength(1);
    expect(toast.error).toHaveBeenCalled();
  });
});
