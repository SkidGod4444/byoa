// ---------------------------------------------------------------------------
// Dynamic simulation + stress analysis.
//
// The rest of the app reports STATIC numbers (stall torque, top speed). These
// two functions make the physics *felt*: simulateMove() actually swings a
// loaded joint to a target and integrates the motion, so reflected inertia and
// the torque–speed curve produce visible behaviour; stressTest() surfaces the
// real limits (heat, step-loss, backlash, hold margin) that specs alone hide.
// ---------------------------------------------------------------------------

import { ktFromKv } from "./physics";
import type { ActuatorDesign, DriveResult } from "./types";

const G = 9.81;
const DEG = Math.PI / 180;

export interface MoveOptions {
  /** Payload mass at the end of the arm [kg]. */
  mass: number;
  /** Arm length from joint to payload [m]. */
  armLen: number;
  /** Start angle [deg] (0 = horizontal, +up). */
  startDeg: number;
  /** Target angle [deg]. */
  targetDeg: number;
}

export interface MoveSample {
  t: number;
  angleDeg: number;
  /** Output speed [rpm]. */
  speed: number;
  /** Applied output torque [N·m]. */
  torque: number;
}

export interface MoveResult {
  samples: MoveSample[];
  /** Time to settle within ±2% of target [s], or null if never. */
  settleTime: number | null;
  /** Overshoot past target [% of travel]. */
  overshoot: number;
  /** Peak output speed reached [rpm]. */
  peakSpeed: number;
  reached: boolean;
  /** Torque needed to hold the load at the worst angle [N·m]. */
  holdTorque: number;
  /** True if stall torque can hold the load at all. */
  canHold: boolean;
  /** J at the output: reflected motor inertia [kg·m²]. */
  reflected: number;
  /** J at the output: payload m·L² [kg·m²]. */
  payloadInertia: number;
  verdict: string;
}

/** Torque available at the output at a given |speed| [rpm], from the drive curve. */
function torqueAtSpeed(drive: DriveResult, rpm: number): number {
  const c = drive.curve;
  const s = Math.abs(rpm);
  if (s <= c[0].speed) return c[0].torque;
  const last = c[c.length - 1];
  if (s >= last.speed) return Math.max(0, last.torque);
  for (let i = 1; i < c.length; i++) {
    if (s <= c[i].speed) {
      const a = c[i - 1];
      const b = c[i];
      const f = (s - a.speed) / Math.max(1e-6, b.speed - a.speed);
      return a.torque + f * (b.torque - a.torque);
    }
  }
  return Math.max(0, last.torque);
}

