import type { ImageElement, TextElement } from "../types";
import type {
  HorizontalPosition,
  VerticalPosition,
} from "../constants";
import { POSITION_MAP, POSITION_TOLERANCE } from "../constants";

export const clampPosition = (value: number, min: number = 0, max: number = 100): number => {
  return Math.max(min, Math.min(max, value));
};

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

export const calculateDragPosition = (
  clientX: number,
  clientY: number,
  dragStart: DragStartPosition,
  containerWidth: number,
  containerHeight: number,
): { x: number; y: number } => {
  const dx = ((clientX - dragStart.startX) / containerWidth) * 100;
  const dy = ((clientY - dragStart.startY) / containerHeight) * 100;
  const newX = clampPosition(dragStart.elemX + dx);
  const newY = clampPosition(dragStart.elemY + dy);
  return { x: newX, y: newY };
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
    Math.abs(element.x - targetX) < tolerance &&
    Math.abs(element.y - targetY) < tolerance
  );
};

export const getPositionPreset = (
  horizontal: HorizontalPosition,
  vertical: VerticalPosition,
): { x: number; y: number } => {
  return {
    x: POSITION_MAP.horizontal[horizontal],
    y: POSITION_MAP.vertical[vertical],
  };
};
