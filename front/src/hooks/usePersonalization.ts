import { useState, useCallback, useEffect } from "react";
import type {
  PersonalizationData,
  PrintSide,
  DesignLayer,
  TextElement,
  ImageElement,
} from "@/lib/types";
import { emptyPersonalization } from "@/lib/types";
import {
  FONTS,
  DEFAULT_TEXT_CONTENT,
  DEFAULT_TEXT_POSITION,
  DEFAULT_FONT_SIZE,
  DEFAULT_TEXT_COLOR,
  DEFAULT_SCALE,
  DEFAULT_ROTATION,
} from "@/lib/constants";
import { createImageElement } from "@/lib/utils/image";

interface UsePersonalizationOptions {
  initialData?: PersonalizationData;
  onChange?: (data: PersonalizationData) => void;
}

export const usePersonalization = ({
  initialData,
  onChange,
}: UsePersonalizationOptions = {}) => {
  const [data, setData] = useState<PersonalizationData>(
    initialData || emptyPersonalization(),
  );
  const [activeSide, setActiveSide] = useState<PrintSide>("front");
  const [selectedTextId, setSelectedTextId] = useState<string | null>(null);

  const currentLayer = data[activeSide];

  useEffect(() => {
    onChange?.(data);
  }, [data, onChange]);

  const updateLayer = useCallback(
    (side: PrintSide, updater: (layer: DesignLayer) => DesignLayer) => {
      setData((prev) => ({ ...prev, [side]: updater(prev[side]) }));
    },
    [],
  );

  const addText = useCallback(() => {
    const id = crypto.randomUUID();
    updateLayer(activeSide, (layer) => ({
      ...layer,
      texts: [
        ...layer.texts,
        {
          id,
          content: DEFAULT_TEXT_CONTENT,
          x: DEFAULT_TEXT_POSITION.x,
          y: DEFAULT_TEXT_POSITION.y,
          fontFamily: FONTS[0],
          fontSize: DEFAULT_FONT_SIZE,
          color: DEFAULT_TEXT_COLOR,
          bold: false,
          italic: false,
          scale: DEFAULT_SCALE,
          rotation: DEFAULT_ROTATION,
        },
      ],
    }));
    setSelectedTextId(id);
  }, [activeSide, updateLayer]);

  const updateText = useCallback(
    (id: string, updates: Partial<TextElement>) => {
      updateLayer(activeSide, (layer) => ({
        ...layer,
        texts: layer.texts.map((t) => (t.id === id ? { ...t, ...updates } : t)),
      }));
    },
    [activeSide, updateLayer],
  );

  const removeText = useCallback(
    (id: string) => {
      updateLayer(activeSide, (layer) => ({
        ...layer,
        texts: layer.texts.filter((t) => t.id !== id),
      }));
      setSelectedTextId(null);
    },
    [activeSide, updateLayer],
  );

  const setImage = useCallback(
    (image: ImageElement | null) => {
      updateLayer(activeSide, (layer) => ({ ...layer, image }));
    },
    [activeSide, updateLayer],
  );

  const removeImage = useCallback(() => {
    updateLayer(activeSide, (layer) => ({ ...layer, image: null }));
  }, [activeSide, updateLayer]);

  const updateImage = useCallback(
    (updates: Partial<ImageElement>) => {
      updateLayer(activeSide, (layer) => ({
        ...layer,
        image: layer.image ? { ...layer.image, ...updates } : null,
      }));
    },
    [activeSide, updateLayer],
  );

  const reset = useCallback(() => {
    setData(emptyPersonalization());
    setSelectedTextId(null);
  }, []);

  const selectedText = selectedTextId
    ? currentLayer.texts.find((t) => t.id === selectedTextId)
    : null;

  return {
    data,
    setData,
    activeSide,
    setActiveSide,
    currentLayer,
    selectedTextId,
    setSelectedTextId,
    selectedText,
    addText,
    updateText,
    removeText,
    setImage,
    removeImage,
    updateImage,
    reset,
    updateLayer,
  };
};
