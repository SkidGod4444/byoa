"use client";

import { create } from "zustand";

const LS_KEY = "byoa.challenges.v1";

interface ChallengeState {
  /** Challenge currently being attempted (its card docks into the left panel). */
  activeId: string | null;
  /** Completed challenge ids. */
  done: string[];
  pickerOpen: boolean;
  hydrated: boolean;
  hydrate: () => void;
  start: (id: string) => void;
  abandon: () => void;
  complete: (id: string) => void;
  setPickerOpen: (b: boolean) => void;
}

function persist(done: string[]) {
  try {
    window.localStorage.setItem(LS_KEY, JSON.stringify(done));
  } catch {
    /* ignore */
  }
}

export const useChallengeStore = create<ChallengeState>((set, get) => ({
  activeId: null,
  done: [],
  pickerOpen: false,
  hydrated: false,

  hydrate: () => {
    if (get().hydrated || typeof window === "undefined") return;
    let done: string[] = [];
    try {
      const raw = window.localStorage.getItem(LS_KEY);
      if (raw) done = JSON.parse(raw);
    } catch {
      /* ignore */
    }
    set({ hydrated: true, done: Array.isArray(done) ? done : [] });
  },

  start: (id) => set({ activeId: id, pickerOpen: false }),
  abandon: () => set({ activeId: null }),

  complete: (id) =>
    set((s) => {
      const done = s.done.includes(id) ? s.done : [...s.done, id];
      persist(done);
      return { done };
    }),

  setPickerOpen: (b) => set({ pickerOpen: b }),
}));
