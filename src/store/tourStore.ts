"use client";

// ---------------------------------------------------------------------------
// Guided onboarding tour.
//
// Unlike a passive "tooltip tour", every step DRIVES the real app: it opens
// the actual Examples dropdown, physically .click()s the real menu item to
// load a preset, toggles X-ray, selects a 3D part (camera flies), tweens the
// Explode slider, and pops the add-stage palette. The spotlight hole in the
// overlay is click-transparent, so users can also poke the highlighted
// control themselves mid-step.
// ---------------------------------------------------------------------------

import { create } from "zustand";
import {
  BarChart3,
  BookOpen,
  Bot,
  Expand,
  Layers,
  MousePointerClick,
  Package,
  Rocket,
  Scan,
  Trophy,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { PRESETS } from "@/lib/presets";
import type { ActuatorDesign } from "@/lib/types";
import { useDesignStore } from "./designStore";
import { useSceneStore } from "./sceneStore";
import { useUiStore } from "./uiStore";
import { useChallengeStore } from "./challengeStore";
import { partPositions } from "@/components/three/Assemblies";
import { cameraBus } from "@/components/three/cameraBus";

export interface TourStep {
  id: string;
  /** data-tour selector value of the spotlight target; none → centered card. */
  target?: string;
  /** Additional element to union into the spotlight (e.g. an open dropdown). */
  extraTarget?: string;
  icon: LucideIcon;
  title: string;
  body: string;
  /** Real app actions, scheduled relative to step entry. */
  onEnter?: () => void;
  onExit?: () => void;
}

// --- imperative helpers ------------------------------------------------------

const timers: ReturnType<typeof setTimeout>[] = [];
let raf = 0;

function later(ms: number, fn: () => void) {
  timers.push(setTimeout(fn, ms));
}
function clearPending() {
  timers.splice(0).forEach(clearTimeout);
  cancelAnimationFrame(raf);
}

function el(tourId: string): HTMLElement | null {
  return document.querySelector(`[data-tour="${tourId}"]`);
}

/** Physically click a real DOM element — the app reacts exactly as if the user did it. */
function realClick(tourId: string) {
  el(tourId)?.click();
}

/** Smoothly animate the Explode value (ease-in-out). */
function tweenExplode(to: number, ms = 900) {
  cancelAnimationFrame(raf);
  const from = useSceneStore.getState().explode;
  const t0 = performance.now();
  const step = (t: number) => {
    const k = Math.min(1, (t - t0) / ms);
    const e = k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2;
    useSceneStore.getState().setExplode(from + (to - from) * e);
    if (k < 1) raf = requestAnimationFrame(step);
  };
  raf = requestAnimationFrame(step);
}

const OPENARM = PRESETS.find((p) => p.design.id === "openarm-shoulder")!;

/** Load the demo preset the honest way: by clicking the real menu item. */
function loadDemoPresetViaMenu() {
  realClick("examples"); // open the dropdown for real
  later(1100, () => {
    const item = [...document.querySelectorAll<HTMLElement>('[data-tour="examples-menu"] button')].find((b) =>
      b.textContent?.includes("OpenArm Shoulder"),
    );
    if (item) item.click();
    else useDesignStore.getState().loadDesign(OPENARM.design); // fallback
  });
}

function ensureDemoLoaded() {
  // The narration talks about the Damiao shoulder specifically — make sure it's
  // on stage even if the user skipped past the menu step. Safe to overwrite:
  // the full pre-tour state comes back when the tour ends.
  if (useDesignStore.getState().design.id !== OPENARM.design.id) {
    useDesignStore.getState().loadDesign(OPENARM.design);
  }
}

function selectPart(key: string, posKey: string) {
  useSceneStore.getState().select({ key, pos: partPositions.get(posKey) ?? null });
}

function paletteIsOpen() {
  return !!el("add-stage-palette");
}

// --- the script ---------------------------------------------------------------

export const TOUR_STEPS: TourStep[] = [
  {
    id: "welcome",
    icon: Bot,
    title: "Welcome to BYOA",
    body:
      "You're looking at a living robot actuator — the muscle inside every robot joint. " +
      "Give me 60 seconds and I'll show you the whole machine. I'll even push the buttons for you.",
  },
  {
    id: "examples",
    target: "examples",
    extraTarget: "examples-menu",
    icon: Package,
    title: "Load a real robot's shoulder",
    body:
      "The Examples shelf holds real machines. Watch closely — I'm opening it and grabbing the shoulder " +
      "actuator from OpenArm, an open-source humanoid arm. No hands!",
    onEnter: () => later(500, loadDemoPresetViaMenu),
  },
  {
    id: "ships",
    target: "scene",
    icon: Package,
    title: "This is how it ships",
    body:
      "One sealed black pancake — a Damiao joint motor. Bolt it into an arm, feed it power and a CAN " +
      "cable, done. But a sealed can teaches you nothing…",
    onEnter: () => {
      ensureDemoLoaded();
      useSceneStore.getState().select(null);
      useSceneStore.getState().setXray(false);
      tweenExplode(0, 500);
      cameraBus.reset?.();
    },
  },
  {
    id: "xray",
    target: "xray",
    icon: Scan,
    title: "…so let's X-ray it",
    body:
      "The case just went ghost — that was me flipping this button. Motor at the back, planetary gears up " +
      "front, an encoder watching everything. Flip it any time.",
    onEnter: () => later(600, () => useSceneStore.getState().setXray(true)),
  },
  {
    id: "click-part",
    target: "scene",
    icon: MousePointerClick,
    title: "Every part is clickable",
    body:
      "I just clicked the rotor for you — the camera dives in and the part glows. Every gear, magnet and " +
      "screw in this machine responds like that.",
    onEnter: () => later(400, () => selectPart("motor/rotor", "motor")),
  },
  {
    id: "anatomy",
    target: "anatomy",
    icon: BookOpen,
    title: "Meet the anatomy card",
    body:
      "Whatever you click gets explained here: its name, its job, its story — and a “Watch” hint that tells " +
      "you exactly what to look for while it spins.",
    onEnter: () => useUiStore.getState().setRightOpen(true),
  },
  {
    id: "explode",
    target: "explode",
    icon: Expand,
    title: "Now the fun part",
    body:
      "EXPLODE. Full anatomy-diagram mode — every part floats apart while the machine keeps running. " +
      "That slider is yours; I'm just borrowing it.",
    onEnter: () => {
      useSceneStore.getState().select(null);
      cameraBus.reset?.(); // pull back so the whole explosion is visible
      later(500, () => tweenExplode(1, 1300));
    },
    onExit: () => tweenExplode(0, 700),
  },
  {
    id: "chips",
    target: "chips",
    icon: Zap,
    title: "Follow the power",
    body:
      "Motor → gearbox → output: these chips are the power path. Click one and the camera chases that part " +
      "of the machine. I just jumped us to the gearbox.",
    onEnter: () =>
      later(600, () => {
        const st = useDesignStore.getState().design.stages[0];
        if (st) selectPart(`stage-${st.id}`, `stage-${st.id}`);
      }),
  },
  {
    id: "transmission",
    target: "transmission",
    icon: Layers,
    title: "Stack your own gears",
    body:
      "I just opened the gear shelf for you. Planetary, harmonic, worm, screws — every stage trades speed " +
      "for strength in its own way. Add one after the tour and watch the machine grow.",
    onEnter: () => {
      useUiStore.getState().setLeftOpen(true);
      cameraBus.reset?.();
      later(500, () => {
        if (!paletteIsOpen()) realClick("add-stage");
      });
    },
    onExit: () => {
      if (paletteIsOpen()) realClick("add-stage");
    },
  },
  {
    id: "specs",
    target: "specs",
    icon: BarChart3,
    title: "Numbers that speak human",
    body:
      "“Holds ~39 kg at the end of a 10 cm arm.” That's what this actuator can do, in words that mean " +
      "something. Engineers: I opened your torque–speed curve underneath.",
    onEnter: () => {
      useUiStore.getState().setRightOpen(true);
      later(400, () => {
        const d = el("engineer") as HTMLDetailsElement | null;
        if (d) d.open = true;
      });
    },
    onExit: () => {
      const d = el("engineer") as HTMLDetailsElement | null;
      if (d) d.open = false;
    },
  },
  {
    id: "challenges",
    target: "challenges",
    extraTarget: "challenges-menu",
    icon: Trophy,
    title: "Now prove it",
    body:
      "Eight real engineering briefs — build a cat leg, a surgeon's wrist, a power-off holder — graded " +
      "live while you build, with hints when you're stuck. I just opened the mission board; your first " +
      "solve is waiting right after this tour.",
    onEnter: () => later(500, () => realClick("challenges")),
    onExit: () => useChallengeStore.getState().setPickerOpen(false),
  },
  {
    id: "done",
    icon: Rocket,
    title: "You're ready",
    body:
      "Click parts. Explode things. Swap motors, stack gears, load the other examples. Breaking imaginary " +
      "gearboxes is exactly how roboticists are made.",
  },
];

// --- store ---------------------------------------------------------------------

/** Everything the tour may touch — captured at start, restored verbatim at end. */
interface PreTourState {
  design: ActuatorDesign;
  selectedStageId: string | null;
  explode: number;
  xray: boolean;
  selected: { key: string; pos: [number, number, number] | null } | null;
  leftOpen: boolean;
  rightOpen: boolean;
}

interface TourState {
  active: boolean;
  step: number;
  preTour: PreTourState | null;
  start: () => void;
  next: () => void;
  prev: () => void;
  end: () => void;
}

function enter(i: number) {
  clearPending();
  TOUR_STEPS[i]?.onEnter?.();
}

export const useTourStore = create<TourState>((set, get) => ({
  active: false,
  step: 0,
  preTour: null,

  start: () => {
    const design = useDesignStore.getState();
    const scene = useSceneStore.getState();
    const ui = useUiStore.getState();
    set({
      active: true,
      step: 0,
      preTour: {
        design: JSON.parse(JSON.stringify(design.design)),
        selectedStageId: design.selectedStageId,
        explode: scene.explode,
        xray: scene.xray,
        selected: scene.selected ? { ...scene.selected } : null,
        leftOpen: ui.leftOpen,
        rightOpen: ui.rightOpen,
      },
    });
    useSceneStore.getState().select(null);
    enter(0);
  },

  next: () => {
    const { step } = get();
    TOUR_STEPS[step]?.onExit?.();
    if (step >= TOUR_STEPS.length - 1) {
      get().end();
      return;
    }
    set({ step: step + 1 });
    enter(step + 1);
  },

  prev: () => {
    const { step } = get();
    if (step === 0) return;
    TOUR_STEPS[step]?.onExit?.();
    set({ step: step - 1 });
    enter(step - 1);
  },

  end: () => {
    const { preTour, step, active } = get();
    if (!active) return;
    TOUR_STEPS[step]?.onExit?.();
    clearPending();

    // undo any DOM the tour opened
    const details = el("engineer") as HTMLDetailsElement | null;
    if (details) details.open = false;
    // an open dropdown closes on any outside mousedown — emulate one
    document.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));

    // put EVERYTHING back exactly the way it was before the tour
    if (preTour) {
      useDesignStore.getState().restoreDesign(preTour.design);
      useDesignStore.getState().selectStage(preTour.selectedStageId);
      const scene = useSceneStore.getState();
      scene.setExplode(preTour.explode);
      scene.setXray(preTour.xray);
      scene.select(preTour.selected);
      const ui = useUiStore.getState();
      ui.setLeftOpen(preTour.leftOpen);
      ui.setRightOpen(preTour.rightOpen);
    }
    set({ active: false, step: 0, preTour: null });
    // re-frame once the restored design has settled
    setTimeout(() => cameraBus.reset?.(), 350);
  },
}));
