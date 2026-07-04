"use client";

import { create } from "zustand";
import { ALL_LESSONS } from "@/lib/academy";

const LS_KEY = "byoa.academy.v1";

interface AcademyState {
  open: boolean;
  activeLessonId: string | null;
  /** Lesson ids the user has completed. */
  completed: string[];
  hydrated: boolean;
  hydrate: () => void;
  openAcademy: () => void;
  close: () => void;
  setActive: (id: string) => void;
  complete: (id: string) => void;
}

function persist(completed: string[]) {
  try {
    window.localStorage.setItem(LS_KEY, JSON.stringify(completed));
  } catch {
    /* ignore */
  }
}

export const useAcademyStore = create<AcademyState>((set, get) => ({
  open: false,
  activeLessonId: null,
  completed: [],
  hydrated: false,

  hydrate: () => {
    if (get().hydrated || typeof window === "undefined") return;
    let completed: string[] = [];
    try {
      const raw = window.localStorage.getItem(LS_KEY);
      if (raw) completed = JSON.parse(raw);
    } catch {
      /* ignore */
    }
    set({ hydrated: true, completed: Array.isArray(completed) ? completed : [] });
  },

  openAcademy: () =>
    set((s) => {
      // resume at the first unfinished lesson
      const next = ALL_LESSONS.find((l) => !s.completed.includes(l.id)) ?? ALL_LESSONS[0];
      return { open: true, activeLessonId: s.activeLessonId ?? next.id };
    }),

  close: () => set({ open: false }),
  setActive: (activeLessonId) => set({ activeLessonId }),

  complete: (id) =>
    set((s) => {
      if (s.completed.includes(id)) return {};
      const completed = [...s.completed, id];
      persist(completed);
      return { completed };
    }),
}));
