import { ensureApiUrl } from "./api";

export interface UploadedDesignImage {
  assetId: string;
  previewUrl: string;
  width: number;
  height: number;
  hasAlpha: boolean;
  bytes: number;
}

/**
 * Mensajes por codigo de estado.
 *
 * El servidor responde en espanol salvo el 429, que lo genera el limitador de
 * peticiones de Nest en ingles. Se traduce aca en vez de tocar el limitador,
 * que tambien protege el login del admin.
 */
const messageForStatus = (status: number): string | null => {
  if (status === 429) {
    return "Subiste muchas imagenes seguidas. Espera unos minutos e intenta de nuevo.";
  }
  if (status >= 500) {
    return "No pudimos procesar tu imagen en este momento. Intenta de nuevo.";
  }
  return null;
};

export const uploadDesignImage = async (
  file: File,
  signal?: AbortSignal,
): Promise<UploadedDesignImage> => {
  const apiUrl = ensureApiUrl();
  const body = new FormData();
  body.append("file", file);

  let response: Response;
  try {
    response = await fetch(`${apiUrl}/api/uploads/design-image`, {
      method: "POST",
      body,
      signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    throw new Error("No pudimos conectar con el servidor. Revisa tu conexion.");
  }

  if (!response.ok) {
    const fallback = messageForStatus(response.status);
    if (fallback) throw new Error(fallback);

    // El 400 del servidor explica exactamente que pasa con ESA imagen
    // (animada, muy chica, formato equivocado); es mejor que cualquier texto
    // generico que pudieramos poner aca.
    const detail = await response
      .json()
      .then((data) => (typeof data?.message === "string" ? data.message : null))
      .catch(() => null);

    throw new Error(detail ?? "No pudimos procesar tu imagen.");
  }

  return response.json();
};
