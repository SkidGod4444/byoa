"use client";

import { create } from "zustand";

export interface Selection {
  /** Full part key, e.g. `motor/rotor`, `stage-x/sun`, `motor`, `stage-x`, `output`. */
  key: string;
  /** World position to fly the camera toward (if known). */
  pos: [number, number, number] | null;
}

interface SceneState {
  selected: Selection | null;
  hovered: string | null;
  /** 0 = assembled, 1 = fully exploded. */
  explode: number;
  /** Ghost the housings so the insides show. */
  xray: boolean;
  select: (sel: Selection | null) => void;
  setHovered: (key: string | null) => void;
  setExplode: (v: number) => void;
  setXray: (b: boolean) => void;
}

export const useSceneStore = create<SceneState>((set) => ({
  selected: null,
  hovered: null,
  explode: 0,
  xray: true,
  select: (selected) => set({ selected }),
  setHovered: (hovered) => set({ hovered }),
  setExplode: (explode) => set({ explode }),
  setXray: (xray) => set({ xray }),
}));
