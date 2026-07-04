// ---------------------------------------------------------------------------
// 3D geometry builders. Everything is built in the XY plane and extruded
// along +Z, because every rotating part in the scene spins about its local
// Z axis (the chain axis). All geometries are cached — profiles depend only
// on their parameters, never on animation time.
// ---------------------------------------------------------------------------

import * as THREE from "three";
import { generateGear, generateRingGear } from "@/lib/gearGeometry";

const cache = new Map<string, THREE.BufferGeometry>();

function cached(key: string, make: () => THREE.BufferGeometry): THREE.BufferGeometry {
  const hit = cache.get(key);
  if (hit) return hit;
  const g = make();
  if (cache.size > 300) {
    // Drop the oldest entries — the map iterates in insertion order.
    let n = 0;
    for (const k of cache.keys()) {
      cache.get(k)?.dispose();
      cache.delete(k);
      if (++n >= 100) break;
    }
  }
  cache.set(key, g);
  return g;
}

function shapeFrom(points: { x: number; y: number }[]): THREE.Shape {
  const s = new THREE.Shape();
  points.forEach((p, i) => (i === 0 ? s.moveTo(p.x, p.y) : s.lineTo(p.x, p.y)));
  s.closePath();
  return s;
}

const EXTRUDE = (depth: number): THREE.ExtrudeGeometryOptions => ({
  depth,
  bevelEnabled: true,
  bevelThickness: 0.35,
  bevelSize: 0.3,
  bevelSegments: 1,
  curveSegments: 8,
});

/** External involute spur gear, centered, spin axis = Z. */
export function spurGearGeo(teeth: number, module: number, thickness: number, boreR: number): THREE.BufferGeometry {
  return cached(`spur|${teeth}|${module.toFixed(3)}|${thickness}|${boreR.toFixed(2)}`, () => {
    const prof = generateGear(teeth, module);
    const shape = shapeFrom(prof.points);
    if (boreR > 0.3) {
      const hole = new THREE.Path();
      hole.absarc(0, 0, boreR, 0, Math.PI * 2, true);
      shape.holes.push(hole);
    }
    const g = new THREE.ExtrudeGeometry(shape, EXTRUDE(thickness));
    g.translate(0, 0, -thickness / 2);
    return g;
  });
}

/** Internal ring gear: solid annulus whose inner edge is the toothed profile. */
export function ringGearGeo(teeth: number, module: number, thickness: number, rim: number): THREE.BufferGeometry {
  return cached(`ring|${teeth}|${module.toFixed(3)}|${thickness}|${rim}`, () => {
    const prof = generateRingGear(teeth, module);
    const outer = new THREE.Shape();
    outer.absarc(0, 0, prof.outerRadius + rim, 0, Math.PI * 2, false);
    const hole = new THREE.Path();
    prof.points.forEach((p, i) => (i === 0 ? hole.moveTo(p.x, p.y) : hole.lineTo(p.x, p.y)));
    hole.closePath();
    outer.holes.push(hole);
    const g = new THREE.ExtrudeGeometry(outer, EXTRUDE(thickness));
    g.translate(0, 0, -thickness / 2);
    return g;
  });
}

/** Lobed cycloid disc with a centre bore and a ring of output-pin holes. */
export function cycloidDiscGeo(
  lobes: number,
  radius: number,
  amp: number,
  thickness: number,
  boreR: number,
  pinHoleR: number,
  pinHoleCount: number,
  pinOrbitR: number,
): THREE.BufferGeometry {
  return cached(`cyc|${lobes}|${radius}|${amp}|${thickness}|${boreR}|${pinHoleR}|${pinHoleCount}|${pinOrbitR}`, () => {
    const pts: { x: number; y: number }[] = [];
    const N = 160;
    for (let i = 0; i < N; i++) {
      const th = (i / N) * Math.PI * 2;
      const r = radius + amp * Math.cos(lobes * th);
      pts.push({ x: r * Math.cos(th), y: r * Math.sin(th) });
    }
    const shape = shapeFrom(pts);
    const bore = new THREE.Path();
    bore.absarc(0, 0, boreR, 0, Math.PI * 2, true);
    shape.holes.push(bore);
    for (let k = 0; k < pinHoleCount; k++) {
      const a = (k / pinHoleCount) * Math.PI * 2;
      const h = new THREE.Path();
      h.absarc(pinOrbitR * Math.cos(a), pinOrbitR * Math.sin(a), pinHoleR, 0, Math.PI * 2, true);
      shape.holes.push(h);
    }
    const g = new THREE.ExtrudeGeometry(shape, EXTRUDE(thickness));
    g.translate(0, 0, -thickness / 2);
    return g;
  });
}

/** Elliptical ring (flexspline / wave-generator cam), spin axis = Z. */
export function ellipseRingGeo(a: number, b: number, wall: number, thickness: number): THREE.BufferGeometry {
  return cached(`ellring|${a}|${b}|${wall}|${thickness}`, () => {
    const outer = new THREE.Shape();
    outer.ellipse(0, 0, a + wall, b + wall, 0, Math.PI * 2, false, 0);
    const hole = new THREE.Path();
    hole.ellipse(0, 0, a, b, 0, Math.PI * 2, true, 0);
    outer.holes.push(hole);
    const g = new THREE.ExtrudeGeometry(outer, EXTRUDE(thickness));
    g.translate(0, 0, -thickness / 2);
    return g;
  });
}

