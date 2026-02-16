import type { ImageElement } from "../types";
import {
  MAX_FILE_SIZE,
  ALLOWED_IMAGE_TYPES,
  IMAGE_MAX_DIMENSION,
  DEFAULT_IMAGE_POSITION,
  DEFAULT_SCALE,
  DEFAULT_ROTATION,
} from "../constants";

export interface ImageValidationResult {
  valid: boolean;
  error?: string;
}

export const validateImageFile = (file: File): ImageValidationResult => {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type as any)) {
    return {
      valid: false,
      error: "Solo se permiten PNG, JPG y SVG",
    };
  }
  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: "El archivo es demasiado grande (máx. 5MB)",
    };
  }
  return { valid: true };
};

export const resizeImage = (
  width: number,
  height: number,
  maxDimension: number = IMAGE_MAX_DIMENSION,
): { width: number; height: number } => {
  if (width <= maxDimension && height <= maxDimension) {
    return { width, height };
  }
  const ratio = Math.min(maxDimension / width, maxDimension / height);
  return {
    width: width * ratio,
    height: height * ratio,
  };
};

export const processImageFile = (
  file: File,
): Promise<{ src: string; width: number; height: number }> => {
  return new Promise((resolve, reject) => {
    const validation = validateImageFile(file);
    if (!validation.valid) {
      reject(new Error(validation.error));
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const { width, height } = resizeImage(img.width, img.height);
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Could not get canvas context"));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        const src = canvas.toDataURL("image/jpeg", 0.8);
        resolve({ src, width, height });
      };
      img.onerror = () => reject(new Error("Failed to load image"));
      img.src = ev.target?.result as string;
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
};

export const generateAIImage = async (
  prompt: string,
): Promise<string> => {
  // Simulated AI generation - in production this would call an API
  await new Promise((r) => setTimeout(r, 2000));
  
  // Create a placeholder generated image
  const canvas = document.createElement("canvas");
  canvas.width = 400;
  canvas.height = 400;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Could not get canvas context");
  }
  
  const gradient = ctx.createLinearGradient(0, 0, 400, 400);
  gradient.addColorStop(0, "#22c55e");
  gradient.addColorStop(1, "#3b82f6");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 400, 400);
  ctx.fillStyle = "#fff";
  ctx.font = "bold 20px Plus Jakarta Sans, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("AI Generated", 200, 190);
  ctx.font = "14px Plus Jakarta Sans, sans-serif";
  ctx.fillText(prompt.slice(0, 30), 200, 220);
  
  return canvas.toDataURL("image/png");
};

export const createImageElement = (
  src: string,
  x: number = DEFAULT_IMAGE_POSITION.x,
  y: number = DEFAULT_IMAGE_POSITION.y,
  scale: number = DEFAULT_SCALE,
  rotation: number = DEFAULT_ROTATION,
): ImageElement => ({
  src,
  x,
  y,
  scale,
  rotation,
});
