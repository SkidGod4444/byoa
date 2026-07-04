// ---------------------------------------------------------------------------
// Gear geometry — generates real involute tooth profiles as SVG paths.
//
// Involute gears are what almost every real gear uses: the tooth flank is the
// curve traced by the end of a string unwinding from a "base circle". Two
// involute gears transmit perfectly smooth motion regardless of exact centre
// distance, which is why the profile is universal. We generate the outline as a
// dense polyline (plenty smooth on screen) so meshing looks physically real.
// ---------------------------------------------------------------------------

export interface GearGeometry {
  /** SVG path for the toothed outline (centered at origin). */
  path: string;
  /** Full outline as points (counter-clockwise) — used by the 3D extruder. */
  points: { x: number; y: number }[];
  /** Pitch radius — gears touch here; centre distance = rp1 + rp2. */
  pitchRadius: number;
  /** Base circle radius. */
  baseRadius: number;
  /** Outer (addendum) radius. */
  outerRadius: number;
  /** Root (dedendum) radius. */
  rootRadius: number;
  teeth: number;
}

/** Involute function: inv(a) = tan(a) − a. */
function inv(a: number): number {
  return Math.tan(a) - a;
}

// Geometry depends only on (teeth, module, angle) — cache so the animation loop,
// which re-renders every frame, never regenerates the same profile twice.
const gearCache = new Map<string, GearGeometry>();
const ringCache = new Map<string, GearGeometry>();

/**
 * Generate an involute spur gear outline (memoized).
 * @param teeth number of teeth (z)
 * @param module tooth size — pitch diameter = module × teeth
 * @param pressureAngleDeg standard is 20°
 */
export function generateGear(teeth: number, module: number, pressureAngleDeg = 20): GearGeometry {
  const key = `${teeth}|${module}|${pressureAngleDeg}`;
  const hit = gearCache.get(key);
  if (hit) return hit;
  const g = buildGear(teeth, module, pressureAngleDeg);
  if (gearCache.size < 500) gearCache.set(key, g);
  return g;
}

function buildGear(teeth: number, module: number, pressureAngleDeg: number): GearGeometry {
  const z = Math.max(6, Math.round(teeth));
  const alpha = (pressureAngleDeg * Math.PI) / 180;
  const pitchR = (module * z) / 2;
  const baseR = pitchR * Math.cos(alpha);
  const addendum = module; // standard full-depth tooth
  const dedendum = 1.25 * module;
  const outerR = pitchR + addendum;
  const rootR = Math.max(0.1, pitchR - dedendum);

  // Half tooth thickness (angular) at the pitch circle.
  const halfTooth = Math.PI / (2 * z);
  // Angular offset of the involve where it crosses the pitch circle.
  const pitchInv = inv(alpha);

  const SAMPLES = 10;
  // Right flank starts at the larger of base/root radius.
  const startR = Math.max(baseR, rootR) + 1e-4;

  // Build one tooth's outline as points, then rotate-copy around.
  type Pt = { x: number; y: number };
  const tooth: Pt[] = [];

  const flankAngle = (r: number): number => {
    const ca = Math.min(1, baseR / r);
    const ar = Math.acos(ca); // pressure angle at radius r
    // Right flank sits at (halfTooth + pitchInv − inv(ar)) from tooth centre.
    return halfTooth + pitchInv - inv(ar);
  };

  // If root is below base circle, add a radial segment from root up to base.
  if (rootR < baseR) {
    const a0 = flankAngle(startR);
    tooth.push({ x: rootR * Math.cos(a0), y: rootR * Math.sin(a0) });
  }

  // Right flank: root/base → tip
  for (let i = 0; i <= SAMPLES; i++) {
    const r = startR + ((outerR - startR) * i) / SAMPLES;
    const a = flankAngle(r);
    tooth.push({ x: r * Math.cos(a), y: r * Math.sin(a) });
  }
  // Left flank: tip → root (mirror of right, angle negated), reversed order
  for (let i = SAMPLES; i >= 0; i--) {
    const r = startR + ((outerR - startR) * i) / SAMPLES;
    const a = -flankAngle(r);
    tooth.push({ x: r * Math.cos(a), y: r * Math.sin(a) });
  }
  if (rootR < baseR) {
    const a0 = -flankAngle(startR);
    tooth.push({ x: rootR * Math.cos(a0), y: rootR * Math.sin(a0) });
  }

  // Assemble full gear: rotate the tooth around, connecting root valleys.
  const step = (2 * Math.PI) / z;
  let dPath = "";
  const points: { x: number; y: number }[] = [];
  for (let t = 0; t < z; t++) {
    const rot = t * step;
    const cos = Math.cos(rot);
    const sin = Math.sin(rot);
    tooth.forEach((p, idx) => {
      const x = +(p.x * cos - p.y * sin).toFixed(3);
      const y = +(p.x * sin + p.y * cos).toFixed(3);
      points.push({ x, y });
      if (t === 0 && idx === 0) dPath += `M ${x} ${y}`;
      else dPath += ` L ${x} ${y}`;
    });
  }
  dPath += " Z";

  return {
    path: dPath,
    points,
    pitchRadius: pitchR,
    baseRadius: baseR,
    outerRadius: outerR,
    rootRadius: rootR,
    teeth: z,
  };
}