export function ellipseSolidGeo(a: number, b: number, thickness: number): THREE.BufferGeometry {
  return cached(`ellsolid|${a}|${b}|${thickness}`, () => {
    const s = new THREE.Shape();
    s.ellipse(0, 0, a, b, 0, Math.PI * 2, false, 0);
    const g = new THREE.ExtrudeGeometry(s, EXTRUDE(thickness));
    g.translate(0, 0, -thickness / 2);
    return g;
  });
}

class Helix extends THREE.Curve<THREE.Vector3> {
  constructor(
    private r: number,
    private length: number,
    private turns: number,
  ) {
    super();
  }
  getPoint(t: number, target = new THREE.Vector3()): THREE.Vector3 {
    const a = this.turns * Math.PI * 2 * t;
    return target.set(this.r * Math.cos(a), this.r * Math.sin(a), (t - 0.5) * this.length);
  }
}

/** Helical thread ridge around a core — for worms and lead screws. Axis = Z. */
export function helixGeo(coilR: number, length: number, turns: number, wireR: number): THREE.BufferGeometry {
  return cached(`helix|${coilR}|${length}|${turns}|${wireR}`, () => {
    return new THREE.TubeGeometry(new Helix(coilR, length, turns), Math.max(48, turns * 14), wireR, 7, false);
  });
}

/** Cylinder whose axis is Z (three's default is Y). */
export function zCylinderGeo(rTop: number, rBottom: number, len: number, segments = 32, open = false): THREE.BufferGeometry {
  return cached(`zcyl|${rTop}|${rBottom}|${len}|${segments}|${open}`, () => {
    const g = new THREE.CylinderGeometry(rTop, rBottom, len, segments, 1, open);
    g.rotateX(Math.PI / 2);
    return g;
  });
}

/** Arc shell segment (for rotor magnets), axis = Z. */
export function arcShellGeo(r: number, len: number, thetaStart: number, thetaLength: number): THREE.BufferGeometry {
  return cached(`arc|${r}|${len}|${thetaStart.toFixed(3)}|${thetaLength.toFixed(3)}`, () => {
    const g = new THREE.CylinderGeometry(r, r, len, 10, 1, true, thetaStart, thetaLength);
    g.rotateX(Math.PI / 2);
    return g;
  });
}

/**
 * Closed belt loop wrapping two circles: centre 1 at origin, centre 2 at
 * (0, +dist). Returns a thin extruded band. Axis = Z.
 */
export function beltGeo(r1: number, r2: number, dist: number, width: number, thickness = 1.7): THREE.BufferGeometry {
  return cached(`belt|${r1}|${r2}|${dist}|${width}|${thickness}`, () => {
    const th0 = Math.PI / 2; // direction from pulley 1 to pulley 2
    const phi = Math.acos(Math.min(0.99, (r1 - r2) / dist)); // external tangent contact angle
    const loop = (grow: number) => {
      const pts: { x: number; y: number }[] = [];
      const R1 = r1 + grow;
      const R2 = r2 + grow;
      // long way around pulley 1 (far side)
      for (let i = 0; i <= 48; i++) {
        const a = th0 + phi + ((Math.PI * 2 - 2 * phi) * i) / 48;
        pts.push({ x: R1 * Math.cos(a), y: R1 * Math.sin(a) });
      }
      // short way around pulley 2 (top side)
      for (let i = 0; i <= 28; i++) {
        const a = th0 - phi + (2 * phi * i) / 28;
        pts.push({ x: R2 * Math.cos(a), y: dist + R2 * Math.sin(a) });
      }
      return pts;
    };
    const shape = shapeFrom(loop(thickness));
    const hole = new THREE.Path();
    loop(-0.15).forEach((p, i) => (i === 0 ? hole.moveTo(p.x, p.y) : hole.lineTo(p.x, p.y)));
    hole.closePath();
    shape.holes.push(hole);
    const g = new THREE.ExtrudeGeometry(shape, { depth: width, bevelEnabled: false, curveSegments: 6 });
    g.translate(0, 0, -width / 2);
    return g;
  });
}

/** Rounded box for nuts/carriages. */
export function boxGeo(w: number, h: number, d: number): THREE.BufferGeometry {
  return cached(`box|${w}|${h}|${d}`, () => new THREE.BoxGeometry(w, h, d));
}

/** Flat ring plate (washer) — end caps of product covers. Axis = Z. */
export function annulusGeo(rOut: number, rIn: number, thickness: number): THREE.BufferGeometry {
  return cached(`ann|${rOut}|${rIn}|${thickness}`, () => {
    const s = new THREE.Shape();
    s.absarc(0, 0, rOut, 0, Math.PI * 2, false);
    const hole = new THREE.Path();
    hole.absarc(0, 0, rIn, 0, Math.PI * 2, true);
    s.holes.push(hole);
    const g = new THREE.ExtrudeGeometry(s, { depth: thickness, bevelEnabled: false, curveSegments: 40 });
    g.translate(0, 0, -thickness / 2);
    return g;
  });
}

export function torusGeo(R: number, tube: number, arc = Math.PI * 2): THREE.BufferGeometry {
  return cached(`torus|${R}|${tube}|${arc.toFixed(3)}`, () => new THREE.TorusGeometry(R, tube, 12, 48, arc));
}
