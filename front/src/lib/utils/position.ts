import type { ImageElement, TextElement } from "../types";
import type { HorizontalPosition, VerticalPosition, PrintArea } from "../constants";
import { POSITION_MAP, POSITION_TOLERANCE } from "../constants";
import { clampElementToPrintArea, type Size } from "./print-geometry";

export const clampPosition = (value: number, min = 0, max = 100): number =>
  Math.max(min, Math.min(max, value));

export interface DragStartPosition {
  startX: number;
  startY: number;
  elemX: number;
  elemY: number;
}

export interface DragDelta {
  dx: number;
  dy: number;
}

/**
 * Nueva posicion durante el arrastre, en % del AREA DE ESTAMPADO.
 *
 * `containerWidth`/`containerHeight` son las del area, no las de la prenda
 * completa: el contenedor de arrastre es ahora PrintAreaBox. Cuando se conoce
 * el tamano del elemento se limita su caja envolvente rotada para que no se
 * salga del area; sin ese dato se cae al limite simple 0..100.
 */
export const calculateDragPosition = (
  clientX: number,
  clientY: number,
  dragStart: DragStartPosition,
  containerWidth: number,
  containerHeight: number,
  bounds?: { elementSizeMm: Size; area: PrintArea; rotationDeg?: number },
): { x: number; y: number } => {
  const dx = ((clientX - dragStart.startX) / containerWidth) * 100;
  const dy = ((clientY - dragStart.startY) / containerHeight) * 100;
  const candidate = { x: dragStart.elemX + dx, y: dragStart.elemY + dy };

  if (!bounds) {
    return { x: clampPosition(candidate.x), y: clampPosition(candidate.y) };
  }

  return clampElementToPrintArea(
    candidate,
    bounds.elementSizeMm,
    bounds.area.widthMm,
    bounds.area.heightMm,
    bounds.rotationDeg ?? 0,
  );
};

export const isPositionActive = (
  element: ImageElement | TextElement | null,
  horizontal: HorizontalPosition,
  vertical: VerticalPosition,
  tolerance: number = POSITION_TOLERANCE,
): boolean => {
  if (!element) return false;
  const targetX = POSITION_MAP.horizontal[horizontal];
  const targetY = POSITION_MAP.vertical[vertical];
  return (
    Math.abs(element.x - targetX) < tolerance && Math.abs(element.y - targetY) < tolerance
  );
};

export const getPositionPreset = (
  horizontal: HorizontalPosition,
  vertical: VerticalPosition,
): { x: number; y: number } => ({
  x: POSITION_MAP.horizontal[horizontal],
  y: POSITION_MAP.vertical[vertical],
});