/**
 * Generate an internal (ring) gear — teeth point inward. We draw an annulus:
 * an outer circle minus an inner toothed profile. Returns a path with the
 * inner teeth; the caller draws the outer rim.
 */
export function generateRingGear(teeth: number, module: number, pressureAngleDeg = 20): GearGeometry {
  const key = `${teeth}|${module}|${pressureAngleDeg}`;
  const hit = ringCache.get(key);
  if (hit) return hit;
  const g = buildRingGear(teeth, module, pressureAngleDeg);
  if (ringCache.size < 500) ringCache.set(key, g);
  return g;
}

function buildRingGear(teeth: number, module: number, pressureAngleDeg: number): GearGeometry {
  // For a ring gear the addendum/dedendum swap sense; approximate by generating
  // a normal gear and using its profile as the inner boundary of the ring.
  const z = Math.max(12, Math.round(teeth));
  const alpha = (pressureAngleDeg * Math.PI) / 180;
  const pitchR = (module * z) / 2;
  const baseR = pitchR * Math.cos(alpha);
  // Internal gear: dedendum outward, addendum inward.
  const innerR = pitchR - module; // tips of ring teeth point inward
  const outerToothR = pitchR + 1.25 * module;

  const halfSpace = Math.PI / (2 * z);
  const pitchInv = inv(alpha);
  const SAMPLES = 8;
  const startR = Math.max(baseR, innerR) + 1e-4;

  type Pt = { x: number; y: number };
  const tooth: Pt[] = [];
  const flankAngle = (r: number): number => {
    const ca = Math.min(1, baseR / r);
    const ar = Math.acos(ca);
    return halfSpace + pitchInv - inv(ar);
  };
  for (let i = 0; i <= SAMPLES; i++) {
    const r = startR + ((outerToothR - startR) * i) / SAMPLES;
    tooth.push({ x: r * Math.cos(flankAngle(r)), y: r * Math.sin(flankAngle(r)) });
  }
  for (let i = SAMPLES; i >= 0; i--) {
    const r = startR + ((outerToothR - startR) * i) / SAMPLES;
    tooth.push({ x: r * Math.cos(-flankAngle(r)), y: r * Math.sin(-flankAngle(r)) });
  }

  const step = (2 * Math.PI) / z;
  let dPath = "";
  const points: { x: number; y: number }[] = [];
  for (let t = 0; t < z; t++) {
    const rot = t * step;
    const cos = Math.cos(rot);
    const sin = Math.sin(rot);
    tooth.forEach((p, idx) => {
      const x = +(p.x * cos - p.y * sin).toFixed(3);
      const y = +(p.x * sin + p.y * cos).toFixed(3);
      points.push({ x, y });
      if (t === 0 && idx === 0) dPath += `M ${x} ${y}`;
      else dPath += ` L ${x} ${y}`;
    });
  }
  dPath += " Z";

  return {
    path: dPath,
    points,
    pitchRadius: pitchR,
    baseRadius: baseR,
    outerRadius: outerToothR,
    rootRadius: innerR,
    teeth: z,
  };
}

/**
 * Meshing phase offset for the driven gear so its valleys line up with the
 * driver's teeth along the line of centres. Driver sits to the LEFT of driven
 * (driven centre on +x from driver). Returns the base rotation [rad] to add to
 * the driven gear (before its own animated spin).
 */
export function meshPhase(drivenTeeth: number): number {
  // A tooth of the driver points toward the driven gear (angle 0 on driver;
  // that direction is angle π seen from the driven gear's centre). We want a
  // *valley* of the driven gear at angle π. Valleys sit half a tooth from a
  // tooth centre, so offset by (π + π/z).
  return Math.PI + Math.PI / drivenTeeth;
}
