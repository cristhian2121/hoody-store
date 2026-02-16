import { useRef, useCallback } from "react";
import type { ImageElement, TextElement } from "@/lib/types";
import { calculateDragPosition } from "@/lib/utils/position";

export type DragElementType = "image" | "text";

interface DragState {
  type: DragElementType;
  id?: string;
  startX: number;
  startY: number;
  elemX: number;
  elemY: number;
}

interface UseDragAndDropOptions {
  onDragMove: (type: DragElementType, id: string | undefined, x: number, y: number) => void;
  onDragStart?: (type: DragElementType, id?: string) => void;
}

export const useDragAndDrop = ({ onDragMove, onDragStart }: UseDragAndDropOptions) => {
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
      
      dragRef.current = {
        type,
        id,
        startX: e.clientX,
        startY: e.clientY,
        elemX: element.x,
        elemY: element.y,
      };
      
      onDragStart?.(type, id);
    },
    [onDragStart],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragRef.current || !containerRef.current) return;
      
      const rect = containerRef.current.getBoundingClientRect();
      const { x, y } = calculateDragPosition(
        e.clientX,
        e.clientY,
        {
          startX: dragRef.current.startX,
          startY: dragRef.current.startY,
          elemX: dragRef.current.elemX,
          elemY: dragRef.current.elemY,
        },
        rect.width,
        rect.height,
      );
      
      onDragMove(dragRef.current.type, dragRef.current.id, x, y);
    },
    [onDragMove],
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
