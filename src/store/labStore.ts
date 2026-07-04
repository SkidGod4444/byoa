"use client";

import { create } from "zustand";

export type LabTab = "motion" | "stress";

interface LabState {
  open: boolean;
  tab: LabTab;
  /** Shared scenario inputs. */
  mass: number;
  armLen: number; // meters
  targetDeg: number;
  openLab: (tab?: LabTab) => void;
  close: () => void;
  setTab: (t: LabTab) => void;
  setMass: (n: number) => void;
  setArmLen: (n: number) => void;
  setTargetDeg: (n: number) => void;
}

export const useLabStore = create<LabState>((set) => ({
  open: false,
  tab: "motion",
  mass: 2,
  armLen: 0.15,
  targetDeg: 90,
  openLab: (tab) => set((s) => ({ open: true, tab: tab ?? s.tab })),
  close: () => set({ open: false }),
  setTab: (tab) => set({ tab }),
  setMass: (mass) => set({ mass }),
  setArmLen: (armLen) => set({ armLen }),
  setTargetDeg: (targetDeg) => set({ targetDeg }),
}));
