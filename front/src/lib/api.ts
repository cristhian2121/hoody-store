export const API_URL = import.meta.env.VITE_API_URL || "";

export const ensureApiUrl = () => {
  if (!API_URL) {
    throw new Error("Configura VITE_API_URL con la URL de tu backend.");
  }

  return API_URL;
};
