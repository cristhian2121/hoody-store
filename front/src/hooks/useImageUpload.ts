import { useRef, useState, useCallback, useEffect } from "react";
import type { ImageElement } from "@/lib/types";
import { createImageElement, validateImageFile } from "@/lib/utils/image";
import { uploadDesignImage } from "@/lib/uploads";

interface UseImageUploadOptions {
  onImageUploaded: (image: ImageElement) => void;
  onError?: (error: string) => void;
}

export const useImageUpload = ({ onImageUploaded, onError }: UseImageUploadOptions) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  // Si el editor se desmonta a mitad de una subida de 20 MB no tiene sentido
  // seguir esperandola, y menos llamar a onImageUploaded sobre algo que ya no
  // esta montado.
  useEffect(() => () => abortRef.current?.abort(), []);

  const handleFileSelect = useCallback(
    async (file: File) => {
      const validation = validateImageFile(file);
      if (!validation.valid) {
        onError?.(validation.error as string);
        return;
      }

      // Una segunda seleccion cancela la anterior: sin esto, si la primera
      // subida termina despues, pisa la imagen que el cliente eligio ultimo.
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setUploading(true);
      try {
        const uploaded = await uploadDesignImage(file, controller.signal);
        onImageUploaded(createImageElement(uploaded));
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        onError?.(error instanceof Error ? error.message : "No pudimos subir tu imagen.");
      } finally {
        if (abortRef.current === controller) {
          abortRef.current = null;
          setUploading(false);
        }
      }
    },
    [onImageUploaded, onError],
  );

  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      void handleFileSelect(file);
      // Se limpia para que volver a elegir el mismo archivo dispare el evento.
      e.target.value = "";
    },
    [handleFileSelect],
  );

  const triggerFileInput = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  return {
    fileInputRef,
    uploading,
    handleFileInputChange,
    triggerFileInput,
  };
};
