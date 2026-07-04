// ---------------------------------------------------------------------------
// Physics engine.
//
// Motor model: a DC/BLDC motor is modeled with the standard linear
// torque–speed relationship derived from the electrical equation
//     V = I·R + Kt·ω           (Kt·ω is the back-EMF)
//     τ = Kt·(I − I₀)          (torque = torque constant × useful current)
// From the user-friendly inputs (voltage, Kv, resistance, no-load current) we
// derive Kt, the no-load speed, stall torque, and a sampled torque–speed curve.
// A drivetrain then scales that curve: torque ×(ratio·η), speed ÷ratio.
// ---------------------------------------------------------------------------

import { STAGE_TYPES } from "./catalog";
import type {
  ActuatorDesign,
  BackdriveRating,
  DriveResult,
  Motor,
  MotorDerived,
  OperatingPoint,
  Stage,
} from "./types";

/** Kt [N·m/A] from Kv [rpm/V].  Kt = 60 / (2π · Kv). */
export function ktFromKv(kv: number): number {
  return 60 / (2 * Math.PI * kv);
}

const RPM_TO_RADS = (2 * Math.PI) / 60;

export function deriveMotor(motor: Motor): MotorDerived {
  const kt = ktFromKv(motor.kv);
  // The voltage alone would push V/R amps at stall, but the drive clamps it.
  const voltageStallCurrent = motor.voltage / motor.resistance;
  const stallCurrent = Math.min(voltageStallCurrent, motor.currentLimit);
  const stallTorque = kt * Math.max(0, stallCurrent - motor.noLoadCurrent);
  // No-load speed = the speed where τ reaches 0, i.e. I = I₀:
  //   V = I₀·R + Kt·ω  →  ω = (V − I₀·R) / Kt
  const noLoadRads = (motor.voltage - motor.noLoadCurrent * motor.resistance) / kt;
  const noLoadSpeed = Math.max(0, noLoadRads / RPM_TO_RADS);
  // Peak power found by sampling (the current limit makes it non-analytic).
  let peakPower = 0;
  for (let i = 0; i <= 40; i++) {
    const p = motorPointAtSpeed(motor, { kt, noLoadSpeed, stallTorque, stallCurrent, peakPower: 0 }, (noLoadSpeed * i) / 40);
    if (p.powerOut > peakPower) peakPower = p.powerOut;
  }
  return { kt, noLoadSpeed, stallTorque, stallCurrent, peakPower };
}

/**
 * Motor operating point at a given shaft speed [rpm] (before any gearing).
 * Models a servo-driven motor: at low speed the drive current-limits (flat,
 * constant-torque region); above the "corner speed" the back-EMF limits current
 * and torque droops linearly toward the no-load speed — exactly the shape real
 * FOC-driven robot actuators produce. Steppers reuse this as an approximation.
 */
function motorPointAtSpeed(motor: Motor, d: MotorDerived, speedRpm: number): OperatingPoint {
  const omega = speedRpm * RPM_TO_RADS;
  // Current the voltage would drive at this speed, from V = I·R + Kt·ω.
  const voltageCurrent = Math.max(0, (motor.voltage - d.kt * omega) / motor.resistance);
  // The drive can't exceed its current limit.
  const current = Math.min(voltageCurrent, motor.currentLimit);
  const torque = Math.max(0, d.kt * (current - motor.noLoadCurrent));
  const powerOut = torque * omega;
  const powerIn = motor.voltage * current;
  const efficiency = powerIn > 1e-6 ? Math.min(1, powerOut / powerIn) : 0;
  return { speed: speedRpm, torque, current, powerOut, powerIn, efficiency };
}

/** Effective reduction ratio of a stage, derived from geometry when present. */
export function stageRatio(stage: Stage): number {
  switch (stage.type) {
    case "spur":
    case "belt":
      if (stage.teethIn && stage.teethOut) return stage.teethOut / stage.teethIn;
      return stage.ratio;
    case "planetary": {
      if (stage.sunTeeth && stage.planetTeeth) {
        const ring = stage.sunTeeth + 2 * stage.planetTeeth;
        return 1 + ring / stage.sunTeeth;
      }
      return stage.ratio;
    }
    case "worm":
      if (stage.teethOut && stage.wormStarts) return stage.teethOut / stage.wormStarts;
      return stage.ratio;
    case "leadscrew":
    case "ballscrew":
      // Screws convert to linear — treated as ratio 1 in the rotary chain;
      // the linear conversion happens in computeDrive() using `lead`.
      return 1;
    default:
      return stage.ratio;
  }
}

/** Ring gear tooth count for a planetary stage (derived). */
export function planetaryRingTeeth(stage: Stage): number | undefined {
  if (stage.type !== "planetary" || !stage.sunTeeth || !stage.planetTeeth) return undefined;
  return stage.sunTeeth + 2 * stage.planetTeeth;
}

