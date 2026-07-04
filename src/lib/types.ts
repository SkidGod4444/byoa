// ---------------------------------------------------------------------------
// BYOA — core domain types
//
// An "actuator" is modeled as a MOTOR (the power source) followed by an ordered
// stack of TRANSMISSION STAGES (gearboxes / screws) that trade speed for torque.
// Everything the app computes and draws derives from this single object.
// ---------------------------------------------------------------------------

export type MotorType = "brushed-dc" | "bldc" | "stepper";

export interface Motor {
  type: MotorType;
  name: string;
  /** Nominal supply voltage [V] */
  voltage: number;
  /** Velocity constant [rpm/V]. Kt (torque constant) is derived from this. */
  kv: number;
  /** Terminal / phase resistance [Ohm] */
  resistance: number;
  /** No-load current [A] — the current used to overcome internal friction. */
  noLoadCurrent: number;
  /** Drive current limit [A] — caps torque at low speed (constant-torque region). */
  currentLimit: number;
  /** Rotor mass moment of inertia [kg·mm²] (used for reflected-inertia teaching). */
  rotorInertia: number;
  /** Motor mass [g] */
  mass: number;
  /** Steps per revolution — only meaningful for steppers. */
  stepsPerRev?: number;
}

export type StageType =
  | "spur"
  | "planetary"
  | "harmonic"
  | "cycloidal"
  | "worm"
  | "belt"
  | "leadscrew"
  | "ballscrew";

export interface Stage {
  id: string;
  type: StageType;
  /** Reduction ratio (output turns N× slower than input). Screws use `lead` instead. */
  ratio: number;
  /** Mechanical efficiency of this stage, 0–1. */
  efficiency: number;

  // --- Optional geometry, used for visualization + to *derive* the ratio ---
  /** Spur / belt: driving element tooth count. */
  teethIn?: number;
  /** Spur / belt: driven element tooth count. */
  teethOut?: number;
  /** Planetary: sun gear teeth. */
  sunTeeth?: number;
  /** Planetary: planet gear teeth. */
  planetTeeth?: number;
  /** Planetary: number of planet gears. */
  planetCount?: number;
  /** Worm: number of starts (threads) on the worm. */
  wormStarts?: number;
  /** Screws: lead — linear travel per revolution [mm/rev]. */
  lead?: number;
}

/** Exterior shell style — gives example actuators their real product look. */
export type CoverStyle =
  | "qdd-pancake" // MIT Mini-Cheetah style gold pancake
  | "smart-servo" // Dynamixel-style plastic case with output horn
  | "harmonic-module" // industrial rotary joint module
  | "nema17" // square-bodied stepper
  | "damiao-pancake"; // OpenArm / Damiao integrated joint motor

export interface ActuatorDesign {
  id: string;
  name: string;
  motor: Motor;
  stages: Stage[];
  /** Optional product-style exterior shell (used by the example presets). */
  cover?: CoverStyle;
}

// ---------------------------------------------------------------------------
// Derived / computed results
// ---------------------------------------------------------------------------

export interface OperatingPoint {
  /** Output shaft speed [rpm] (rotary) */
  speed: number;
  /** Output torque [N·m] (rotary) */
  torque: number;
  /** Motor current draw [A] */
  current: number;
  /** Mechanical output power [W] */
  powerOut: number;
  /** Electrical input power [W] */
  powerIn: number;
  /** Efficiency 0–1 */
  efficiency: number;
}

export type BackdriveRating = "excellent" | "good" | "moderate" | "poor" | "none";

export interface DriveResult {
  /** Product of every stage's reduction ratio. */
  totalRatio: number;
  /** Product of every stage's efficiency, 0–1. */
  totalEfficiency: number;
  /** Motor characteristics (already derived). */
  motor: MotorDerived;
  /** Output torque–speed curve, sampled. */
  curve: OperatingPoint[];
  /** Peak-power operating point on the curve. */
  peakPower: OperatingPoint;
  /** Peak-efficiency operating point on the curve. */
  peakEfficiency: OperatingPoint;
  /** Stall (zero-speed) output torque [N·m]. */
  stallTorque: number;
  /** No-load output speed [rpm]. */
  noLoadSpeed: number;
  /** Total estimated backlash [arc-minutes]. */
  backlash: number;
  backdrive: BackdriveRating;
  /** Reflected inertia at the output, motor inertia × ratio² [kg·mm²]. */
  reflectedInertia: number;
  /** True when the drivetrain ends in a screw → linear output. */
  isLinear: boolean;
  /** Linear output (only when isLinear). */
  linear?: {
    /** Peak (stall) force [N]. */
    stallForce: number;
    /** No-load linear speed [mm/s]. */
    noLoadSpeed: number;
  };
}

export interface MotorDerived {
  /** Torque constant [N·m/A]. */
  kt: number;
  /** No-load speed at nominal voltage [rpm]. */
  noLoadSpeed: number;
  /** Stall torque at nominal voltage [N·m]. */
  stallTorque: number;
  /** Stall current [A]. */
  stallCurrent: number;
  /** Peak mechanical power [W]. */
  peakPower: number;
}
