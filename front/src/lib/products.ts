import type { Product, ProductCategory, ProductSummary } from "./types";
import { ensureApiUrl } from "./api";

/**
 * Catalogo desde la API.
 *
 * Antes este archivo era el catalogo: cuatro productos escritos a mano, con las
 * fotos importadas por Vite. Eso significaba que cambiar un precio requeria un
 * despliegue, y que la URL de la foto guardada en una orden moria en el
 * siguiente build porque llevaba el hash del bundle.
 *
 * La ruta del archivo se conserva para no tocar todos los imports.
 */

const request = async <T>(path: string, notFoundMessage?: string): Promise<T> => {
  const apiUrl = ensureApiUrl();
  const response = await fetch(`${apiUrl}${path}`);

  if (response.status === 404 && notFoundMessage) {
    throw new Error(notFoundMessage);
  }
  if (!response.ok) {
    throw new Error("No pudimos cargar el catalogo. Intenta de nuevo.");
  }

  return response.json();
};

export const fetchProducts = async (category?: ProductCategory): Promise<ProductSummary[]> => {
  const query = category ? `?category=${encodeURIComponent(category)}` : "";
  const data = await request<{ products: ProductSummary[] }>(`/api/products${query}`);
  return data.products ?? [];
};

export const fetchProduct = async (slug: string): Promise<Product> => {
  const data = await request<{ product: Product }>(
    `/api/products/${encodeURIComponent(slug)}`,
    "Producto no encontrado",
  );
  return data.product;
};
