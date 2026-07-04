// ---------------------------------------------------------------------------
// Share-link codec.
//
// v2 is a compact, URL-safe text format (~100 chars for a typical design vs
// ~1,200 for the old base64-JSON), so links stay short WITHOUT needing a
// URL-shortening backend. Layout:
//
//   2~t<motorIdx>_<V>_<Kv>_<R>_<I0>_<Ilim>_<J>_<mass>[_<steps>]~<stage>…[~c<coverIdx>][~n<name>]
//   stage: s|b := _teethIn_teethOut_eff   p := _sun_planet_count_eff
//          h|c := _ratio_eff              w := _starts_teeth_eff
//          l|B := _lead_eff
//
// Only `~` and `_` separate fields — both survive URLs unescaped. The legacy
// base64-JSON format is still decoded for old links.
// ---------------------------------------------------------------------------

import type { ActuatorDesign, CoverStyle, Motor, MotorType, Stage, StageType } from "./types";
import { stageRatio } from "./physics";

const MOTOR_IDX: MotorType[] = ["brushed-dc", "bldc", "stepper"];
const COVER_IDX: CoverStyle[] = ["qdd-pancake", "smart-servo", "harmonic-module", "nema17", "damiao-pancake"];
const STAGE_CH: Record<StageType, string> = {
  spur: "s",
  belt: "b",
  planetary: "p",
  harmonic: "h",
  cycloidal: "c",
  worm: "w",
  leadscrew: "l",
  ballscrew: "B",
};
const CH_STAGE: Record<string, StageType> = Object.fromEntries(Object.entries(STAGE_CH).map(([k, v]) => [v, k as StageType]));

/** Compact number: trims noise, never emits the `~`/`_` separators. */
const num = (n: number) => String(+(+n).toFixed(4));

export function encodeDesign(d: ActuatorDesign): string {
  const m = d.motor;
  const motor = [
    `t${MOTOR_IDX.indexOf(m.type)}`,
    num(m.voltage),
    num(m.kv),
    num(m.resistance),
    num(m.noLoadCurrent),
    num(m.currentLimit),
    num(m.rotorInertia),
    num(m.mass),
    ...(m.stepsPerRev ? [num(m.stepsPerRev)] : []),
  ].join("_");

  const stages = d.stages.map((s) => {
    const c = STAGE_CH[s.type];
    switch (s.type) {
      case "spur":
      case "belt":
        return [c, num(s.teethIn ?? 15), num(s.teethOut ?? 45), num(s.efficiency)].join("_");
      case "planetary":
        return [c, num(s.sunTeeth ?? 12), num(s.planetTeeth ?? 18), num(s.planetCount ?? 3), num(s.efficiency)].join("_");
      case "worm":
        return [c, num(s.wormStarts ?? 1), num(s.teethOut ?? 40), num(s.efficiency)].join("_");
      case "leadscrew":
      case "ballscrew":
        return [c, num(s.lead ?? 2), num(s.efficiency)].join("_");
      default:
        return [c, num(s.ratio), num(s.efficiency)].join("_");
    }
  });

  const parts = ["2", motor, ...stages];
  if (d.cover) parts.push(`c${COVER_IDX.indexOf(d.cover)}`);
  if (d.name) parts.push(`n${encodeURIComponent(d.name)}`);
  return parts.join("~");
}

function decodeV2(s: string): ActuatorDesign | null {
  try {
    const parts = s.split("~");
    if (parts[0] !== "2" || !parts[1]?.startsWith("t")) return null;
    const mf = parts[1].split("_");
    const type = MOTOR_IDX[parseInt(mf[0].slice(1), 10)] ?? "bldc";
    const motor: Motor = {
      type,
      name: type,
      voltage: +mf[1],
      kv: +mf[2],
      resistance: +mf[3],
      noLoadCurrent: +mf[4],
      currentLimit: +mf[5],
      rotorInertia: +mf[6],
      mass: +mf[7],
      ...(mf[8] ? { stepsPerRev: +mf[8] } : {}),
    };
    if (![motor.voltage, motor.kv, motor.resistance].every(isFinite)) return null;

    const stages: Stage[] = [];
    let cover: CoverStyle | undefined;
    let name = "Shared actuator";
    for (let i = 2; i < parts.length; i++) {
      const seg = parts[i];
      if (seg.startsWith("n")) {
        name = decodeURIComponent(seg.slice(1));
        continue;
      }
      if (/^c\d$/.test(seg)) {
        cover = COVER_IDX[parseInt(seg.slice(1), 10)];
        continue;
      }
      const f = seg.split("_");
      const st = CH_STAGE[f[0]];
      if (!st) continue;
      const id = `stage-shared-${i}`;
      let stage: Stage;
      switch (st) {
        case "spur":
        case "belt":
          stage = { id, type: st, teethIn: +f[1], teethOut: +f[2], efficiency: +f[3], ratio: 1 };
          break;
        case "planetary":
          stage = { id, type: st, sunTeeth: +f[1], planetTeeth: +f[2], planetCount: +f[3], efficiency: +f[4], ratio: 1 };
          break;
        case "worm":
          stage = { id, type: st, wormStarts: +f[1], teethOut: +f[2], efficiency: +f[3], ratio: 1 };
          break;
        case "leadscrew":
        case "ballscrew":
          stage = { id, type: st, lead: +f[1], efficiency: +f[2], ratio: 1 };
          break;
        default:
          stage = { id, type: st, ratio: +f[1], efficiency: +f[2] };
      }
      stage.ratio = stageRatio(stage);
      stages.push(stage);
    }
    return { id: "custom", name, motor, stages, ...(cover ? { cover } : {}) };
  } catch {
    return null;
  }
}

export function decodeDesign(s: string): ActuatorDesign | null {
  if (s.startsWith("2~")) return decodeV2(s);
  // legacy base64(encodeURIComponent(JSON)) links
  try {
    const d = JSON.parse(decodeURIComponent(atob(s)));
    if (d && d.motor && Array.isArray(d.stages)) return d as ActuatorDesign;
    return null;
  } catch {
    return null;
  }
}
