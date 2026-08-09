import { useRef, useCallback } from "react";
import type { ImageElement, TextElement } from "@/lib/types";
import type { PrintArea } from "@/lib/constants";
import { calculateDragPosition } from "@/lib/utils/position";

export type DragElementType = "image" | "text";

interface DragState {
  type: DragElementType;
  id?: string;
  startX: number;
  startY: number;
  elemX: number;
  elemY: number;
  /** Tamano sin rotar del elemento, en mm del area de estampado. */
  elemWidthMm: number;
  elemHeightMm: number;
  rotationDeg: number;
}

interface UseDragAndDropOptions {
  onDragMove: (type: DragElementType, id: string | undefined, x: number, y: number) => void;
  onDragStart?: (type: DragElementType, id?: string) => void;
  /** Area activa. Sin ella el arrastre cae al limite simple 0..100. */
  area?: PrintArea;
}

export const useDragAndDrop = ({ onDragMove, onDragStart, area }: UseDragAndDropOptions) => {
  const dragRef = useRef<DragState | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const handlePointerDown = useCallback(
    (
      e: React.PointerEvent,
      type: DragElementType,
      element: ImageElement | TextElement | undefined,
      id?: string,
    ) => {
      if (!element) return;

      e.preventDefault();
      e.stopPropagation();
      (e.target as HTMLElement).setPointerCapture(e.pointerId);

      // El tamano se mide del DOM en vez de recalcularlo: sirve igual para la
      // imagen (que depende de su relacion de aspecto) y para el texto (que
      // depende de la fuente y del contenido), sin duplicar la logica de
      // maquetacion del navegador.
      const node = e.currentTarget as HTMLElement;
      const areaRect = containerRef.current?.getBoundingClientRect();
      const areaWidthPx = areaRect?.width ?? 0;
      const areaHeightPx = areaRect?.height ?? 0;

      const elemWidthMm =
        area && areaWidthPx > 0 ? (node.offsetWidth / areaWidthPx) * area.widthMm : 0;
      const elemHeightMm =
        area && areaHeightPx > 0 ? (node.offsetHeight / areaHeightPx) * area.heightMm : 0;

      dragRef.current = {
        type,
        id,
        startX: e.clientX,
        startY: e.clientY,
        elemX: element.x,
        elemY: element.y,
        elemWidthMm,
        elemHeightMm,
        rotationDeg: element.rotation ?? 0,
      };

      onDragStart?.(type, id);
    },
    [onDragStart, area],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragRef.current || !containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      const drag = dragRef.current;

      const { x, y } = calculateDragPosition(
        e.clientX,
        e.clientY,
        {
          startX: drag.startX,
          startY: drag.startY,
          elemX: drag.elemX,
          elemY: drag.elemY,
        },
        rect.width,
        rect.height,
        area && drag.elemWidthMm > 0
          ? {
              elementSizeMm: { width: drag.elemWidthMm, height: drag.elemHeightMm },
              area,
              rotationDeg: drag.rotationDeg,
            }
          : undefined,
      );

      onDragMove(drag.type, drag.id, x, y);
    },
    [onDragMove, area],
  );

  const handlePointerUp = useCallback(() => {
    dragRef.current = null;
  }, []);

  return {
    containerRef,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
  };
};
