// ---------------------------------------------------------------------------
// Catalog of transmission stage types + motor types.
// This is both the "component palette" the builder uses AND a teaching resource:
// every entry carries a plain-language explanation, typical numbers, and the
// engineering trade-offs so the UI can explain *why* a choice matters.
// ---------------------------------------------------------------------------

import type { Motor, MotorType, Stage, StageType } from "./types";

export interface StageTypeInfo {
  type: StageType;
  label: string;
  /** One-line hook shown in the palette. */
  tagline: string;
  /** Full explanation — how it works, where it's used. */
  description: string;
  /** Typical single-stage reduction range. */
  ratioRange: [number, number];
  /** Typical efficiency (0–1). */
  typicalEfficiency: number;
  /** Typical backlash contributed [arc-minutes]. */
  typicalBacklash: number;
  /** Can torque flow backwards through it (output → input)? */
  backdrivable: boolean;
  /** True when this stage converts rotary motion to linear. */
  linear: boolean;
  pros: string[];
  cons: string[];
  /** Real machines that use it. */
  usedIn: string;
  /** Accent color for the stage in the UI. */
  color: string;
  /** Factory returning sensible defaults for a fresh stage of this type. */
  makeDefault: () => Omit<Stage, "id">;
}

export const STAGE_TYPES: Record<StageType, StageTypeInfo> = {
  spur: {
    type: "spur",
    label: "Spur Gear Pair",
    tagline: "The fundamental gear — two toothed wheels, parallel shafts.",
    description:
      "A spur gear pair meshes two parallel-shaft gears with straight, involute teeth. " +
      "The reduction ratio is simply the tooth-count ratio (driven ÷ driving). It's cheap, " +
      "efficient, and easy to understand, which is why it's the first gear everyone learns. " +
      "Because the teeth engage all at once it can be noisy and each pair only gives a modest reduction.",
    ratioRange: [1.5, 8],
    typicalEfficiency: 0.97,
    typicalBacklash: 8,
    backdrivable: true,
    linear: false,
    pros: ["Simple & cheap", "High efficiency (~97%)", "Easy to backdrive"],
    cons: ["Limited ratio per stage", "Noisier at speed", "Radial layout takes space"],
    usedIn: "Printers, gearmotors, hobby robots, machine tools",
    color: "#38bdf8",
    makeDefault: () => ({
      type: "spur",
      teethIn: 15,
      teethOut: 45,
      ratio: 3,
      efficiency: 0.97,
    }),
  },
  planetary: {
    type: "planetary",
    label: "Planetary Gearset",
    tagline: "A sun, orbiting planets, and a ring — compact and strong.",
    description:
      "A planetary (epicyclic) set has a central sun gear, several planet gears held by a " +
      "carrier, and an outer ring gear. Load is shared across all the planets, so it packs a " +
      "lot of torque into a small, coaxial package. With the ring fixed, sun as input and carrier " +
      "as output, ratio = 1 + (ring teeth ÷ sun teeth). Stack them for big reductions in a stubby cylinder.",
    ratioRange: [3, 10],
    typicalEfficiency: 0.95,
    typicalBacklash: 12,
    backdrivable: true,
    linear: false,
    pros: ["High torque density", "Coaxial in & out", "Load shared over planets"],
    cons: ["More parts / cost", "Some backlash", "Needs good tolerances"],
    usedIn: "Robot joints, cordless drills, EV drivetrains, wheel hubs",
    color: "#a78bfa",
    makeDefault: () => ({
      type: "planetary",
      sunTeeth: 12,
      planetTeeth: 18,
      planetCount: 3,
      ratio: 4, // 1 + (48/12) with ring = 48
      efficiency: 0.95,
    }),
  },
  harmonic: {
    type: "harmonic",
    label: "Harmonic Drive",
    tagline: "Strain-wave gearing: huge ratio, zero backlash, one stage.",
    description:
      "A harmonic (strain-wave) drive uses an elliptical 'wave generator' that flexes a thin, " +
      "toothed cup (the flexspline) so it meshes with a rigid outer ring (circular spline) at two " +
      "opposite points. Because the flexspline has ~2 fewer teeth than the ring, one full input turn " +
      "advances the output by just those few teeth — giving 30:1 to 320:1 in a single thin stage with " +
      "essentially zero backlash. That precision is why they dominate robot arm joints.",
    ratioRange: [30, 160],
    typicalEfficiency: 0.8,
    typicalBacklash: 0.5,
    backdrivable: false,
    linear: false,
    pros: ["Near-zero backlash", "Very high ratio, one stage", "Compact & lightweight"],
    cons: ["Lower efficiency (~80%)", "Poorly backdrivable", "Expensive, flex fatigue"],
    usedIn: "Industrial robot arms, cobots, spacecraft joints, humanoids",
    color: "#f472b6",
    makeDefault: () => ({
      type: "harmonic",
      ratio: 100,
      efficiency: 0.8,
    }),
  },
  cycloidal: {
    type: "cycloidal",
    label: "Cycloidal Drive",
    tagline: "An eccentric lobed disc rolling in pins — tough and precise.",
    description:
      "A cycloidal drive spins an eccentric cam that rolls a lobed disc against a ring of pins. " +
      "The disc has one fewer lobe than there are pins, so it 'walks' backwards slowly — a high " +
      "reduction. Contact is spread over many pins at once, giving huge shock resistance and long life " +
      "with low backlash. Common where harmonic drives would be too fragile.",
    ratioRange: [10, 120],
    typicalEfficiency: 0.85,
    typicalBacklash: 1,
    backdrivable: false,
    linear: false,
    pros: ["Very shock resistant", "Low backlash", "High ratio, compact"],
    cons: ["Vibration from eccentricity", "Poorly backdrivable", "Complex to build"],
    usedIn: "Heavy robot joints, RV reducers, positioners",
    color: "#fb923c",
    makeDefault: () => ({
      type: "cycloidal",
      ratio: 30,
      efficiency: 0.85,
    }),
  },
  worm: {
    type: "worm",
    label: "Worm Drive",
    tagline: "A screw meshing a wheel — big ratio, often self-locking.",
    description:
      "A worm drive meshes a screw-like 'worm' against a gear wheel with axes at 90°. One worm turn " +
      "advances the wheel by only the number of worm starts, so ratios of 20:1 to 100:1 come from a " +
      "single stage. Friction between the sliding threads makes it inefficient but often self-locking: " +
      "the output can't drive the input, which holds a load with no power — handy for lifts and pan/tilt.",
    ratioRange: [20, 100],
    typicalEfficiency: 0.6,
    typicalBacklash: 6,
    backdrivable: false,
    linear: false,
    pros: ["Self-locking holds load", "High ratio, one stage", "Quiet, right-angle output"],
    cons: ["Low efficiency (sliding)", "Not backdrivable", "Generates heat"],
    usedIn: "Winches, gates, camera pan/tilt, conveyor drives",
    color: "#facc15",
    makeDefault: () => ({
      type: "worm",
      wormStarts: 1,
      teethOut: 40,
      ratio: 40,
      efficiency: 0.6,
    }),
  },
  belt: {
    type: "belt",
    label: "Timing Belt / Pulley",
    tagline: "Toothed belt over two pulleys — move torque across a gap.",
    description:
      "A timing belt links two toothed pulleys so power can be moved to a remote shaft — used to keep " +
      "heavy motors off a moving arm. Ratio is the pulley tooth-count ratio. Belts are quiet, cheap, and " +
      "tolerate misalignment, but stretch a little under load (compliance) and slip if a tooth ever skips.",
    ratioRange: [1, 5],
    typicalEfficiency: 0.96,
    typicalBacklash: 4,
    backdrivable: true,
    linear: false,
    pros: ["Relocates the motor", "Quiet & cheap", "Tolerant of misalignment"],
    cons: ["Belt compliance/stretch", "Modest ratio", "Needs tensioning"],
    usedIn: "3D printers, SCARA arms, CoreXY machines",
    color: "#34d399",
    makeDefault: () => ({
      type: "belt",
      teethIn: 20,
      teethOut: 40,
      ratio: 2,
      efficiency: 0.96,
    }),
  },
  leadscrew: {
    type: "leadscrew",
    label: "Lead Screw",
    tagline: "Rotation → linear motion with a sliding nut.",
    description:
      "A lead screw turns rotation into straight-line motion by driving a threaded nut along the screw. " +
      "'Lead' is how far the nut travels per turn (mm/rev): a small lead gives huge force but slow travel. " +
      "The sliding thread contact makes it inefficient (~40–60%) and often self-locking, so it holds " +
      "position with power off. This is a terminal stage — output becomes force & linear speed.",
    ratioRange: [1, 1],
    typicalEfficiency: 0.5,
    typicalBacklash: 3,
    backdrivable: false,
    linear: true,
    pros: ["Big linear force", "Self-locking holds position", "Cheap & simple"],
    cons: ["Low efficiency", "Wear on the nut", "Slow travel"],
    usedIn: "3D printer Z-axis, linear actuators, small CNC",
    color: "#22d3ee",
    makeDefault: () => ({
      type: "leadscrew",
      lead: 2,
      ratio: 1,
      efficiency: 0.5,
    }),
  },
  ballscrew: {
    type: "ballscrew",
    label: "Ball Screw",
    tagline: "Rolling balls in the thread — efficient linear motion.",
    description:
      "A ball screw replaces the lead screw's sliding nut with recirculating ball bearings, cutting " +
      "friction dramatically. That pushes efficiency to ~90% and makes it backdrivable, at the cost of " +
      "price and it no longer self-locks. Preferred where precise, low-friction linear motion matters. " +
      "Also a terminal stage — output is force & linear speed.",
    ratioRange: [1, 1],
    typicalEfficiency: 0.9,
    typicalBacklash: 0.5,
    backdrivable: true,
    linear: true,
    pros: ["~90% efficient", "Precise, low wear", "High speed capable"],
    cons: ["Expensive", "Not self-locking", "Needs lubrication"],
    usedIn: "CNC machines, precision stages, industrial actuators",
    color: "#2dd4bf",
    makeDefault: () => ({
      type: "ballscrew",
      lead: 5,
      ratio: 1,
      efficiency: 0.9,
    }),
  },
};