function backdriveRating(totalRatio: number, hasSelfLocking: boolean, efficiency: number): BackdriveRating {
  if (hasSelfLocking) return "none";
  // Reflected friction and inertia scale roughly with ratio; efficiency erodes it further.
  const index = totalRatio / Math.max(0.2, efficiency);
  if (index < 8) return "excellent";
  if (index < 20) return "good";
  if (index < 50) return "moderate";
  if (index < 120) return "poor";
  return "none";
}

const CURVE_SAMPLES = 60;

/**
 * The heart of the app: fold the whole drivetrain into output specs and a
 * torque–speed curve. Pure function of the design.
 */
export function computeDrive(design: ActuatorDesign): DriveResult {
  const d = deriveMotor(design.motor);

  let totalRatio = 1;
  let totalEfficiency = 1;
  let backlash = 0;
  let hasSelfLocking = false;
  let isLinear = false;
  let screwLead = 0;
  let screwEff = 1;

  for (const stage of design.stages) {
    const info = STAGE_TYPES[stage.type];
    totalEfficiency *= stage.efficiency;
    backlash += info.typicalBacklash;
    // A worm or lead screw with poor efficiency effectively self-locks.
    if ((stage.type === "worm" || stage.type === "leadscrew") && stage.efficiency <= 0.55) {
      hasSelfLocking = true;
    }
    if (info.linear) {
      isLinear = true;
      screwLead = stage.lead ?? 2;
      screwEff = stage.efficiency;
    } else {
      totalRatio *= stageRatio(stage);
    }
  }

  // Build the output torque–speed curve by scaling the motor curve.
  const outNoLoadSpeed = d.noLoadSpeed / totalRatio;
  const curve: OperatingPoint[] = [];
  for (let i = 0; i <= CURVE_SAMPLES; i++) {
    const speedRpm = (d.noLoadSpeed * i) / CURVE_SAMPLES;
    const mp = motorPointAtSpeed(design.motor, d, speedRpm);
    curve.push({
      speed: speedRpm / totalRatio,
      torque: mp.torque * totalRatio * totalEfficiency,
      current: mp.current,
      powerOut: mp.powerOut * totalEfficiency,
      powerIn: mp.powerIn,
      efficiency: mp.efficiency * totalEfficiency,
    });
  }

  const stallTorque = d.stallTorque * totalRatio * totalEfficiency;
  const peakPower = curve.reduce((a, b) => (b.powerOut > a.powerOut ? b : a), curve[0]);
  const peakEfficiency = curve.reduce((a, b) => (b.efficiency > a.efficiency ? b : a), curve[0]);
  const reflectedInertia = design.motor.rotorInertia * totalRatio * totalRatio;
  const backdrive = backdriveRating(totalRatio, hasSelfLocking, totalEfficiency);

  const result: DriveResult = {
    totalRatio,
    totalEfficiency,
    motor: d,
    curve,
    peakPower,
    peakEfficiency,
    stallTorque,
    noLoadSpeed: outNoLoadSpeed,
    backlash,
    backdrive,
    reflectedInertia,
    isLinear,
  };

  if (isLinear && screwLead > 0) {
    // Rotary output torque [N·m] → linear force via a screw of lead L [mm]:
    //   F = 2π · η · τ / L(m)
    const leadM = screwLead / 1000;
    const stallForce = (2 * Math.PI * screwEff * stallTorque) / leadM;
    // Linear speed [mm/s] = output rev/s × lead[mm]
    const noLoadLinear = (outNoLoadSpeed / 60) * screwLead;
    result.linear = { stallForce, noLoadSpeed: noLoadLinear };
  }

  return result;
}

// ---- formatting helpers -----------------------------------------------------

// Deterministic formatting (no toLocaleString → no SSR/CSR hydration mismatch,
// since the default locale can differ between Node and the browser).
export function fmt(n: number, digits = 1): string {
  if (!isFinite(n)) return "—";
  const abs = Math.abs(n);
  if (abs !== 0 && abs < 0.01) return n.toExponential(1);
  // Compact huge values so a 3,000,000:1 gear stack doesn't overflow the UI.
  if (abs >= 1e9) return `${fmt(n / 1e9, Math.abs(n / 1e9) < 10 ? 1 : 0)}B`;
  if (abs >= 1e6) return `${fmt(n / 1e6, Math.abs(n / 1e6) < 10 ? 1 : 0)}M`;
  const p = Math.pow(10, abs >= 10000 ? 0 : digits);
  const rounded = Math.round(n * p) / p;
  const [intPart, decPart] = Math.abs(rounded).toString().split(".");
  const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return (rounded < 0 ? "-" : "") + grouped + (decPart ? "." + decPart : "");
}

export function ratioLabel(r: number): string {
  return `${fmt(r, r < 10 ? 2 : 1)}:1`;
}

/**
 * Quantize a computed SVG coordinate to a fixed grid so it serializes to the
 * exact same string on the server and the client. Trig functions (sin/cos/…)
 * are not guaranteed bit-identical across JS engines, so unrounded inline
 * coordinates cause React hydration mismatches. Rounding kills that.
 */
export function q(n: number): number {
  return Math.round(n * 1000) / 1000;
}
