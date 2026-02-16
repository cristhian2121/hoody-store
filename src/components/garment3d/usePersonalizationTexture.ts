import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import type {
  PersonalizationData,
  PrintSide,
  ProductCategory,
} from "@/lib/types";
import { getPrintArea } from "@/lib/printArea";

export function usePersonalizationTexture(params: {
  category: ProductCategory;
  side: PrintSide;
  personalization?: PersonalizationData;
}) {
  const { category, side, personalization } = params;
  const [texture, setTexture] = useState<THREE.CanvasTexture | null>(null);
  const lastUrlRef = useRef<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const previousTextureRef = useRef<THREE.CanvasTexture | null>(null);

  const canvas = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = 1024;
    c.height = 1024;
    return c;
  }, []);

  useEffect(() => {
    // Cleanup previous texture on unmount or change
    return () => {
      if (previousTextureRef.current) {
        previousTextureRef.current.dispose();
        previousTextureRef.current = null;
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  useEffect(() => {
    // Abort any pending image loads
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    if (!personalization) {
      setTexture(null);
      return;
    }

    const area = getPrintArea(category, side);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const layer = personalization[side];
    let hasImage = false;

    // Draw image (if present) - handle async loading properly
    if (layer.image?.src) {
      hasImage = true;
      const img = new Image();
      img.crossOrigin = "anonymous";
      
      const handleImageLoad = () => {
        // Check if effect was cancelled
        if (signal.aborted) return;

        // Clear and redraw everything
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        ctx.save();
        const cx = (layer.image!.x / 100) * canvas.width;
        const cy = (layer.image!.y / 100) * canvas.height;
        ctx.translate(cx, cy);
        ctx.scale(-1, 1); // Flip horizontally to fix mirroring on 3D model
        ctx.rotate((layer.image!.rotation * Math.PI) / 180);
        const base = 260;
        const w = base * layer.image!.scale;
        const h = base * (img.height / img.width) * layer.image!.scale;
        ctx.drawImage(img, -w / 2, -h / 2, w, h);
        ctx.restore();

        // Draw texts after image
        layer.texts.forEach((t) => {
          ctx.save();
          const cx = (t.x / 100) * canvas.width;
          const cy = (t.y / 100) * canvas.height;
          ctx.translate(cx, cy);
          ctx.scale(-1, 1); // Flip horizontally to match image flip
          ctx.rotate((t.rotation * Math.PI) / 180);
          ctx.scale(t.scale, t.scale);
          const fontStyle = `${t.italic ? "italic " : ""}${t.bold ? "bold " : ""}${t.fontSize}px ${t.fontFamily}`;
          ctx.font = fontStyle;
          ctx.fillStyle = t.color;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(t.content, 0, 0);
          ctx.restore();
        });

        // Mask outside print area
        ctx.save();
        ctx.globalCompositeOperation = "destination-in";
        ctx.fillStyle = "#000";
        ctx.fillRect(
          (area.xMin / 100) * canvas.width,
          (area.yMin / 100) * canvas.height,
          ((area.xMax - area.xMin) / 100) * canvas.width,
          ((area.yMax - area.yMin) / 100) * canvas.height,
        );
        ctx.restore();

        // Dispose previous texture
        if (previousTextureRef.current) {
          previousTextureRef.current.dispose();
        }

        // Create new texture with decal-quality settings
        const tex = new THREE.CanvasTexture(canvas);
        tex.needsUpdate = true;
        tex.anisotropy = 16; // High quality filtering for decals
        tex.minFilter = THREE.LinearFilter;
        tex.magFilter = THREE.LinearFilter;
        tex.flipY = false; // Canvas textures don't need flipping
        
        previousTextureRef.current = tex;
        setTexture(tex);
      };

      img.onerror = () => {
        if (signal.aborted) return;
        // If image fails, still render texts
        handleImageLoad();
      };

      img.onload = handleImageLoad;
      img.src = layer.image.src;

      // Cleanup object URLs
      if (lastUrlRef.current && lastUrlRef.current.startsWith("blob:")) {
        URL.revokeObjectURL(lastUrlRef.current);
      }
      lastUrlRef.current = layer.image.src;
    } else {
      // No image, just draw texts
      layer.texts.forEach((t) => {
        ctx.save();
        const cx = (t.x / 100) * canvas.width;
        const cy = (t.y / 100) * canvas.height;
        ctx.translate(cx, cy);
        ctx.scale(-1, 1); // Flip horizontally to fix mirroring on 3D model
        ctx.rotate((t.rotation * Math.PI) / 180);
        ctx.scale(t.scale, t.scale);
        const fontStyle = `${t.italic ? "italic " : ""}${t.bold ? "bold " : ""}${t.fontSize}px ${t.fontFamily}`;
        ctx.font = fontStyle;
        ctx.fillStyle = t.color;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(t.content, 0, 0);
        ctx.restore();
      });

      // Mask outside print area
      ctx.save();
      ctx.globalCompositeOperation = "destination-in";
      ctx.fillStyle = "#000";
      ctx.fillRect(
        (area.xMin / 100) * canvas.width,
        (area.yMin / 100) * canvas.height,
        ((area.xMax - area.xMin) / 100) * canvas.width,
        ((area.yMax - area.yMin) / 100) * canvas.height,
      );
      ctx.restore();

      // Dispose previous texture
      if (previousTextureRef.current) {
        previousTextureRef.current.dispose();
      }

      // Create texture only if there's content
      if (layer.texts.length > 0) {
        const tex = new THREE.CanvasTexture(canvas);
        tex.needsUpdate = true;
        tex.anisotropy = 16;
        tex.minFilter = THREE.LinearFilter;
        tex.magFilter = THREE.LinearFilter;
        tex.flipY = false;
        
        previousTextureRef.current = tex;
        setTexture(tex);
      } else {
        setTexture(null);
      }
    }
  }, [canvas, category, side, personalization]);

  return texture;
}
