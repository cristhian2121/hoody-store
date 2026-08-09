import { ensureApiUrl } from "./api";

/**
 * Cliente del panel de administración.
 *
 * El token vive en `sessionStorage` y no en `localStorage`: dura 12 horas de
 * todas formas, así que no gana nada sobreviviendo al cierre de la pestaña, y
 * la ventana en la que un XSS puede robarlo es mucho más corta.
 */
const TOKEN_KEY = "admin-token";

export const getAdminToken = (): string | null => {
  try {
    return sessionStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
};

export const setAdminToken = (token: string): void => {
  sessionStorage.setItem(TOKEN_KEY, token);
};

export const clearAdminToken = (): void => {
  try {
    sessionStorage.removeItem(TOKEN_KEY);
  } catch {
    /* nada que limpiar */
  }
};

export class AdminUnauthorizedError extends Error {
  constructor() {
    super("Tu sesión expiró. Volvé a entrar.");
    this.name = "AdminUnauthorizedError";
  }
}

const request = async <T>(path: string, init: RequestInit = {}): Promise<T> => {
  const token = getAdminToken();
  if (!token) throw new AdminUnauthorizedError();

  const response = await fetch(`${ensureApiUrl()}${path}`, {
    ...init,
    headers: { ...init.headers, Authorization: `Bearer ${token}` },
  });

  if (response.status === 401) {
    // Un token vencido no se puede reusar: se borra para que la próxima
    // navegación mande al login en vez de fallar en cada petición.
    clearAdminToken();
    throw new AdminUnauthorizedError();
  }

  if (!response.ok) {
    const detail = await response
      .json()
      .then((data) => (typeof data?.message === "string" ? data.message : null))
      .catch(() => null);
    throw new Error(detail ?? "No pudimos completar la operación.");
  }

  return response.json();
};

export interface AdminOrderSummary {
  id: string;
  createdAt: string;
  status: string;
  customerName: string;
  customerEmail: string | null;
  city: string | null;
  total: number;
  currency: string;
  itemCount: number;
  printAssets: { total: number; ready: number; failed: number; pending: number };
}

export interface AdminPrintAsset {
  id: string;
  designId: string;
  status: "pending" | "rendering" | "ready" | "failed";
  attempts: number;
  lastError: string | null;
  dpi: number;
  widthPx: number | null;
  heightPx: number | null;
  bytes: number | null;
  rendererVersion: string | null;
}

export interface AdminOrderDesign {
  id: string;
  side: "front" | "back";
  category: string;
  printAreaWidthMm: string | number;
  printAreaHeightMm: string | number;
  dpi: number;
}

export interface AdminOrderItem {
  id: string;
  productNameEs: string;
  size: string;
  colorNameEs: string;
  gender: string;
  quantity: number;
  unitPriceCop: number;
  lineTotalCop: number;
  imageUrl: string | null;
  designs: AdminOrderDesign[];
}

export interface AdminOrderDetail {
  order: {
    id: string;
    createdAt: string;
    status: string;
    customer: Record<string, string>;
    shipping: Record<string, string | number>;
    totals: Record<string, number | string>;
    orderItems: AdminOrderItem[];
  };
  printAssets: AdminPrintAsset[];
}

export const adminLogin = async (email: string, password: string): Promise<string> => {
  const response = await fetch(`${ensureApiUrl()}/api/admin/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  if (response.status === 429) {
    throw new Error("Demasiados intentos. Esperá un minuto.");
  }
  if (!response.ok) {
    throw new Error("Correo o contraseña incorrectos.");
  }

  const data = await response.json();
  if (!data.accessToken) throw new Error("El servidor no devolvió un token.");
  return data.accessToken;
};

export const fetchAdminOrders = () =>
  request<{ orders: AdminOrderSummary[] }>("/api/admin/orders").then((data) => data.orders);

export const fetchAdminOrder = (id: string) => request<AdminOrderDetail>(`/api/admin/orders/${id}`);

export const requestRerender = (id: string) =>
  request<{ queued: number }>(`/api/admin/orders/${id}/rerender`, { method: "POST" });

export const createDownloadLink = (id: string) =>
  request<{ url: string; expiresInMinutes: number }>(`/api/admin/orders/${id}/download-link`, {
    method: "POST",
  });

/**
 * Descarga un archivo protegido por el token de admin.
 *
 * Se baja como blob y no como `<a href>` porque la cabecera Authorization no
 * viaja en una navegación normal del navegador.
 */
export const downloadPrintAsset = async (printAssetId: string, filename: string): Promise<void> => {
  const token = getAdminToken();
  if (!token) throw new AdminUnauthorizedError();

  const response = await fetch(
    `${ensureApiUrl()}/api/admin/print-assets/${printAssetId}/download`,
    { headers: { Authorization: `Bearer ${token}` } },
  );

  if (!response.ok) throw new Error("No pudimos descargar el archivo.");

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};

export const proofUrl = (printAssetId: string): string =>
  `${ensureApiUrl()}/api/admin/print-assets/${printAssetId}/proof`;

/**
 * La prueba se pinta en un `<img>`, que tampoco manda la cabecera Authorization.
 * Se trae como blob y se devuelve una object URL.
 */
export const fetchProofObjectUrl = async (printAssetId: string): Promise<string> => {
  const token = getAdminToken();
  if (!token) throw new AdminUnauthorizedError();

  const response = await fetch(proofUrl(printAssetId), {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error("No pudimos cargar la prueba.");

  return URL.createObjectURL(await response.blob());
};
