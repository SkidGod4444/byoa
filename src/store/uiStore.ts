"use client";

import { create } from "zustand";

interface UiState {
  glossaryOpen: boolean;
  focusConceptId: string | null;
  introOpen: boolean;
  /** Sidebar visibility — collapsible so the 3D stage can go full-bleed. */
  leftOpen: boolean;
  rightOpen: boolean;
  openGlossary: (conceptId?: string) => void;
  closeGlossary: () => void;
  setIntroOpen: (b: boolean) => void;
  setLeftOpen: (b: boolean) => void;
  setRightOpen: (b: boolean) => void;
}

export const useUiStore = create<UiState>((set) => ({
  glossaryOpen: false,
  focusConceptId: null,
  introOpen: false,
  leftOpen: true,
  rightOpen: true,
  openGlossary: (conceptId) => set({ glossaryOpen: true, focusConceptId: conceptId ?? null }),
  closeGlossary: () => set({ glossaryOpen: false }),
  setIntroOpen: (b) => set({ introOpen: b }),
  setLeftOpen: (b) => set({ leftOpen: b }),
  setRightOpen: (b) => set({ rightOpen: b }),
}));