export function simulateMove(design: ActuatorDesign, drive: DriveResult, opts: MoveOptions): MoveResult {
  const { mass: m, armLen: L } = opts;
  const reflected = drive.reflectedInertia * 1e-6; // kg·mm² → kg·m²
  const payloadInertia = m * L * L;
  const J = reflected + payloadInertia + 1e-6;

  const th0 = opts.startDeg * DEG;
  const tht = opts.targetDeg * DEG;
  const e0 = tht - th0;

  // PD gains that scale with the design: saturate near the start, ~critically damped.
  const Kp = Math.max(drive.stallTorque, 0.01) / Math.max(0.15, Math.abs(e0));
  const Kd = 2 * Math.sqrt(Kp * J);

  const dt = 0.002;
  const T_MAX = 6;
  let th = th0;
  let w = 0; // rad/s
  let peakSpeed = 0;
  let overshoot = 0;
  let lastOutside = 0;
  let settledFor = 0;
  const band = 0.02 * Math.abs(e0);

  const samples: MoveSample[] = [];
  const RECORD_EVERY = 6; // ~12 ms
  let step = 0;

  const holdTorque = m * G * L; // worst case: arm horizontal, cos=1
  const canHold = drive.stallTorque >= holdTorque;

  for (let t = 0; t <= T_MAX; t += dt, step++) {
    const e = tht - th;
    const tGrav = m * G * L * Math.cos(th);
    const tCmd = Kp * e - Kd * w + tGrav; // gravity feedforward
    const tMax = torqueAtSpeed(drive, (Math.abs(w) * 60) / (2 * Math.PI));
    const tApplied = Math.max(-tMax, Math.min(tMax, tCmd));
    const net = tApplied - tGrav;
    const alpha = net / J;
    w += alpha * dt;
    th += w * dt;

    peakSpeed = Math.max(peakSpeed, Math.abs(w));
    if (e0 > 0 && th > tht) overshoot = Math.max(overshoot, th - tht);
    if (e0 < 0 && th < tht) overshoot = Math.max(overshoot, tht - th);

    const settled = Math.abs(e) <= band && Math.abs(w) < 0.4;
    if (settled) {
      settledFor += dt;
    } else {
      settledFor = 0;
      lastOutside = t;
    }

    if (step % RECORD_EVERY === 0) {
      samples.push({
        t,
        angleDeg: th / DEG,
        speed: (w * 60) / (2 * Math.PI),
        torque: tApplied,
      });
    }
    // stop shortly after it has clearly settled
    if (settledFor > 0.25 && t > 0.3) {
      samples.push({ t, angleDeg: th / DEG, speed: (w * 60) / (2 * Math.PI), torque: tApplied });
      break;
    }
  }

  const reached = Math.abs(tht - th) <= Math.max(band, 0.5 * DEG);
  const settleTime = reached ? lastOutside : null;
  const overshootPct = Math.abs(e0) > 1e-6 ? (overshoot / Math.abs(e0)) * 100 : 0;
  const peakRpm = (peakSpeed * 60) / (2 * Math.PI);

  let verdict: string;
  if (!canHold) {
    verdict = `Too weak — it can't even hold ${m} kg at ${Math.round(L * 100)} cm (needs ${holdTorque.toFixed(1)} N·m, has ${drive.stallTorque.toFixed(1)}). The arm sags.`;
  } else if (!reached) {
    verdict = `It struggles — can't quite reach the target against gravity and its own reflected inertia within ${T_MAX}s.`;
  } else {
    const feel = overshootPct > 25 ? "overshoots and wobbles" : overshootPct > 8 ? "slightly overshoots" : "lands cleanly";
    verdict = `Reaches ${opts.targetDeg}° in ${settleTime!.toFixed(2)} s, ${feel} (${overshootPct.toFixed(0)}% overshoot), peaking at ${peakRpm.toFixed(0)} rpm.`;
  }

  return {
    samples,
    settleTime,
    overshoot: overshootPct,
    peakSpeed: peakRpm,
    reached,
    holdTorque,
    canHold,
    reflected,
    payloadInertia,
    verdict,
  };
}

// ---------------------------------------------------------------------------
// Stress test — the limits that a spec sheet hides.
// ---------------------------------------------------------------------------

export type StressSeverity = "ok" | "warn" | "bad";

export interface StressFinding {
  id: string;
  title: string;
  severity: StressSeverity;
  detail: string;
  /** Optional headline metric. */
  metric?: string;
}

export interface StressOptions {
  mass: number;
  armLen: number;
}

/** Fraction of peak current a motor can pass continuously without cooking. */
const CONT_FRACTION = 0.4;

