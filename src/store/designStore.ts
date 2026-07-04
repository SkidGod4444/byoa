"use client";

import { create } from "zustand";
import { useMemo } from "react";
import { MOTOR_TYPES, STAGE_TYPES } from "@/lib/catalog";
import { computeDrive, stageRatio } from "@/lib/physics";
import { blankDesign } from "@/lib/presets";
import type { ActuatorDesign, Motor, MotorType, Stage, StageType } from "@/lib/types";

const LS_KEY = "byoa.design.v1";

let idCounter = 0;
function freshId(): string {
  idCounter += 1;
  return `stage-${idCounter}-${Math.floor(Math.random() * 1e6).toString(36)}`;
}

function clone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v));
}

// --- share/persistence codec (compact v2 lives in lib/shareCodec) ------------
export { encodeDesign, decodeDesign } from "@/lib/shareCodec";
import { decodeDesign } from "@/lib/shareCodec";

interface DesignState {
  design: ActuatorDesign;
  selectedStageId: string | null;
  playing: boolean;
  /** Animation speed multiplier for the visualization. */
  simSpeed: number;
  hydrated: boolean;

  hydrate: () => void;
  setName: (name: string) => void;
  updateMotor: (patch: Partial<Motor>) => void;
  setMotorType: (type: MotorType) => void;
  addStage: (type: StageType) => void;
  updateStage: (id: string, patch: Partial<Stage>) => void;
  removeStage: (id: string) => void;
  moveStage: (id: string, dir: -1 | 1) => void;
  selectStage: (id: string | null) => void;
  loadDesign: (d: ActuatorDesign) => void;
  /** Verbatim restore (no id regeneration) — used by the tour teardown. */
  restoreDesign: (d: ActuatorDesign) => void;
  reset: () => void;
  setPlaying: (b: boolean) => void;
  setSimSpeed: (n: number) => void;
}

/**
 * Editing a loaded example forks it: the design stops claiming to be the
 * preset (id → "custom") and the name says so. Idempotent for custom designs.
 */
function forked(design: ActuatorDesign): ActuatorDesign {
  if (design.id === "custom") return design;
  return { ...design, id: "custom", name: `${design.name} (custom)` };
}

function persist(design: ActuatorDesign) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LS_KEY, JSON.stringify(design));
  } catch {
    /* ignore quota / private mode */
  }
}

export const useDesignStore = create<DesignState>((set, get) => ({
  design: blankDesign(),
  selectedStageId: null,
  playing: true,
  simSpeed: 1,
  hydrated: false,

  hydrate: () => {
    if (get().hydrated || typeof window === "undefined") return;
    let loaded: ActuatorDesign | null = null;
    // 1) shared URL takes priority
    const params = new URLSearchParams(window.location.search);
    const shared = params.get("d");
    if (shared) loaded = decodeDesign(shared);
    // 2) otherwise last-used local design
    if (!loaded) {
      const raw = window.localStorage.getItem(LS_KEY);
      if (raw) {
        try {
          const d = JSON.parse(raw);
          if (d && d.motor && Array.isArray(d.stages)) loaded = d;
        } catch {
          /* ignore */
        }
      }
    }
    set({
      hydrated: true,
      ...(loaded ? { design: loaded, selectedStageId: loaded.stages[0]?.id ?? null } : {}),
    });
  },

  setName: (name) =>
    set((s) => {
      const design = { ...s.design, name, id: "custom" };
      persist(design);
      return { design };
    }),

  updateMotor: (patch) =>
    set((s) => {
      const design = forked({ ...s.design, motor: { ...s.design.motor, ...patch } });
      persist(design);
      return { design };
    }),

  setMotorType: (type) =>
    set((s) => {
      // Load the family's typical real-world numbers so switching type
      // visibly changes the machine — the sliders stay fully editable after.
      const info = MOTOR_TYPES[type];
      const design = forked({
        ...s.design,
        motor: { ...s.design.motor, ...info.defaults, type, name: info.label },
      });
      persist(design);
      return { design };
    }),

  addStage: (type) =>
    set((s) => {
      const stage: Stage = { id: freshId(), ...STAGE_TYPES[type].makeDefault() };
      const design = forked({ ...s.design, stages: [...s.design.stages, stage] });
      persist(design);
      return { design, selectedStageId: stage.id };
    }),

  updateStage: (id, patch) =>
    set((s) => {
      const stages = s.design.stages.map((st) => {
        if (st.id !== id) return st;
        const merged = { ...st, ...patch };
        // Keep the displayed ratio in sync with any geometry the user edits.
        merged.ratio = stageRatio(merged);
        return merged;
      });
      const design = forked({ ...s.design, stages });
      persist(design);
      return { design };
    }),

  removeStage: (id) =>
    set((s) => {
      const stages = s.design.stages.filter((st) => st.id !== id);
      const design = forked({ ...s.design, stages });
      persist(design);
      return {
        design,
        selectedStageId: s.selectedStageId === id ? stages[0]?.id ?? null : s.selectedStageId,
      };
    }),

  moveStage: (id, dir) =>
    set((s) => {
      const stages = [...s.design.stages];
      const i = stages.findIndex((st) => st.id === id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= stages.length) return {};
      [stages[i], stages[j]] = [stages[j], stages[i]];
      const design = forked({ ...s.design, stages });
      persist(design);
      return { design };
    }),

  selectStage: (id) => set({ selectedStageId: id }),

  loadDesign: (d) => {
    const design = clone(d);
    // Guarantee unique stage ids across loads.
    design.stages = design.stages.map((st) => ({ ...st, id: freshId() }));
    persist(design);
    set({ design, selectedStageId: design.stages[0]?.id ?? null });
  },

  restoreDesign: (d) => {
    // Verbatim restore (tour teardown): keep original stage ids so any
    // selection that references them stays valid.
    const design = clone(d);
    persist(design);
    set((s) => ({
      design,
      selectedStageId: design.stages.some((st) => st.id === s.selectedStageId)
        ? s.selectedStageId
        : design.stages[0]?.id ?? null,
    }));
  },

  reset: () => {
    const design = blankDesign();
    persist(design);
    set({ design, selectedStageId: design.stages[0]?.id ?? null });
  },

  setPlaying: (b) => set({ playing: b }),
  setSimSpeed: (n) => set({ simSpeed: n }),
}));

/** Convenience hook: the memoized drivetrain solution for the current design. */
export function useDrive() {
  const design = useDesignStore((s) => s.design);
  return useMemo(() => computeDrive(design), [design]);
}
