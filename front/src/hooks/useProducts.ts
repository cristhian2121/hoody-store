import { useQuery } from "@tanstack/react-query";
import { fetchProduct, fetchProducts } from "@/lib/products";
import type { ProductCategory } from "@/lib/types";

/**
 * Catalogo con react-query.
 *
 * QueryClientProvider ya estaba montado en App.tsx sin que nada lo usara, asi
 * que el catalogo sale gratis de cache: la portada, la categoria y la ficha
 * comparten la misma lista y no la vuelven a pedir en cada navegacion.
 *
 * `staleTime` de 5 minutos: los precios cambian de vez en cuando y el checkout
 * los revalida contra la base igual, asi que servir datos de hace un rato es
 * seguro; en el peor caso el cliente ve un precio viejo y el servidor le avisa.
 */
const STALE_TIME_MS = 5 * 60 * 1000;

export const productsQueryKey = (category?: ProductCategory) =>
  ["products", category ?? "all"] as const;

export const productQueryKey = (slug: string) => ["product", slug] as const;

export const useProducts = (category?: ProductCategory) =>
  useQuery({
    queryKey: productsQueryKey(category),
    queryFn: () => fetchProducts(category),
    staleTime: STALE_TIME_MS,
  });

export const useProduct = (slug: string | undefined) =>
  useQuery({
    queryKey: productQueryKey(slug ?? ""),
    queryFn: () => fetchProduct(slug as string),
    enabled: Boolean(slug),
    staleTime: STALE_TIME_MS,
    // Un slug que no existe no mejora reintentando.
    retry: (failureCount, error) =>
      error instanceof Error && error.message === "Producto no encontrado" ? false : failureCount < 2,
  });