export function stressTest(design: ActuatorDesign, drive: DriveResult, opts: StressOptions): StressFinding[] {
  const findings: StressFinding[] = [];
  const m = opts.mass;
  const L = opts.armLen;
  const motor = design.motor;
  const holdTorque = m * G * L;

  // 1) Gravity hold margin ------------------------------------------------------
  if (drive.isLinear && drive.linear) {
    const lift = m * G;
    const sf = drive.linear.stallForce / Math.max(1e-6, lift);
    findings.push({
      id: "hold",
      title: "Lift margin",
      severity: sf >= 2 ? "ok" : sf >= 1 ? "warn" : "bad",
      metric: `${sf.toFixed(1)}× safety factor`,
      detail:
        sf >= 2
          ? `Comfortably lifts ${m} kg (${lift.toFixed(0)} N) with ${sf.toFixed(1)}× headroom.`
          : sf >= 1
            ? `Lifts ${m} kg but with only ${sf.toFixed(1)}× margin — no room for friction or acceleration.`
            : `Can't lift ${m} kg — needs ${lift.toFixed(0)} N but makes ${drive.linear.stallForce.toFixed(0)} N.`,
    });
  } else {
    const sf = drive.stallTorque / Math.max(1e-6, holdTorque);
    findings.push({
      id: "hold",
      title: "Hold margin",
      severity: sf >= 2 ? "ok" : sf >= 1 ? "warn" : "bad",
      metric: `${sf.toFixed(1)}× safety factor`,
      detail:
        sf >= 2
          ? `Holds ${m} kg at ${Math.round(L * 100)} cm with ${sf.toFixed(1)}× headroom — safe against jolts.`
          : sf >= 1
            ? `Holds ${m} kg at ${Math.round(L * 100)} cm, but only ${sf.toFixed(1)}× over the limit. A bump could stall it.`
            : `Sags — holding ${m} kg at ${Math.round(L * 100)} cm needs ${holdTorque.toFixed(1)} N·m, it has ${drive.stallTorque.toFixed(1)}.`,
    });
  }

  // 2) Thermal / duty cycle -----------------------------------------------------
  const kt = ktFromKv(motor.kv);
  const contCurrent = motor.currentLimit * CONT_FRACTION;
  const contTorqueMotor = kt * Math.max(0, contCurrent - motor.noLoadCurrent);
  const contTorqueOut = contTorqueMotor * drive.totalRatio * drive.totalEfficiency;
  if (!drive.isLinear) {
    const ratio = holdTorque / Math.max(1e-6, contTorqueOut);
    findings.push({
      id: "thermal",
      title: "Heat & duty cycle",
      severity: ratio <= 1 ? "ok" : ratio <= 1.6 ? "warn" : "bad",
      metric: `peak ${drive.stallTorque.toFixed(1)} · cont. ${contTorqueOut.toFixed(1)} N·m`,
      detail:
        ratio <= 1
          ? `Holding this load sits inside the continuous rating (~${contTorqueOut.toFixed(1)} N·m) — it can run all day without overheating.`
          : ratio <= 1.6
            ? `Peak torque hits ${drive.stallTorque.toFixed(1)} N·m, but that's a burst rating. Holding ${holdTorque.toFixed(1)} N·m continuously is ${ratio.toFixed(1)}× the ~${contTorqueOut.toFixed(1)} N·m it can sustain — expect it to heat up and need rests.`
            : `Way past continuous: it makes ${drive.stallTorque.toFixed(1)} N·m for seconds, but can only hold ~${contTorqueOut.toFixed(1)} N·m without cooking (I²R heating). This load would overheat it fast.`,
    });
  }

  // 3) Stepper step-loss --------------------------------------------------------
  if (motor.type === "stepper") {
    const margin = drive.stallTorque / Math.max(1e-6, holdTorque);
    findings.push({
      id: "steps",
      title: "Step loss (open-loop)",
      severity: margin >= 2 ? "ok" : margin >= 1.3 ? "warn" : "bad",
      metric: `${margin.toFixed(1)}× torque margin`,
      detail:
        margin >= 2
          ? `Comfortable margin, so it shouldn't skip steps — but remember a stepper is open-loop: it never knows if it did.`
          : margin >= 1.3
            ? `Thin margin. Steppers silently 'lose steps' if load spikes past their torque — and with no encoder, everything after drifts. Add margin or close the loop.`
            : `Almost certain to skip steps under this load. Open-loop, it won't even notice — the classic 3D-printer 'layer shift'.`,
    });
  }

  // 4) Backlash → tip position error -------------------------------------------
  if (!drive.isLinear && L > 0) {
    const rad = drive.backlash * (1 / 60) * DEG; // arcmin → rad
    const tipMm = rad * L * 1000;
    findings.push({
      id: "backlash",
      title: "Backlash slop at the tip",
      severity: tipMm <= 0.2 ? "ok" : tipMm <= 1 ? "warn" : "bad",
      metric: `±${tipMm.toFixed(2)} mm`,
      detail:
        tipMm <= 0.2
          ? `${drive.backlash.toFixed(1)} arcmin of backlash is only ±${tipMm.toFixed(2)} mm of wobble at ${Math.round(L * 100)} cm — precise enough for fine work.`
          : tipMm <= 1
            ? `${drive.backlash.toFixed(1)} arcmin of backlash becomes ±${tipMm.toFixed(2)} mm of dead play at the ${Math.round(L * 100)} cm tip. Reverse direction and it moves that far before biting.`
            : `${drive.backlash.toFixed(1)} arcmin is a lot: ±${tipMm.toFixed(2)} mm of slop at ${Math.round(L * 100)} cm. For precise positioning, switch to a zero-backlash stage (harmonic/cycloidal).`,
    });
  }

  return findings;
}
