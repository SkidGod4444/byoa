// ---------------------------------------------------------------------------
// Real-world actuator presets. Each is a teachable example of a design pattern
// used in real robots, with numbers chosen to land near the real hardware and
// a `cover` shell so the 3D model wears the product's recognizable exterior.
// ---------------------------------------------------------------------------

import type { ActuatorDesign } from "./types";

export interface Preset {
  design: ActuatorDesign;
  /** Why this design exists — the engineering story. */
  story: string;
  tags: string[];
}

let n = 0;
const id = () => `preset-stage-${n++}`;

export const PRESETS: Preset[] = [
  {
    story:
      "The quasi-direct-drive (QDD) actuator that made agile legged robots like MIT's Mini Cheetah " +
      "possible. A big low-Kv brushless motor paired with just a single low-ratio planetary stage. The " +
      "small reduction keeps it highly backdrivable and 'transparent' — the leg can feel the ground and " +
      "absorb impacts, and torque can be controlled precisely by controlling motor current.",
    tags: ["legged robot", "backdrivable", "force control"],
    design: {
      id: "qdd-mini-cheetah",
      name: "Quasi-Direct-Drive Leg (Mini Cheetah style)",
      cover: "qdd-pancake",
      motor: {
        type: "bldc",
        name: "Low-Kv BLDC",
        voltage: 24,
        kv: 100,
        resistance: 0.1,
        noLoadCurrent: 0.8,
        currentLimit: 40,
        rotorInertia: 45,
        mass: 500,
      },
      stages: [
        {
          id: id(),
          type: "planetary",
          sunTeeth: 12,
          planetTeeth: 24,
          planetCount: 3,
          ratio: 6,
          efficiency: 0.95,
        },
      ],
    },
  },
  {
    story:
      "The shoulder joint of OpenArm — Enactic's open-source 7-DoF humanoid arm for physical-AI research. " +
      "It uses a Damiao DM-J8009P integrated joint motor: a large-diameter BLDC, a 9:1 planetary reduction, " +
      "dual magnetic encoders and a CAN 'MIT-mode' driver, all inside one black pancake. The low QDD ratio " +
      "keeps the whole arm backdrivable, so it's safe to work around people (~40 N·m peak at the joint).",
    tags: ["OpenArm", "QDD", "humanoid arm"],
    design: {
      id: "openarm-shoulder",
      name: "OpenArm Shoulder (Damiao DM-J8009P)",
      cover: "damiao-pancake",
      motor: {
        type: "bldc",
        name: "Damiao 8009 BLDC",
        voltage: 48,
        kv: 45,
        resistance: 0.25,
        noLoadCurrent: 1,
        currentLimit: 22,
        rotorInertia: 110,
        mass: 780,
      },
      stages: [
        {
          id: id(),
          type: "planetary",
          sunTeeth: 10,
          planetTeeth: 35,
          planetCount: 3,
          ratio: 9,
          efficiency: 0.95,
        },
      ],
    },
  },
  {
    story:
      "OpenArm's elbow-region joints use the Damiao DM-J4340: the same 43 mm motor family as the wrist, but " +
      "with a deeper ~40:1 two-stage planetary reduction packed into the can. That trades away some " +
      "backdrivability for a big jump in torque density (~27 N·m peak from a 370 g module) — a deliberate " +
      "compromise to hold a payload at arm's length while keeping the arm slim.",
    tags: ["OpenArm", "torque density", "40:1"],
    design: {
      id: "openarm-elbow",
      name: "OpenArm Elbow (Damiao DM-J4340)",
      cover: "damiao-pancake",
      motor: {
        type: "bldc",
        name: "Damiao 4340 BLDC",
        voltage: 48,
        kv: 60,
        resistance: 0.8,
        noLoadCurrent: 0.4,
        currentLimit: 5.2,
        rotorInertia: 28,
        mass: 370,
      },
      stages: [
        {
          id: id(),
          type: "planetary",
          sunTeeth: 10,
          planetTeeth: 25,
          planetCount: 3,
          ratio: 7,
          efficiency: 0.95,
        },
        {
          id: id(),
          type: "planetary",
          sunTeeth: 12,
          planetTeeth: 23,
          planetCount: 3,
          ratio: 5.83,
          efficiency: 0.95,
        },
      ],
    },
  },
  {
    story:
      "OpenArm's wrist and gripper joints use the small Damiao DM-J4310 (a 57 mm, 325 g module with a 10:1 " +
      "planetary). Distal joints get carried by every joint below them, so grams matter more than newton-" +
      "metres out here — a light, moderately-geared, still-backdrivable QDD module is the right call.",
    tags: ["OpenArm", "wrist", "lightweight"],
    design: {
      id: "openarm-wrist",
      name: "OpenArm Wrist (Damiao DM-J4310)",
      cover: "damiao-pancake",
      motor: {
        type: "bldc",
        name: "Damiao 4310 BLDC",
        voltage: 24,
        kv: 125,
        resistance: 0.55,
        noLoadCurrent: 0.3,
        currentLimit: 11.5,
        rotorInertia: 20,
        mass: 325,
      },
      stages: [
        {
          id: id(),
          type: "planetary",
          sunTeeth: 8,
          planetTeeth: 32,
          planetCount: 3,
          ratio: 10,
          efficiency: 0.95,
        },
      ],
    },
  },
  {
    story:
      "A 'smart servo' like the Dynamixel modules that hobby and research robots use for arms and hands. " +
      "A tiny high-speed coreless DC motor is tamed by a long spur-gear train (~190:1) to produce usable " +
      "torque at slow, controllable speeds — all packed into one small module with a built-in controller " +
      "and position sensor.",
    tags: ["servo", "robot arm", "position control"],
    design: {
      id: "smart-servo",
      name: "Smart Servo (Dynamixel style)",
      cover: "smart-servo",
      motor: {
        type: "brushed-dc",
        name: "Coreless DC",
        voltage: 12,
        kv: 1500,
        resistance: 2,
        noLoadCurrent: 0.05,
        currentLimit: 4,
        rotorInertia: 1.2,
        mass: 80,
      },
      stages: [
        { id: id(), type: "spur", teethIn: 12, teethOut: 60, ratio: 5, efficiency: 0.9 },
        { id: id(), type: "spur", teethIn: 12, teethOut: 84, ratio: 7, efficiency: 0.9 },
        { id: id(), type: "spur", teethIn: 13, teethOut: 72, ratio: 5.54, efficiency: 0.9 },
      ],
    },
  },
  {
    story:
      "The classic industrial robot-arm joint. A brushless motor drives a harmonic (strain-wave) drive at " +
      "100:1 in a single thin stage with essentially zero backlash — so the arm can repeat a position to " +
      "fractions of a millimetre. The trade-off is that it's hard to backdrive, so this joint holds precise " +
      "positions rather than feeling forces.",
    tags: ["industrial arm", "precision", "zero backlash"],
    design: {
      id: "harmonic-joint",
      name: "Precision Arm Joint (Harmonic Drive)",
      cover: "harmonic-module",
      motor: {
        type: "bldc",
        name: "Servo BLDC",
        voltage: 48,
        kv: 60,
        resistance: 0.3,
        noLoadCurrent: 0.5,
        currentLimit: 15,
        rotorInertia: 80,
        mass: 800,
      },
      stages: [{ id: id(), type: "harmonic", ratio: 100, efficiency: 0.8 }],
    },
  },
  {
    story:
      "A linear actuator for a 3D printer Z-axis or a small automation stage. A stepper motor gives precise, " +
      "open-loop steps, and a lead screw converts each turn into a tiny, forceful linear move. The screw's " +
      "friction makes it self-locking, so the axis holds its height even with the power off.",
    tags: ["linear", "stepper", "3D printer"],
    design: {
      id: "linear-stepper",
      name: "Linear Z-Axis (Stepper + Lead Screw)",
      cover: "nema17",
      motor: {
        type: "stepper",
        name: "NEMA-17 Stepper",
        voltage: 24,
        kv: 29.7,
        resistance: 2,
        noLoadCurrent: 0.1,
        currentLimit: 1.5,
        rotorInertia: 54,
        mass: 350,
        stepsPerRev: 200,
      },
      stages: [{ id: id(), type: "leadscrew", lead: 2, ratio: 1, efficiency: 0.5 }],
    },
  },
];

/** Blank starting design for the builder. */
export function blankDesign(): ActuatorDesign {
  return {
    id: "custom",
    name: "My Actuator",
    motor: {
      type: "bldc",
      name: "BLDC Motor",
      voltage: 24,
      kv: 190,
      resistance: 0.15,
      noLoadCurrent: 0.6,
      currentLimit: 20,
      rotorInertia: 30,
      mass: 300,
    },
    stages: [
      {
        id: "stage-0",
        type: "planetary",
        sunTeeth: 12,
        planetTeeth: 18,
        planetCount: 3,
        ratio: 4,
        efficiency: 0.95,
      },
    ],
  };
}
