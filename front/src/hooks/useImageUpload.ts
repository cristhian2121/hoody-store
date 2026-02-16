import { useRef, useState, useCallback } from "react";
import type { ImageElement } from "@/lib/types";
import { processImageFile, generateAIImage, createImageElement } from "@/lib/utils/image";

interface UseImageUploadOptions {
  onImageUploaded: (image: ImageElement) => void;
  onError?: (error: string) => void;
}

export const useImageUpload = ({
  onImageUploaded,
  onError,
}: UseImageUploadOptions) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");

  const handleFileSelect = useCallback(
    async (file: File) => {
      try {
        const { src } = await processImageFile(file);
        const image = createImageElement(src);
        onImageUploaded(image);
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Failed to process image";
        onError?.(errorMessage);
      }
    },
    [onImageUploaded, onError],
  );

  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      handleFileSelect(file);
      e.target.value = "";
    },
    [handleFileSelect],
  );

  const triggerFileInput = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleAiGenerate = useCallback(async () => {
    if (!aiPrompt.trim()) return;
    setAiLoading(true);
    try {
      const src = await generateAIImage(aiPrompt);
      const image = createImageElement(src);
      onImageUploaded(image);
      setAiPrompt("");
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to generate image";
      onError?.(errorMessage);
    } finally {
      setAiLoading(false);
    }
  }, [aiPrompt, onImageUploaded, onError]);

  return {
    fileInputRef,
    aiLoading,
    aiPrompt,
    setAiPrompt,
    handleFileInputChange,
    triggerFileInput,
    handleAiGenerate,
  };
};
