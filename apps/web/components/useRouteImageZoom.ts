"use client";

import { useEffect, useLayoutEffect, useRef, useState, type PointerEvent, type RefObject } from "react";

type Point = { x: number; y: number };
type Gesture = { scale: number; distance: number; anchorX: number; anchorY: number };
const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);

// Enabled only for compact kit schemes; existing scenario-viewer behaviour stays intact.
export function useRouteImageZoom(viewport: RefObject<HTMLDivElement | null>, enabled: boolean, open: boolean) {
  const [scale, setScale] = useState(1);
  const currentScale = useRef(1);
  const points = useRef(new Map<number, Point>());
  const pinch = useRef<Gesture | null>(null);
  const pan = useRef<{ x: number; y: number; left: number; top: number } | null>(null);
  const pendingScroll = useRef<{ left: number; top: number } | null>(null);
  const dragged = useRef(false);

  useEffect(() => {
    if (open) return;
    setScale(1); currentScale.current = 1; points.current.clear(); pinch.current = null; pan.current = null;
    pendingScroll.current = null; dragged.current = false;
  }, [open]);
  useLayoutEffect(() => {
    if (!enabled || !viewport.current || !pendingScroll.current) return;
    viewport.current.scrollLeft = pendingScroll.current.left;
    viewport.current.scrollTop = pendingScroll.current.top;
    pendingScroll.current = null;
  }, [scale, enabled, viewport]);

  function begin() {
    const node = viewport.current;
    if (!node) return;
    const [a, b] = [...points.current.values()];
    if (a && b) {
      const rect = node.getBoundingClientRect();
      pinch.current = { scale: currentScale.current, distance: Math.max(1, distance(a, b)),
        anchorX: (node.scrollLeft + (a.x + b.x) / 2 - rect.left) / currentScale.current,
        anchorY: (node.scrollTop + (a.y + b.y) / 2 - rect.top) / currentScale.current };
      pan.current = null; dragged.current = true;
    } else if (a) {
      pinch.current = null;
      pan.current = { x: a.x, y: a.y, left: node.scrollLeft, top: node.scrollTop };
    } else { pinch.current = null; pan.current = null; }
  }
  function pointerDown(event: PointerEvent<HTMLDivElement>) {
    if (!enabled || event.button > 0) return;
    if (!points.current.size) dragged.current = false;
    points.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    event.currentTarget.setPointerCapture(event.pointerId);
    begin();
  }
  function pointerMove(event: PointerEvent<HTMLDivElement>) {
    const node = viewport.current;
    if (!enabled || !node || !points.current.has(event.pointerId)) return;
    points.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    const [a, b] = [...points.current.values()];
    if (a && b && pinch.current) {
      const next = Math.max(1, Math.min(4, pinch.current.scale * distance(a, b) / pinch.current.distance));
      const rect = node.getBoundingClientRect();
      pendingScroll.current = {
        left: pinch.current.anchorX * next - ((a.x + b.x) / 2 - rect.left),
        top: pinch.current.anchorY * next - ((a.y + b.y) / 2 - rect.top),
      };
      currentScale.current = next; setScale(next);
    } else if (a && pan.current) {
      const dx = a.x - pan.current.x, dy = a.y - pan.current.y;
      if (Math.abs(dx) + Math.abs(dy) > 5) dragged.current = true;
      node.scrollLeft = pan.current.left - dx; node.scrollTop = pan.current.top - dy;
    }
  }
  function pointerUp(event: PointerEvent<HTMLDivElement>) {
    points.current.delete(event.pointerId);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    begin();
  }
  function toggle() {
    const node = viewport.current;
    const next = currentScale.current > 1 ? 1 : 1.75;
    if (node) pendingScroll.current = {
      left: (node.scrollLeft + node.clientWidth / 2) / currentScale.current * next - node.clientWidth / 2,
      top: (node.scrollTop + node.clientHeight / 2) / currentScale.current * next - node.clientHeight / 2,
    };
    currentScale.current = next; setScale(next);
  }
  return { scale, toggle, imageClick: () => { if (dragged.current) { dragged.current = false; return; } toggle(); },
    handlers: enabled ? { onPointerDown: pointerDown, onPointerMove: pointerMove, onPointerUp: pointerUp, onPointerCancel: pointerUp } : {} };
}
