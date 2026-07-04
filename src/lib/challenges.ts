// ---------------------------------------------------------------------------
// Design challenges — practical missions checked LIVE against the user's
// current design. Each one forces a real engineering trade-off and explains
// what was learned once it passes.
// ---------------------------------------------------------------------------

import type { ActuatorDesign, DriveResult } from "./types";
import { fmt, ratioLabel } from "./physics";

export interface Requirement {
  label: string;
  /** Live current value, formatted. */
  current: (design: ActuatorDesign, drive: DriveResult) => string;
  ok: (design: ActuatorDesign, drive: DriveResult) => boolean;
}

export interface Challenge {
  id: string;
  title: string;
  /** The mission, in one sentence. */
  brief: string;
  /** What trade-off this teaches. */
  teaches: string;
  hint: string;
  /** Shown on completion. */
  lesson: string;
  requirements: Requirement[];
}

const kg = (m: number, armCm: number) => m * 9.81 * (armCm / 100); // N·m to hold m at armCm

export const CHALLENGES: Challenge[] = [
  {
    id: "first-torque",
    title: "First muscle",
    brief: "Build a rotary actuator with at least 5 N·m of stall torque.",
    teaches: "Gearing multiplies torque",
    hint: "The default motor alone won't get there — add a gear stage, or raise an existing stage's ratio (more driven teeth, bigger sun-to-ring gap…).",
    lesson:
      "Motors are torque-poor and speed-rich. Nearly every robot joint you'll ever meet exists because a gearbox traded useless speed for useful twist.",
    requirements: [
      {
        label: "Stall torque ≥ 5 N·m",
        current: (_, d) => `${fmt(d.stallTorque, 2)} N·m`,
        ok: (_, d) => d.stallTorque >= 5,
      },
      {
        label: "Rotary output (no screw stage)",
        current: (_, d) => (d.isLinear ? "linear" : "rotary"),
        ok: (_, d) => !d.isLinear,
      },
    ],
  },
  {
    id: "sugar-bag",
    title: "Hold the sugar",
    brief: "Hold a 2 kg bag at the end of a 15 cm arm — and still turn at 60 rpm with no load.",
    teaches: "The torque ↔ speed trade-off",
    hint: `Holding 2 kg at 15 cm needs ${fmt(kg(2, 15), 1)} N·m. Gearing up gets torque but eats speed — find the ratio that clears BOTH bars.`,
    lesson:
      "This is the fundamental bargain of every drivetrain: strength and speed pull in opposite directions, and the gear ratio is the knob that trades one for the other.",
    requirements: [
      {
        label: `Stall torque ≥ ${fmt(kg(2, 15), 1)} N·m (2 kg @ 15 cm)`,
        current: (_, d) => `${fmt(d.stallTorque, 2)} N·m`,
        ok: (_, d) => d.stallTorque >= kg(2, 15),
      },
      {
        label: "No-load speed ≥ 60 rpm",
        current: (_, d) => `${fmt(d.noLoadSpeed, 0)} rpm`,
        ok: (_, d) => d.noLoadSpeed >= 60,
      },
      { label: "Rotary output", current: (_, d) => (d.isLinear ? "linear" : "rotary"), ok: (_, d) => !d.isLinear },
    ],
  },
  {
    id: "cat-leg",
    title: "Build a cat leg",
    brief: "A leg joint that can kick hard (≥ 15 N·m) yet stays soft to the touch — like the Mini Cheetah's.",
    teaches: "Quasi-direct drive",
    hint: "High ratios kill backdrivability. Keep the TOTAL ratio at 10:1 or less, and get your torque from the motor instead: big current limit, low Kv.",
    lesson:
      "You just reinvented the quasi-direct-drive actuator. A muscular motor with a whisper of gearing feels the ground, survives impacts, and made modern legged robots possible.",
    requirements: [
      {
        label: "Stall torque ≥ 15 N·m",
        current: (_, d) => `${fmt(d.stallTorque, 1)} N·m`,
        ok: (_, d) => d.stallTorque >= 15,
      },
      {
        label: "Total ratio ≤ 10:1",
        current: (_, d) => ratioLabel(d.totalRatio),
        ok: (_, d) => d.totalRatio <= 10,
      },
      {
        label: "Backdrivability good or better",
        current: (_, d) => d.backdrive,
        ok: (_, d) => d.backdrive === "excellent" || d.backdrive === "good",
      },
    ],
  },
  {
    id: "surgeon",
    title: "Surgeon's wrist",
    brief: "A precision joint: at least 20 N·m with under 2 arc-minutes of backlash.",
    teaches: "Precision gearing",
    hint: "Every spur or planetary stage ADDS slop. One zero-backlash stage type gets you a huge ratio with almost none — check the harmonic drive and cycloidal.",
    lesson:
      "Backlash accumulates stage by stage, which is why precision machines pay for exotic single-stage reducers. This is the exact reason harmonic drives rule robot-arm wrists.",
    requirements: [
      {
        label: "Stall torque ≥ 20 N·m",
        current: (_, d) => `${fmt(d.stallTorque, 1)} N·m`,
        ok: (_, d) => d.stallTorque >= 20,
      },
      {
        label: "Backlash ≤ 2 arcmin",
        current: (_, d) => `${fmt(d.backlash, 1)} arcmin`,
        ok: (_, d) => d.backlash <= 2,
      },
    ],
  },
  {
    id: "power-off-hold",
    title: "Hold with the power off",
    brief: "A joint that keeps ≥ 8 N·m of grip even when unplugged — no brakes allowed.",
    teaches: "Self-locking mechanisms",
    hint: "Some stages physically can't be driven backwards — friction acts as a one-way valve. A worm drive (or an inefficient lead screw) self-locks for free.",
    lesson:
      "Self-locking is free holding force paid for in efficiency. Winches, lifts and camera mounts all exploit it — and it's why your guitar stays in tune.",
    requirements: [
      {
        label: "Self-locking drivetrain",
        current: (_, d) => d.backdrive,
        ok: (_, d) => d.backdrive === "none",
      },
      {
        label: "Stall torque ≥ 8 N·m",
        current: (_, d) => `${fmt(d.stallTorque, 1)} N·m`,
        ok: (_, d) => d.stallTorque >= 8,
      },
      { label: "Rotary output", current: (_, d) => (d.isLinear ? "linear" : "rotary"), ok: (_, d) => !d.isLinear },
    ],
  },
  {
    id: "elevator",
    title: "Mini freight lift",
    brief: "A linear actuator that pushes with ≥ 800 N and holds position unpowered.",
    teaches: "Rotary → linear conversion",
    hint: "End the chain with a lead screw. Force = torque ÷ lead (roughly), so a smaller lead OR more gearing upstream multiplies your push.",
    lesson:
      "A screw is a circular ramp: gentle slope (small lead) = huge force, slow travel — and enough friction to park a load forever. That's a 3D-printer Z-axis and a car jack in one idea.",
    requirements: [
      {
        label: "Linear output ≥ 800 N",
        current: (_, d) => (d.isLinear ? `${fmt(d.linear?.stallForce ?? 0, 0)} N` : "not linear"),
        ok: (_, d) => d.isLinear && (d.linear?.stallForce ?? 0) >= 800,
      },
      {
        label: "Self-locking (holds unpowered)",
        current: (_, d) => d.backdrive,
        ok: (_, d) => d.backdrive === "none",
      },
    ],
  },
  {
    id: "speed-demon",
    title: "Speed demon",
    brief: "Spin the output at 2,000+ rpm while keeping at least 0.5 N·m of stall torque.",
    teaches: "When NOT to gear down",
    hint: "Gearing steals speed — use as little as possible (or none) and pick motor numbers that make torque directly: Kv, voltage and current limit are your levers.",
    lesson:
      "Not every job wants a gearbox. Fans, spindles and propellers run direct-drive because reduction would throw away exactly the thing they need most.",
    requirements: [
      {
        label: "No-load speed ≥ 2,000 rpm",
        current: (_, d) => `${fmt(d.noLoadSpeed, 0)} rpm`,
        ok: (_, d) => d.noLoadSpeed >= 2000,
      },
      {
        label: "Stall torque ≥ 0.5 N·m",
        current: (_, d) => `${fmt(d.stallTorque, 2)} N·m`,
        ok: (_, d) => d.stallTorque >= 0.5,
      },
      { label: "Rotary output", current: (_, d) => (d.isLinear ? "linear" : "rotary"), ok: (_, d) => !d.isLinear },
    ],
  },
  {
    id: "efficiency-run",
    title: "The efficiency run",
    brief: "Reach a 40:1 total ratio while keeping drivetrain efficiency at 85% or better.",
    teaches: "Efficiency compounds",
    hint: "Efficiencies MULTIPLY: two 95% stages keep 90%. A worm gets 40:1 in one go but burns ~40% as heat — stack efficient planetary stages instead.",
    lesson:
      "Losses compound silently, which is why battery-powered robots stack a few efficient stages instead of one lossy shortcut. Heat is the tax on lazy gearing.",
    requirements: [
      {
        label: "Total ratio ≥ 40:1",
        current: (_, d) => ratioLabel(d.totalRatio),
        ok: (_, d) => d.totalRatio >= 40,
      },
      {
        label: "Drivetrain efficiency ≥ 85%",
        current: (_, d) => `${fmt(d.totalEfficiency * 100, 0)}%`,
        ok: (_, d) => d.totalEfficiency >= 0.85,
      },
    ],
  },
];

export const CHALLENGES_BY_ID: Record<string, Challenge> = Object.fromEntries(CHALLENGES.map((c) => [c.id, c]));
