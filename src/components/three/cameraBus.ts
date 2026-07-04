"use client";

// Tiny imperative bridge between DOM view-control buttons and the r3f
// CameraControls instance living inside the Canvas.
import type { CameraControls } from "@react-three/drei";

export const cameraBus: {
  controls: CameraControls | null;
  /** Re-frame the whole machine (set by CameraRig, which knows the size). */
  reset: (() => void) | null;
} = { controls: null, reset: null };

export function zoomBy(delta: number) {
  const c = cameraBus.controls;
  if (!c) return;
  // dolly toward/away from the target; clamped by min/maxDistance
  c.dolly(delta, true);
}

/**
 * Pan so the MACHINE appears to move by (dx, dy) on screen
 * (dx > 0 → machine slides right, dy > 0 → machine slides up).
 * camera-controls' truck(x, y) moves the camera right/down in screen space,
 * so the object shift is the negation.
 */
export function panView(dx: number, dy: number) {
  const c = cameraBus.controls;
  if (!c) return;
  c.truck(-dx, -dy, true);
}
