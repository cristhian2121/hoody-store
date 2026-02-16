import { useCallback, useRef } from "react";

type PointerLikeEvent = {
  clientX: number;
  pointerId: number;
  currentTarget: EventTarget & { setPointerCapture?: (pointerId: number) => void };
};

export function useDragRotateY() {
  const state = useRef<{
    dragging: boolean;
    startX: number;
    startRotationY: number;
    rotationY: number;
  }>({ dragging: false, startX: 0, startRotationY: 0, rotationY: 0 });

  const onPointerDown = useCallback((e: PointerLikeEvent) => {
    state.current.dragging = true;
    state.current.startX = e.clientX;
    state.current.startRotationY = state.current.rotationY;
    e.currentTarget.setPointerCapture?.(e.pointerId);
  }, []);

  const onPointerMove = useCallback((e: PointerLikeEvent) => {
    if (!state.current.dragging) return;
    const dx = e.clientX - state.current.startX;
    // Sensitivity tuned for "natural" horizontal rotation
    state.current.rotationY = state.current.startRotationY + dx * 0.01;
  }, []);

  const onPointerUp = useCallback(() => {
    state.current.dragging = false;
  }, []);

  const getRotationY = useCallback(() => state.current.rotationY, []);

  return { onPointerDown, onPointerMove, onPointerUp, getRotationY };
}