export const STAGE_ORDER: StageType[] = [
  "spur",
  "planetary",
  "harmonic",
  "cycloidal",
  "worm",
  "belt",
  "leadscrew",
  "ballscrew",
];

export interface MotorTypeInfo {
  type: MotorType;
  label: string;
  tagline: string;
  description: string;
  pros: string[];
  cons: string[];
  usedIn: string;
  color: string;
  /**
   * Typical real-world parameters for this motor family. Loaded when the user
   * switches type, so the choice VISIBLY changes the machine's personality —
   * a brushed toy motor, a robot-grade BLDC, and a stepper behave nothing alike.
   */
  defaults: Omit<Motor, "type" | "name">;
}

export const MOTOR_TYPES: Record<MotorType, MotorTypeInfo> = {
  "brushed-dc": {
    type: "brushed-dc",
    label: "Brushed DC",
    tagline: "The simplest motor — two wires, spins when powered.",
    description:
      "A brushed DC motor uses physical carbon brushes and a commutator to switch current through the " +
      "rotor windings as it spins. Dead simple to drive (just apply voltage) and cheap, but the brushes " +
      "wear out and spark. Torque falls off linearly as it speeds up — the classic straight torque–speed line.",
    pros: ["Trivially simple to drive", "Cheap", "Good torque at low speed"],
    cons: ["Brushes wear out", "Electrical noise/sparking", "Lower efficiency"],
    usedIn: "Toys, hobby robots, cheap gearmotors",
    color: "#f87171",
    defaults: {
      // a classic 380-size hobby motor: screams at ~14k rpm, almost no torque
      voltage: 12,
      kv: 1200,
      resistance: 1.8,
      noLoadCurrent: 0.2,
      currentLimit: 5,
      rotorInertia: 6,
      mass: 120,
      stepsPerRev: undefined,
    },
  },
  bldc: {
    type: "bldc",
    label: "Brushless DC (BLDC)",
    tagline: "Electronically commutated — efficient, powerful, precise.",
    description:
      "A brushless motor moves the windings to the stator and puts magnets on the rotor, switching phases " +
      "electronically instead of with brushes. No brushes means no wear, less heat, and high efficiency and " +
      "power density — but it needs a smart controller (ESC / FOC drive). The workhorse of modern robotics, " +
      "drones, and EVs. Low-Kv 'gimbal' style BLDCs power quasi-direct-drive robot legs.",
    pros: ["No brush wear", "High efficiency & power density", "Precise control (FOC)"],
    cons: ["Needs electronic controller", "More complex", "Costlier"],
    usedIn: "Drones, EVs, legged robots, CNC spindles",
    color: "#60a5fa",
    defaults: {
      // a robot-grade outrunner: strong, efficient, controller-driven
      voltage: 24,
      kv: 190,
      resistance: 0.15,
      noLoadCurrent: 0.6,
      currentLimit: 20,
      rotorInertia: 30,
      mass: 300,
      stepsPerRev: undefined,
    },
  },
  stepper: {
    type: "stepper",
    label: "Stepper",
    tagline: "Moves in discrete steps — precise open-loop positioning.",
    description:
      "A stepper motor has many magnetic poles and moves one fixed 'step' per control pulse (commonly 200 " +
      "steps/rev = 1.8°). That lets it hit exact positions with no encoder, which is why 3D printers and small " +
      "CNCs love them. It has strong holding torque at rest, but torque drops off quickly with speed and it can " +
      "silently 'lose steps' if overloaded.",
    pros: ["Precise open-loop position", "Strong holding torque", "No encoder needed"],
    cons: ["Torque falls with speed", "Can lose steps", "Draws current even when still"],
    usedIn: "3D printers, small CNC, camera rigs, lab automation",
    color: "#4ade80",
    defaults: {
      // a NEMA-17: slow, deliberate, strong when holding still
      voltage: 24,
      kv: 30,
      resistance: 2,
      noLoadCurrent: 0.1,
      currentLimit: 1.5,
      rotorInertia: 54,
      mass: 350,
      stepsPerRev: 200,
    },
  },
};
