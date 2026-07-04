"use client";

// ---------------------------------------------------------------------------
// The 3D actuator assembly.
//
// Layout model: the drivetrain is a chain along the +Z axis. Each stage renders
// its parts in a local frame (input shaft enters at z=0, spin axis = Z) and the
// rest of the chain is nested inside a transformed <group>, so offset stages
// (spur, belt) and 90°-turn stages (worm) compose naturally.
//
// Animation model: one global clock angle g (degrees). Every rotation in the
// machine is a LINEAR function of g — each stage maps input→output angle as
// θout = A·θin + B — so composed stages stay perfectly phase-locked and gear
// teeth mesh exactly, forever. Per-frame we only mutate Object3D transforms
// (no React state), so the scene animates at 60fps for free.
// ---------------------------------------------------------------------------

import { createContext, useContext, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import { generateGear, generateRingGear } from "@/lib/gearGeometry";
import { PART_INFO } from "@/lib/anatomy";
import { MOTOR_TYPES, STAGE_TYPES } from "@/lib/catalog";
import type { CoverStyle, Stage } from "@/lib/types";
import { useDesignStore } from "@/store/designStore";
import { useSceneStore } from "@/store/sceneStore";
import {
  annulusGeo,
  arcShellGeo,
  beltGeo,
  boxGeo,
  cycloidDiscGeo,
  ellipseRingGeo,
  ellipseSolidGeo,
  helixGeo,
  ringGearGeo,
  spurGearGeo,
  torusGeo,
  zCylinderGeo,
} from "./geometry";

/** Assigned to ghosted shells so pointer rays pass through to the anatomy inside. */
const NO_RAYCAST = () => undefined;

const DEG = Math.PI / 180;
const BASE_SPEED = 160; // deg/s of the motor rotor at 1× sim speed

// Palette
const STEEL = "#a7b2c4";
const STEEL_DARK = "#6d7a91";
const HOUSING = "#3a4560";
const COPPER = "#c98a55";
const MAG_N = "#c56767";
const MAG_S = "#6379c9";
const PCB = "#3f7d5f";
const ACCENT = "#f97316";

// World positions of the major sub-assemblies (for chip → camera fly-to).
export const partPositions = new Map<string, [number, number, number]>();

// ---------------------------------------------------------------------------
// selection / highlight plumbing
// ---------------------------------------------------------------------------

const HLCtx = createContext(false);

function Mat({
  color,
  metalness = 0.72,
  roughness = 0.34,
  opacity = 1,
  side,
}: {
  color: string;
  metalness?: number;
  roughness?: number;
  opacity?: number;
  side?: THREE.Side;
}) {
  const hl = useContext(HLCtx);
  return (
    <meshStandardMaterial
      color={color}
      metalness={metalness}
      roughness={roughness}
      transparent={opacity < 1}
      opacity={opacity}
      depthWrite={opacity > 0.5}
      side={side}
      emissive={hl ? ACCENT : "#000000"}
      emissiveIntensity={hl ? 0.45 : 0}
    />
  );
}

function SelectablePart({
  pk,
  labelR = 14,
  children,
}: {
  pk: string;
  /** Radius at which the hover label floats. */
  labelR?: number;
  children: React.ReactNode;
}) {
  const hovered = useSceneStore((s) => s.hovered === pk);
  const selected = useSceneStore((s) => s.selected?.key === pk);
  const setHovered = useSceneStore((s) => s.setHovered);
  const select = useSceneStore((s) => s.select);
  const kind = pk.split("/").pop() ?? "";
  const info = PART_INFO[kind];

  return (
    <group
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(pk);
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={(e) => {
        e.stopPropagation();
        setHovered(null);
        document.body.style.cursor = "";
      }}
      onClick={(e) => {
        e.stopPropagation();
        const v = new THREE.Vector3();
        e.object.getWorldPosition(v);
        select({ key: pk, pos: [v.x, v.y, v.z] });
        // opening a stage part also opens that stage's editor on the left
        const seg = pk.split("/")[0];
        if (seg.startsWith("stage-")) useDesignStore.getState().selectStage(seg.slice(6));
      }}
    >
      <HLCtx.Provider value={hovered || selected}>{children}</HLCtx.Provider>
      {hovered && info && (
        <Html position={[0, labelR, 0]} center zIndexRange={[20, 0]} style={{ pointerEvents: "none" }}>
          <div className="whitespace-nowrap border border-[var(--border-strong)] bg-[var(--surface)]/95 px-2.5 py-1 text-[11px] font-medium text-[var(--text)] shadow-xl backdrop-blur">
            {info.name}
          </div>
        </Html>
      )}
    </group>
  );
}

/** Publishes this group's world position (throttled) for chip → fly-to. */
function RegisterRoot({ pk }: { pk: string }) {
  const ref = useRef<THREE.Group>(null);
  const n = useRef(0);
  useFrame(() => {
    if (n.current++ % 20 === 0 && ref.current) {
      const v = new THREE.Vector3();
      ref.current.getWorldPosition(v);
      partPositions.set(pk, [v.x, v.y, v.z]);
    }
  });
  return <group ref={ref} />;
}

// ---------------------------------------------------------------------------
// kinematic chain computation
// ---------------------------------------------------------------------------

interface Link {
  stage: Stage;
  /** Input angle of this stage: θin = m·g + a. */
  m: number;
  a: number;
  /** Sizing info per type. */
  dims: Record<string, number>;
  /** Where the next chain link mounts (local). */
  outPos: [number, number, number];
  outRot: [number, number, number];
  /** Extra spacing between this stage and the next (before explode). */
  baseGap: number;
  /** Stage body length along its local Z. */
  W: number;
}

const clampModule = (target: number, teeth: number, cap = 2.1) => Math.min(cap, target / (teeth + 4));

/** Rough bounding envelope of the chain (motor excluded) — sizes the product covers. */
export interface Envelope {
  /** z where the last stage's body ends (chain-local). */
  zEnd: number;
  /** Max radial extent from the chain axis. */
  r: number;
  yMin: number;
  yMax: number;
  xMax: number;
  /** Chain-axis y offset at the output (non-zero after zigzag spur/belt stages). */
  outY: number;
  /** Worm turns the chain 90° — covers don't apply. */
  hasWorm: boolean;
}

function buildChain(stages: Stage[]) {
  const links: Link[] = [];
  let m = 1;
  let a = 0;
  let zig = -1; // spur/belt offset direction alternates: down, up, down…

  // envelope walk (motor bounds added by the consumer)
  let cy = 0;
  let cz = 0;
  const env: Envelope = { zEnd: 0, r: 16.5, yMin: -16.5, yMax: 16.5, xMax: 16.5, outY: 0, hasWorm: false };
  const grow = (lo: number, hi: number, x: number) => {
    env.yMin = Math.min(env.yMin, lo);
    env.yMax = Math.max(env.yMax, hi);
    env.xMax = Math.max(env.xMax, x);
  };

  for (const st of stages) {
    let A = 1;
    let B = 0;
    let dims: Record<string, number> = {};
    let outPos: [number, number, number] = [0, 0, 0];
    let outRot: [number, number, number] = [0, 0, 0];
    let baseGap = 6;
    let W = 14;

    switch (st.type) {
      case "spur": {
        const z1 = Math.max(6, st.teethIn ?? 15);
        const z2 = Math.max(6, st.teethOut ?? 45);
        const mod = clampModule(48, Math.max(z1, z2));
        const rp1 = (mod * z1) / 2;
        const rp2 = (mod * z2) / 2;
        const cd = rp1 + rp2;
        const phi = zig * 90;
        A = -z1 / z2;
        B = phi * (1 + z1 / z2) + 180 + 180 / z2;
        dims = { z1, z2, mod, rp1, rp2, cd, phi, dir: zig };
        W = 12;
        outPos = [0, zig * cd, W];
        zig = -zig;
        break;
      }
      case "belt": {
        const z1 = Math.max(10, st.teethIn ?? 20);
        const z2 = Math.max(10, st.teethOut ?? 40);
        const mod = clampModule(30, Math.max(z1, z2), 1.5);
        const rp1 = (mod * z1) / 2;
        const rp2 = (mod * z2) / 2;
        const cd = rp1 + rp2 + 16;
        A = z1 / z2;
        B = 0;
        dims = { z1, z2, mod, rp1, rp2, cd, dir: zig };
        W = 12;
        outPos = [0, zig * cd, W];
        zig = -zig;
        break;
      }
      case "planetary": {
        const zs = Math.max(8, st.sunTeeth ?? 12);
        const zp = Math.max(8, st.planetTeeth ?? 18);
        const zr = zs + 2 * zp;
        const np = Math.min(5, Math.max(3, st.planetCount ?? 3));
        const mod = clampModule(50, zr, 1.9);
        A = zs / (zs + zr);
        B = 0;
        dims = { zs, zp, zr, np, mod, orbit: (mod * (zs + zp)) / 2, ringOuter: (mod * zr) / 2 + mod + 2.5 };
        W = 18;
        outPos = [0, 0, W];
        break;
      }
      case "harmonic": {
        const ratio = Math.max(30, st.ratio);
        A = -1 / ratio;
        dims = { R: 24, ratio };
        W = 15;
        outPos = [0, 0, W];
        break;
      }
      case "cycloidal": {
        const ratio = Math.max(10, st.ratio);
        A = -1 / ratio;
        dims = { R: 17, ecc: 2.2, lobes: 9, pins: 10, ratio };
        W = 17;
        outPos = [0, 0, W];
        break;
      }
      case "worm": {
        const z2 = Math.max(20, st.teethOut ?? 40);
        const starts = Math.max(1, st.wormStarts ?? 1);
        const mod = clampModule(42, z2, 1.6);
        const wheelR = (mod * z2) / 2 + mod;
        const cd = wheelR + 6.2;
        A = 1 / (z2 / starts);
        dims = { z2, starts, mod, wheelR, cd };
        W = 18;
        outPos = [0, -cd, W / 2];
        outRot = [0, Math.PI / 2, 0];
        baseGap = 9;
        break;
      }
      case "leadscrew":
      case "ballscrew": {
        A = 1;
        dims = { len: 30, lead: st.lead ?? 2 };
        W = 36;
        outPos = [0, 0, W];
        break;
      }
    }

    links.push({ stage: st, m, a, dims, outPos, outRot, baseGap, W });

    // ---- envelope walk ----
    switch (st.type) {
      case "spur":
      case "belt": {
        const r1 = dims.rp1 + 3.5;
        const r2 = dims.rp2 + 3.5;
        const yFar = cy + dims.dir * dims.cd;
        grow(Math.min(cy - r1, yFar - r2), Math.max(cy + r1, yFar + r2), Math.max(r1, r2));
        break;
      }
      case "planetary": {
        const e = dims.ringOuter + 1.5;
        grow(cy - e, cy + e, e);
        break;
      }
      case "harmonic": {
        const e = dims.R + 7;
        grow(cy - e, cy + e, e);
        break;
      }
      case "cycloidal": {
        const e = dims.R + 9;
        grow(cy - e, cy + e, e);
        break;
      }
      case "worm":
        env.hasWorm = true;
        break;
      default:
        grow(cy - 10.5, cy + 10.5, 10.5);
    }
    env.zEnd = Math.max(env.zEnd, cz + W);
    cy += outPos[1];
    cz += outPos[2] + baseGap;

    // compose: θout = A·θin + B, θin = m·g + a
    a = A * a + B;
    m = A * m;
  }

  env.outY = cy;
  env.r = Math.max(env.r, env.yMax, -env.yMin, env.xMax);

  return { links, final: { m, a }, env };
}

// ---------------------------------------------------------------------------
// motor assembly (anatomy hero)
// ---------------------------------------------------------------------------

const MOTOR_R = 15.5;

function MotorAssembly({
  clockRef,
  explode,
  xray,
  hasCover,
}: {
  clockRef: React.RefObject<number>;
  explode: number;
  xray: boolean;
  hasCover: boolean;
}) {
  const rotorRef = useRef<THREE.Group>(null);
  const encoderRef = useRef<THREE.Group>(null);
  const motorType = useDesignStore((s) => s.design.motor.type);
  useFrame(() => {
    // A stepper doesn't flow — it TICKS. Quantize its spin to visible steps.
    const raw = motorType === "stepper" ? Math.floor(clockRef.current / 9) * 9 : clockRef.current;
    const r = raw * DEG;
    if (rotorRef.current) rotorRef.current.rotation.z = r;
    if (encoderRef.current) encoderRef.current.rotation.z = r;
  });

  const e = explode;
  const housingOpacity = xray ? 0.13 : 0.9;
  // Ghosted shells shouldn't swallow clicks meant for the parts inside.
  const ray = xray ? NO_RAYCAST : undefined;

  return (
    <group>
      <RegisterRoot pk="motor" />

      {/* housing shell + rear cap (a product cover replaces the generic can) */}
      {!hasCover && (
        <SelectablePart pk="motor/housing" labelR={MOTOR_R + 6}>
          <group position={[0, e * 26, -17]}>
            <mesh geometry={zCylinderGeo(MOTOR_R, MOTOR_R, 30, 48, true)} raycast={ray}>
              <Mat color={HOUSING} opacity={housingOpacity} side={THREE.DoubleSide} metalness={0.6} roughness={0.42} />
            </mesh>
            <mesh geometry={zCylinderGeo(MOTOR_R, MOTOR_R, 2.4, 48)} position={[0, 0, -16.2]} raycast={ray}>
              <Mat color={HOUSING} opacity={Math.min(1, housingOpacity + 0.08)} metalness={0.6} roughness={0.42} />
            </mesh>
            {/* cooling ribs */}
            {Array.from({ length: 8 }, (_, k) => {
              const ang = (k / 8) * Math.PI * 2;
              return (
                <mesh key={k} geometry={boxGeo(1.1, 1.6, 27)} position={[Math.cos(ang) * (MOTOR_R + 0.7), Math.sin(ang) * (MOTOR_R + 0.7), 0]} rotation={[0, 0, ang]} raycast={ray}>
                  <Mat color={HOUSING} opacity={housingOpacity} metalness={0.6} roughness={0.5} />
                </mesh>
              );
            })}
          </group>
        </SelectablePart>
      )}

      {/* stator — its construction is what makes each motor family different */}
      <SelectablePart pk="motor/stator" labelR={MOTOR_R + 3}>
        <group position={[0, e * 12, -17]}>
          {motorType === "brushed-dc" ? (
            <group>
              {/* brushed: permanent magnets live on the STATOR… */}
              <mesh geometry={arcShellGeo(11.8, 24, 0.35, Math.PI - 0.7)}>
                <Mat color={MAG_N} metalness={0.5} roughness={0.45} side={THREE.DoubleSide} />
              </mesh>
              <mesh geometry={arcShellGeo(11.8, 24, Math.PI + 0.35, Math.PI - 0.7)}>
                <Mat color={MAG_S} metalness={0.5} roughness={0.45} side={THREE.DoubleSide} />
              </mesh>
              {/* …and carbon brushes press on the commutator at the back */}
              <mesh geometry={boxGeo(3.6, 2.4, 4.2)} position={[6.6, 0, -10.5]}>
                <Mat color="#2b2b30" metalness={0.2} roughness={0.7} />
              </mesh>
              <mesh geometry={boxGeo(3.6, 2.4, 4.2)} position={[-6.6, 0, -10.5]}>
                <Mat color="#2b2b30" metalness={0.2} roughness={0.7} />
              </mesh>
            </group>
          ) : motorType === "stepper" ? (
            <group>
              {/* stepper: eight chunky wound poles */}
              <mesh geometry={torusGeo(13, 1.9)}>
                <Mat color={STEEL_DARK} />
              </mesh>
              {Array.from({ length: 8 }, (_, k) => {
                const ang = (k / 8) * Math.PI * 2;
                return (
                  <group key={k} position={[Math.cos(ang) * 10.4, Math.sin(ang) * 10.4, 0]} rotation={[0, 0, ang]}>
                    <mesh geometry={boxGeo(5, 3.6, 19)}>
                      <Mat color={STEEL_DARK} />
                    </mesh>
                    <mesh geometry={boxGeo(3.4, 6, 15)}>
                      <Mat color={COPPER} metalness={0.85} roughness={0.3} />
                    </mesh>
                  </group>
                );
              })}
            </group>
          ) : (
            <group>
              {/* BLDC: a dense ring of 12 slim wound slots */}
              <mesh geometry={torusGeo(12.8, 1.7)}>
                <Mat color={STEEL_DARK} />
              </mesh>
              {Array.from({ length: 12 }, (_, k) => {
                const ang = (k / 12) * Math.PI * 2;
                return (
                  <group key={k} position={[Math.cos(ang) * 10.7, Math.sin(ang) * 10.7, 0]} rotation={[0, 0, ang]}>
                    <mesh geometry={boxGeo(4.4, 2.6, 19)}>
                      <Mat color={STEEL_DARK} />
                    </mesh>
                    <mesh geometry={boxGeo(2.9, 4.6, 16)}>
                      <Mat color={COPPER} metalness={0.85} roughness={0.3} />
                    </mesh>
                  </group>
                );
              })}
            </group>
          )}
        </group>
      </SelectablePart>

      {/* rotor (spins) — magnets, windings, or a toothed iron core per family */}
      <SelectablePart pk="motor/rotor" labelR={11}>
        <group ref={rotorRef} position={[0, -e * 14, -17]}>
          {motorType === "brushed-dc" ? (
            <group>
              {/* wound armature spinning inside stationary magnets */}
              <mesh geometry={zCylinderGeo(7.8, 7.8, 20, 24)}>
                <Mat color={STEEL} metalness={0.7} roughness={0.3} />
              </mesh>
              {Array.from({ length: 6 }, (_, k) => {
                const ang = (k / 6) * Math.PI * 2;
                return (
                  <mesh key={k} geometry={boxGeo(3.2, 4.4, 17)} position={[Math.cos(ang) * 6.2, Math.sin(ang) * 6.2, 0]} rotation={[0, 0, ang]}>
                    <Mat color={COPPER} metalness={0.85} roughness={0.3} />
                  </mesh>
                );
              })}
              {/* copper commutator the brushes ride on */}
              <mesh geometry={zCylinderGeo(4.6, 4.6, 5, 18)} position={[0, 0, -12.5]}>
                <Mat color={COPPER} metalness={0.9} roughness={0.22} />
              </mesh>
            </group>
          ) : motorType === "stepper" ? (
            /* toothed hybrid rotor — the teeth ARE the steps */
            <mesh geometry={spurGearGeo(48, 0.3, 21, 3)}>
              <Mat color={STEEL} metalness={0.8} roughness={0.28} />
            </mesh>
          ) : (
            <group>
              <mesh geometry={zCylinderGeo(7.6, 7.6, 24, 32)}>
                <Mat color={STEEL} metalness={0.8} roughness={0.28} />
              </mesh>
              {Array.from({ length: 8 }, (_, k) => (
                <mesh key={k} geometry={arcShellGeo(8.7, 22, (k * Math.PI) / 4 + 0.03, Math.PI / 4 - 0.06)}>
                  <Mat color={k % 2 ? MAG_S : MAG_N} metalness={0.5} roughness={0.45} side={THREE.DoubleSide} />
                </mesh>
              ))}
            </group>
          )}
        </group>
      </SelectablePart>

      {/* shaft (spins with rotor) */}
      <SelectablePart pk="motor/shaft" labelR={6}>
        <group position={[0, -e * 14, 0]}>
          <mesh geometry={zCylinderGeo(2, 2, 50, 20)} position={[0, 0, -14]}>
            <Mat color={STEEL} metalness={0.85} roughness={0.22} />
          </mesh>
        </group>
      </SelectablePart>

      {/* encoder: static PCB + striped disc spinning with the shaft */}
      <SelectablePart pk="motor/encoder" labelR={12}>
        <group position={[0, e * -26, -33.5 - e * 14]}>
          <mesh geometry={zCylinderGeo(10, 10, 1.2, 40)}>
            <Mat color={PCB} metalness={0.25} roughness={0.6} />
          </mesh>
          <group ref={encoderRef} position={[0, 0, 2]}>
            <mesh geometry={zCylinderGeo(6.6, 6.6, 0.9, 36)}>
              <Mat color={STEEL} metalness={0.7} roughness={0.3} />
            </mesh>
            {Array.from({ length: 16 }, (_, k) => {
              const ang = (k / 16) * Math.PI * 2;
              return (
                <mesh key={k} geometry={boxGeo(2.4, 0.9, 0.5)} position={[Math.cos(ang) * 5, Math.sin(ang) * 5, 0.6]} rotation={[0, 0, ang]}>
                  <Mat color="#1a2236" metalness={0.2} roughness={0.7} />
                </mesh>
              );
            })}
          </group>
        </group>
      </SelectablePart>

      {/* front flange */}
      <SelectablePart pk="motor/flange" labelR={MOTOR_R + 4}>
        <group position={[0, e * 18, -1.4 + e * 6]}>
          <mesh geometry={zCylinderGeo(MOTOR_R + 0.6, MOTOR_R + 0.6, 2.8, 48)}>
            <Mat color={STEEL_DARK} metalness={0.75} roughness={0.35} />
          </mesh>
          {Array.from({ length: 4 }, (_, k) => {
            const ang = (k / 4) * Math.PI * 2 + Math.PI / 4;
            return (
              <mesh key={k} geometry={zCylinderGeo(1.3, 1.3, 3.6, 14)} position={[Math.cos(ang) * 12.3, Math.sin(ang) * 12.3, 0]}>
                <Mat color={STEEL} metalness={0.85} roughness={0.25} />
              </mesh>
            );
          })}
          <mesh geometry={torusGeo(MOTOR_R - 1.4, 0.65)} position={[0, 0, 1.7]}>
            <Mat color={MOTOR_TYPES[motorType].color} metalness={0.5} roughness={0.4} />
          </mesh>
        </group>
      </SelectablePart>
    </group>
  );
}

// ---------------------------------------------------------------------------
// stage assemblies
// ---------------------------------------------------------------------------

interface StageProps {
  link: Link;
  clockRef: React.RefObject<number>;
  explode: number;
  xray: boolean;
}

const GEAR_T = 8.5;

function SpurStage({ link, clockRef, explode }: StageProps) {
  const { dims, stage, m, a, W } = link;
  const pinionRef = useRef<THREE.Group>(null);
  const gearRef = useRef<THREE.Group>(null);
  useFrame(() => {
    const g = clockRef.current;
    const tin = m * g + a;
    const tout = (-dims.z1 / dims.z2) * tin + dims.phi * (1 + dims.z1 / dims.z2) + 180 + 180 / dims.z2;
    if (pinionRef.current) pinionRef.current.rotation.z = tin * DEG;
    if (gearRef.current) gearRef.current.rotation.z = tout * DEG;
  });
  const accent = STAGE_TYPES[stage.type].color;
  const zC = W / 2;
  return (
    <group>
      <RegisterRoot pk={`stage-${stage.id}`} />
      <SelectablePart pk={`stage-${stage.id}/pinion`} labelR={dims.rp1 + 6}>
        <group position={[0, explode * -(dims.rp1 + 8) * dims.dir, zC]}>
          <group ref={pinionRef}>
            <mesh geometry={spurGearGeo(dims.z1, dims.mod, GEAR_T, 2.4)}>
              <Mat color={accent} metalness={0.65} roughness={0.35} />
            </mesh>
          </group>
        </group>
      </SelectablePart>
      <SelectablePart pk={`stage-${stage.id}/gear`} labelR={dims.rp2 + 6}>
        <group position={[0, dims.cd * dims.dir + explode * (dims.rp2 + 8) * dims.dir, zC]}>
          <group ref={gearRef}>
            <mesh geometry={spurGearGeo(dims.z2, dims.mod, GEAR_T, 2.6)}>
              <Mat color={STEEL} />
            </mesh>
          </group>
          <mesh geometry={zCylinderGeo(2.4, 2.4, GEAR_T + 8, 18)}>
            <Mat color={STEEL_DARK} metalness={0.8} roughness={0.25} />
          </mesh>
        </group>
      </SelectablePart>
    </group>
  );
}

function BeltStage({ link, clockRef, explode }: StageProps) {
  const { dims, stage, m, a, W } = link;
  const inRef = useRef<THREE.Group>(null);
  const outRef = useRef<THREE.Group>(null);
  useFrame(() => {
    const g = clockRef.current;
    const tin = m * g + a;
    if (inRef.current) inRef.current.rotation.z = tin * DEG;
    if (outRef.current) outRef.current.rotation.z = (dims.z1 / dims.z2) * tin * DEG;
  });
  const accent = STAGE_TYPES[stage.type].color;
  const zC = W / 2;
  const flange = (r: number) => (
    <>
      <mesh geometry={zCylinderGeo(r + 1.4, r + 1.4, 0.9, 36)} position={[0, 0, 4.2]}>
        <Mat color={STEEL_DARK} />
      </mesh>
      <mesh geometry={zCylinderGeo(r + 1.4, r + 1.4, 0.9, 36)} position={[0, 0, -4.2]}>
        <Mat color={STEEL_DARK} />
      </mesh>
    </>
  );
  return (
    <group>
      <RegisterRoot pk={`stage-${stage.id}`} />
      <SelectablePart pk={`stage-${stage.id}/pulley-in`} labelR={dims.rp1 + 6}>
        <group position={[0, 0, zC]}>
          <group ref={inRef}>
            <mesh geometry={spurGearGeo(dims.z1, dims.mod, 7.5, 2.2)}>
              <Mat color={accent} metalness={0.6} roughness={0.35} />
            </mesh>
          </group>
          {flange(dims.rp1)}
        </group>
      </SelectablePart>
      <SelectablePart pk={`stage-${stage.id}/pulley-out`} labelR={dims.rp2 + 6}>
        <group position={[0, dims.cd * dims.dir, zC]}>
          <group ref={outRef}>
            <mesh geometry={spurGearGeo(dims.z2, dims.mod, 7.5, 2.4)}>
              <Mat color={STEEL} />
            </mesh>
          </group>
          {flange(dims.rp2)}
        </group>
      </SelectablePart>
      <SelectablePart pk={`stage-${stage.id}/belt`} labelR={dims.cd / 2 + dims.rp1 + 8}>
        <group position={[0, dims.dir > 0 ? 0 : dims.cd * dims.dir, zC]} scale={[1, dims.dir > 0 ? 1 : 1, 1]}>
          {/* beltGeo assumes pulley2 at +Y; mirror for zig direction */}
          <group scale={[1, dims.dir, 1]}>
            <mesh geometry={beltGeo(dims.rp1 + dims.mod * 0.4, dims.rp2 + dims.mod * 0.4, dims.cd, 7 + explode * 0)}>
              <Mat color="#2b3240" metalness={0.15} roughness={0.75} side={THREE.DoubleSide} />
            </mesh>
          </group>
        </group>
      </SelectablePart>
    </group>
  );
}

function PlanetaryStage({ link, clockRef, explode, xray }: StageProps) {
  const { dims, stage, m, a, W } = link;
  const sunRef = useRef<THREE.Group>(null);
  const carrierRef = useRef<THREE.Group>(null);
  const planetRefs = useRef<(THREE.Group | null)[]>([]);
  const np = dims.np;

  useFrame(() => {
    const g = clockRef.current;
    const tin = m * g + a;
    const carrier = (tin * dims.zs) / (dims.zs + dims.zr);
    if (sunRef.current) sunRef.current.rotation.z = tin * DEG;
    if (carrierRef.current) carrierRef.current.rotation.z = carrier * DEG;
    for (let k = 0; k < np; k++) {
      const ref = planetRefs.current[k];
      if (!ref) continue;
      const psi = carrier + (k * 360) / np;
      const tp = psi + 180 + 180 / dims.zp - (dims.zs / dims.zp) * (tin - psi);
      ref.position.set(Math.cos(psi * DEG) * dims.orbit, Math.sin(psi * DEG) * dims.orbit, 0);
      ref.rotation.z = tp * DEG;
    }
  });

  const accent = STAGE_TYPES[stage.type].color;
  const zC = W / 2 - 2;
  return (
    <group>
      <RegisterRoot pk={`stage-${stage.id}`} />
      {/* sun (input) */}
      <SelectablePart pk={`stage-${stage.id}/sun`} labelR={dims.mod * dims.zs * 0.5 + 6}>
        <group position={[0, 0, zC - explode * 9]}>
          <group ref={sunRef}>
            <mesh geometry={spurGearGeo(dims.zs, dims.mod, GEAR_T, 2.2)}>
              <Mat color={accent} metalness={0.65} roughness={0.32} />
            </mesh>
          </group>
        </group>
      </SelectablePart>
      {/* planets */}
      <SelectablePart pk={`stage-${stage.id}/planet`} labelR={dims.orbit + 8}>
        <group position={[0, 0, zC]}>
          {Array.from({ length: np }, (_, k) => (
            <group key={k} ref={(el) => (planetRefs.current[k] = el)}>
              <mesh geometry={spurGearGeo(dims.zp, dims.mod, GEAR_T - 0.6, 2)}>
                <Mat color={STEEL} />
              </mesh>
            </group>
          ))}
        </group>
      </SelectablePart>
      {/* ring gear (fixed) */}
      <SelectablePart pk={`stage-${stage.id}/ring`} labelR={dims.ringOuter + 5}>
        <group position={[0, 0, zC + explode * 10]}>
          <mesh geometry={ringGearGeo(dims.zr, dims.mod, GEAR_T + 1.2, 2.6)}>
            <Mat color={HOUSING} opacity={xray ? 0.34 : 0.96} metalness={0.55} roughness={0.4} side={THREE.DoubleSide} />
          </mesh>
        </group>
      </SelectablePart>
      {/* carrier (output) */}
      <SelectablePart pk={`stage-${stage.id}/carrier`} labelR={dims.orbit + 6}>
        <group position={[0, 0, zC + GEAR_T / 2 + 2.2 + explode * 20]}>
          <group ref={carrierRef}>
            <mesh geometry={zCylinderGeo(dims.orbit + 3.4, dims.orbit + 3.4, 3, 40)}>
              <Mat color={STEEL_DARK} metalness={0.7} roughness={0.35} />
            </mesh>
            {Array.from({ length: np }, (_, k) => {
              const ang = (k / np) * Math.PI * 2;
              return (
                <mesh key={k} geometry={zCylinderGeo(1.7, 1.7, GEAR_T + 4, 14)} position={[Math.cos(ang) * dims.orbit, Math.sin(ang) * dims.orbit, -GEAR_T / 2 - 1]}>
                  <Mat color={STEEL} metalness={0.8} roughness={0.25} />
                </mesh>
              );
            })}
            <mesh geometry={zCylinderGeo(3, 3, 7, 20)} position={[0, 0, 4]}>
              <Mat color={STEEL} metalness={0.85} roughness={0.22} />
            </mesh>
          </group>
        </group>
      </SelectablePart>
    </group>
  );
}

function HarmonicStage({ link, clockRef, explode, xray }: StageProps) {
  const { dims, stage, m, a, W } = link;
  const waveRef = useRef<THREE.Group>(null);
  const flexRef = useRef<THREE.Group>(null);
  const dotRef = useRef<THREE.Mesh>(null);
  const R = dims.R;
  const fa = R - 3.4; // flexspline semi-major
  const fb = R - 6.6; // semi-minor

  useFrame(() => {
    const g = clockRef.current;
    const tin = m * g + a;
    const slow = (-1 / dims.ratio) * tin;
    if (waveRef.current) waveRef.current.rotation.z = tin * DEG;
    if (flexRef.current) flexRef.current.rotation.z = tin * DEG; // the *bulge* orientation
    if (dotRef.current) {
      // The marker rides the flexspline MATERIAL (slow), on the current ellipse rim.
      const rel = (slow - tin) * DEG;
      const r = (fa * fb) / Math.sqrt((fb * Math.cos(rel)) ** 2 + (fa * Math.sin(rel)) ** 2) + 1.6;
      dotRef.current.position.set(Math.cos(slow * DEG) * r, Math.sin(slow * DEG) * r, 0);
    }
  });

  const accent = STAGE_TYPES[stage.type].color;
  const zC = W / 2;
  return (
    <group>
      <RegisterRoot pk={`stage-${stage.id}`} />
      <SelectablePart pk={`stage-${stage.id}/circspline`} labelR={R + 8}>
        <group position={[0, 0, zC + explode * 10]}>
          <mesh geometry={ringGearGeo(40, (2 * (R + 1)) / 40, 9.5, 2.8)}>
            <Mat color={HOUSING} opacity={xray ? 0.34 : 0.95} metalness={0.55} roughness={0.4} side={THREE.DoubleSide} />
          </mesh>
        </group>
      </SelectablePart>
      <SelectablePart pk={`stage-${stage.id}/flexspline`} labelR={R + 3}>
        <group position={[0, 0, zC]}>
          <group ref={flexRef}>
            <mesh geometry={ellipseRingGeo(fa, fb, 1.8, 8.6)}>
              <Mat color={accent} metalness={0.6} roughness={0.3} />
            </mesh>
          </group>
          <mesh ref={dotRef} geometry={zCylinderGeo(1.5, 1.5, 9.4, 12)}>
            <Mat color="#ffffff" metalness={0.3} roughness={0.4} />
          </mesh>
        </group>
      </SelectablePart>
      <SelectablePart pk={`stage-${stage.id}/wavegen`} labelR={fa - 2}>
        <group position={[0, 0, zC - explode * 11]}>
          <group ref={waveRef}>
            <mesh geometry={ellipseSolidGeo(fa - 2.1, fb - 2.1, 6.5)}>
              <Mat color={STEEL} metalness={0.75} roughness={0.3} />
            </mesh>
            <mesh geometry={zCylinderGeo(2.4, 2.4, 12, 16)}>
              <Mat color={STEEL_DARK} metalness={0.8} roughness={0.25} />
            </mesh>
          </group>
        </group>
      </SelectablePart>
    </group>
  );
}

function CycloidalStage({ link, clockRef, explode, xray }: StageProps) {
  const { dims, stage, m, a, W } = link;
  const camRef = useRef<THREE.Group>(null);
  const discRef = useRef<THREE.Group>(null);
  const outRef = useRef<THREE.Group>(null);
  const { R, ecc, lobes, pins } = dims;

  useFrame(() => {
    const g = clockRef.current;
    const tin = m * g + a;
    const slow = (-1 / dims.ratio) * tin;
    if (camRef.current) camRef.current.rotation.z = tin * DEG;
    if (discRef.current) {
      discRef.current.position.set(Math.cos(tin * DEG) * ecc, Math.sin(tin * DEG) * ecc, 0);
      discRef.current.rotation.z = slow * DEG;
    }
    if (outRef.current) outRef.current.rotation.z = slow * DEG;
  });

  const accent = STAGE_TYPES[stage.type].color;
  const zC = W / 2 - 1.5;
  const pinR = R + 2.6;
  return (
    <group>
      <RegisterRoot pk={`stage-${stage.id}`} />
      {/* eccentric cam on the input shaft */}
      <SelectablePart pk={`stage-${stage.id}/cam`} labelR={8}>
        <group position={[0, 0, zC - explode * 10]}>
          <group ref={camRef}>
            <mesh geometry={zCylinderGeo(5.2, 5.2, 6.5, 28)} position={[ecc, 0, 0]}>
              <Mat color={STEEL} metalness={0.8} roughness={0.25} />
            </mesh>
            <mesh geometry={zCylinderGeo(2.2, 2.2, 12, 16)}>
              <Mat color={STEEL_DARK} metalness={0.8} roughness={0.25} />
            </mesh>
          </group>
        </group>
      </SelectablePart>
      {/* lobed disc */}
      <SelectablePart pk={`stage-${stage.id}/disc`} labelR={R + 6}>
        <group position={[0, 0, zC]}>
          <group ref={discRef}>
            <mesh geometry={cycloidDiscGeo(lobes, R - 2.4, 2.2, 7, 5.8, 3.6, 4, (R - 2.4) * 0.55)}>
              <Mat color={accent} metalness={0.6} roughness={0.32} />
            </mesh>
          </group>
        </group>
      </SelectablePart>
      {/* fixed pin ring */}
      <SelectablePart pk={`stage-${stage.id}/pins`} labelR={pinR + 6}>
        <group position={[0, 0, zC + explode * 10]}>
          <mesh geometry={torusGeo(pinR + 2.6, 1.8)}>
            <Mat color={HOUSING} opacity={xray ? 0.4 : 0.95} metalness={0.55} roughness={0.4} />
          </mesh>
          {Array.from({ length: pins }, (_, k) => {
            const ang = (k / pins) * Math.PI * 2;
            return (
              <mesh key={k} geometry={zCylinderGeo(2, 2, 8.6, 14)} position={[Math.cos(ang) * pinR, Math.sin(ang) * pinR, 0]}>
                <Mat color={STEEL} metalness={0.8} roughness={0.28} />
              </mesh>
            );
          })}
        </group>
      </SelectablePart>
      {/* output plate whose pins pass through the disc holes */}
      <SelectablePart pk={`stage-${stage.id}/outdisc`} labelR={R}>
        <group position={[0, 0, zC + 6 + explode * 20]}>
          <group ref={outRef}>
            <mesh geometry={zCylinderGeo(R - 3, R - 3, 3, 36)}>
              <Mat color={STEEL_DARK} metalness={0.7} roughness={0.35} />
            </mesh>
            {Array.from({ length: 4 }, (_, k) => {
              const ang = (k / 4) * Math.PI * 2;
              const orb = (R - 2.4) * 0.55;
              return (
                <mesh key={k} geometry={zCylinderGeo(2.5, 2.5, 9, 14)} position={[Math.cos(ang) * orb, Math.sin(ang) * orb, -5]}>
                  <Mat color={STEEL} metalness={0.8} roughness={0.28} />
                </mesh>
              );
            })}
            <mesh geometry={zCylinderGeo(3, 3, 6, 18)} position={[0, 0, 3.5]}>
              <Mat color={STEEL} metalness={0.85} roughness={0.22} />
            </mesh>
          </group>
        </group>
      </SelectablePart>
    </group>
  );
}

function WormStage({ link, clockRef, explode, xray }: StageProps) {
  const { dims, stage, m, a, W } = link;
  const wormRef = useRef<THREE.Group>(null);
  const wheelRef = useRef<THREE.Group>(null);
  useFrame(() => {
    const g = clockRef.current;
    const tin = m * g + a;
    if (wormRef.current) wormRef.current.rotation.z = tin * DEG;
    if (wheelRef.current) wheelRef.current.rotation.z = (tin / (dims.z2 / dims.starts)) * DEG;
  });
  const accent = STAGE_TYPES[stage.type].color;
  const zC = W / 2;
  void xray;
  return (
    <group>
      <RegisterRoot pk={`stage-${stage.id}`} />
      <SelectablePart pk={`stage-${stage.id}/worm`} labelR={9}>
        <group position={[0, explode * 12, zC]}>
          <group ref={wormRef}>
            <mesh geometry={zCylinderGeo(3.1, 3.1, 17, 24)}>
              <Mat color={STEEL} metalness={0.8} roughness={0.26} />
            </mesh>
            <mesh geometry={helixGeo(4.1, 15.5, 6, 1.15)}>
              <Mat color={accent} metalness={0.65} roughness={0.3} />
            </mesh>
          </group>
        </group>
      </SelectablePart>
      <SelectablePart pk={`stage-${stage.id}/wheel`} labelR={dims.wheelR + 6}>
        {/* wheel axis ⊥ worm axis: rotate local Z onto parent X */}
        <group position={[0, -dims.cd - explode * 12, zC]} rotation={[0, Math.PI / 2, 0]}>
          <group ref={wheelRef}>
            <mesh geometry={spurGearGeo(dims.z2, dims.mod, 9, 2.6)}>
              <Mat color={STEEL} />
            </mesh>
          </group>
          <mesh geometry={zCylinderGeo(2.6, 2.6, 20, 16)}>
            <Mat color={STEEL_DARK} metalness={0.8} roughness={0.25} />
          </mesh>
        </group>
      </SelectablePart>
    </group>
  );
}

function ScrewStage({ link, clockRef, explode }: StageProps) {
  const { dims, stage, m, a, W } = link;
  const screwRef = useRef<THREE.Group>(null);
  const nutRef = useRef<THREE.Group>(null);
  const ball = stage.type === "ballscrew";
  useFrame(() => {
    const g = clockRef.current;
    const tin = m * g + a;
    if (screwRef.current) screwRef.current.rotation.z = tin * DEG;
    if (nutRef.current) nutRef.current.position.z = W / 2 + Math.sin(tin * 0.014) * 9;
  });
  const accent = STAGE_TYPES[stage.type].color;
  return (
    <group>
      <RegisterRoot pk={`stage-${stage.id}`} />
      <SelectablePart pk={`stage-${stage.id}/screw`} labelR={8}>
        <group position={[0, 0, W / 2]}>
          <group ref={screwRef}>
            <mesh geometry={zCylinderGeo(2.8, 2.8, dims.len + 4, 22)}>
              <Mat color={STEEL} metalness={0.8} roughness={0.26} />
            </mesh>
            <mesh geometry={helixGeo(3.6, dims.len, Math.max(5, Math.round(dims.len / Math.max(1.2, dims.lead))), 0.85)}>
              <Mat color={accent} metalness={0.6} roughness={0.32} />
            </mesh>
          </group>
        </group>
      </SelectablePart>
      <SelectablePart pk={`stage-${stage.id}/nut`} labelR={11}>
        <group ref={nutRef} position={[0, explode * 16, W / 2]}>
          <mesh geometry={boxGeo(12, 12, 9.5)}>
            <Mat color={STEEL_DARK} metalness={0.65} roughness={0.38} />
          </mesh>
          {ball && (
            <mesh geometry={torusGeo(4.6, 1)}>
              <Mat color={COPPER} metalness={0.85} roughness={0.28} />
            </mesh>
          )}
          <mesh geometry={boxGeo(16, 2.2, 9.5)} position={[0, -7, 0]}>
            <Mat color={HOUSING} metalness={0.5} roughness={0.45} />
          </mesh>
        </group>
      </SelectablePart>
    </group>
  );
}

function OutputFlange({ clockRef, final }: { clockRef: React.RefObject<number>; final: { m: number; a: number } }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(() => {
    if (ref.current) ref.current.rotation.z = (final.m * clockRef.current + final.a) * DEG;
  });
  return (
    <group>
      <RegisterRoot pk="output" />
      <SelectablePart pk="output" labelR={14}>
        <group position={[0, 0, 3]}>
          <group ref={ref}>
            <mesh geometry={zCylinderGeo(11, 11, 3.6, 40)}>
              <Mat color="#d9a13c" metalness={0.75} roughness={0.3} />
            </mesh>
            {Array.from({ length: 4 }, (_, k) => {
              const ang = (k / 4) * Math.PI * 2;
              return (
                <mesh key={k} geometry={zCylinderGeo(1.5, 1.5, 4.6, 12)} position={[Math.cos(ang) * 7.5, Math.sin(ang) * 7.5, 0]}>
                  <Mat color={STEEL} metalness={0.85} roughness={0.22} />
                </mesh>
              );
            })}
            {/* pointer arm — makes the output speed readable at a glance */}
            <mesh geometry={boxGeo(1.8, 9, 1.6)} position={[0, 5, 2.4]}>
              <Mat color={ACCENT} metalness={0.4} roughness={0.4} />
            </mesh>
          </group>
        </group>
      </SelectablePart>
    </group>
  );
}

// ---------------------------------------------------------------------------
// product covers — the recognizable exteriors of the example actuators.
// Ghosted in X-ray (and made raycast-transparent so the anatomy stays clickable);
// the Explode slider lifts them off like a lid.
// ---------------------------------------------------------------------------

function BoltCircle({ n, r, z, boltR = 1.3, ray }: { n: number; r: number; z: number; boltR?: number; ray?: () => void }) {
  return (
    <>
      {Array.from({ length: n }, (_, k) => {
        const a = (k / n) * Math.PI * 2;
        return (
          <mesh key={k} geometry={zCylinderGeo(boltR, boltR, 1.8, 12)} position={[Math.cos(a) * r, Math.sin(a) * r, z]} raycast={ray}>
            <Mat color={STEEL} metalness={0.85} roughness={0.25} />
          </mesh>
        );
      })}
    </>
  );
}

const CYL_COVERS: Partial<Record<CoverStyle, { color: string; metal: number; rough: number; bolts: number; accent?: string }>> = {
  "qdd-pancake": { color: "#c9962e", metal: 0.85, rough: 0.32, bolts: 12 }, // Mini-Cheetah gold
  "damiao-pancake": { color: "#23262e", metal: 0.55, rough: 0.45, bolts: 8, accent: "#19b8a6" }, // Damiao black + teal
  "harmonic-module": { color: "#8d97a8", metal: 0.78, rough: 0.28, bolts: 16 }, // machined aluminium
};

function CoverAssembly({
  style,
  env,
  xray,
  explode,
  clockRef,
  final,
}: {
  style: CoverStyle;
  env: Envelope;
  xray: boolean;
  explode: number;
  clockRef: React.RefObject<number>;
  final: { m: number; a: number };
}) {
  const hornRef = useRef<THREE.Group>(null);
  useFrame(() => {
    if (hornRef.current) hornRef.current.rotation.z = (final.m * clockRef.current + final.a) * DEG;
  });

  const ghost = xray;
  const ray = ghost ? NO_RAYCAST : undefined;
  const op = ghost ? 0.09 : 0.96;
  const pk = `cover-${style}`;

  const zBack = -40.5;
  const zFront = 2 + env.zEnd + 1.6;
  const zLen = zFront - zBack;
  const zMid = (zBack + zFront) / 2;
  const rc = Math.max(env.r, 17) + 2.5;
  const lift = explode * (rc * 1.2 + 30);

  // ---- NEMA-17: square black body around the motor only ----
  if (style === "nema17") {
    return (
      <group position={[0, lift, 0]}>
        <SelectablePart pk={pk} labelR={27}>
          <mesh geometry={boxGeo(35, 35, 36)} position={[0, 0, -18.8]} raycast={ray}>
            <Mat color="#191b21" metalness={0.35} roughness={0.55} opacity={op} />
          </mesh>
          <mesh geometry={boxGeo(35.6, 35.6, 2.4)} position={[0, 0, -0.2]} raycast={ray}>
            <Mat color="#b9c0cc" metalness={0.8} roughness={0.3} opacity={op} />
          </mesh>
          <mesh geometry={boxGeo(35.6, 35.6, 2.4)} position={[0, 0, -37.4]} raycast={ray}>
            <Mat color="#b9c0cc" metalness={0.8} roughness={0.3} opacity={op} />
          </mesh>
          {/* raised front boss + corner screws — the standard NEMA face */}
          <mesh geometry={zCylinderGeo(11, 11, 2.2, 32)} position={[0, 0, 1.2]} raycast={ray}>
            <Mat color="#b9c0cc" metalness={0.8} roughness={0.3} opacity={op} />
          </mesh>
          {[
            [1, 1],
            [1, -1],
            [-1, 1],
            [-1, -1],
          ].map(([sx, sy], k) => (
            <mesh key={k} geometry={zCylinderGeo(1.6, 1.6, 2, 14)} position={[sx * 13.8, sy * 13.8, 1.2]} raycast={ray}>
              <Mat color={STEEL} metalness={0.85} roughness={0.25} />
            </mesh>
          ))}
        </SelectablePart>
      </group>
    );
  }

  // ---- Dynamixel-style: plastic case + spinning output horn ----
  if (style === "smart-servo") {
    const w = 2 * (env.xMax + 5);
    const h = env.yMax - env.yMin + 12;
    const cy = (env.yMax + env.yMin) / 2;
    return (
      <group>
        <group position={[0, lift, 0]}>
          <SelectablePart pk={pk} labelR={h / 2 + 8}>
            <mesh geometry={boxGeo(w, h, zLen)} position={[0, cy, zMid]} raycast={ray}>
              <Mat color="#26282d" metalness={0.12} roughness={0.62} opacity={ghost ? 0.08 : 0.97} />
            </mesh>
            {[
              [1, 1],
              [1, -1],
              [-1, 1],
              [-1, -1],
            ].map(([sx, sy], k) => (
              <mesh key={k} geometry={zCylinderGeo(1.3, 1.3, 1.6, 12)} position={[sx * (w / 2 - 4.5), cy + sy * (h / 2 - 4.5), zFront + 0.4]} raycast={ray}>
                <Mat color="#4a4e57" metalness={0.5} roughness={0.4} />
              </mesh>
            ))}
          </SelectablePart>
        </group>
        {/* output horn — bolted to the gear train, so it doesn't lift with the case */}
        <group position={[0, env.outY, zFront + 1.6]}>
          <RegisterRoot pk="output" />
          <SelectablePart pk="output" labelR={13}>
            <group ref={hornRef}>
              <mesh geometry={zCylinderGeo(9.5, 9.5, 2.6, 36)}>
                <Mat color="#b9c0cc" metalness={0.75} roughness={0.3} />
              </mesh>
              <mesh geometry={zCylinderGeo(3.4, 3.4, 4, 20)} position={[0, 0, 1.2]}>
                <Mat color="#8f99aa" metalness={0.8} roughness={0.28} />
              </mesh>
              {Array.from({ length: 6 }, (_, k) => {
                const a = (k / 6) * Math.PI * 2;
                return (
                  <mesh key={k} geometry={zCylinderGeo(1, 1, 1.4, 10)} position={[Math.cos(a) * 6.4, Math.sin(a) * 6.4, 1.5]}>
                    <Mat color="#5c6472" metalness={0.6} roughness={0.35} />
                  </mesh>
                );
              })}
              <mesh geometry={boxGeo(1.6, 8, 1.4)} position={[0, 4.4, 2]}>
                <Mat color={ACCENT} metalness={0.4} roughness={0.4} />
              </mesh>
            </group>
          </SelectablePart>
        </group>
      </group>
    );
  }

  // ---- cylindrical family: QDD pancake / Damiao joint motor / harmonic module ----
  const conf = CYL_COVERS[style]!;
  return (
    <group position={[0, lift, 0]}>
      <SelectablePart pk={pk} labelR={rc + 6}>
        <mesh geometry={zCylinderGeo(rc, rc, zLen, 56, true)} position={[0, 0, zMid]} raycast={ray}>
          <Mat color={conf.color} metalness={conf.metal} roughness={conf.rough} opacity={op} side={THREE.DoubleSide} />
        </mesh>
        <mesh geometry={zCylinderGeo(rc, rc, 2.2, 56)} position={[0, 0, zBack + 1]} raycast={ray}>
          <Mat color={conf.color} metalness={conf.metal} roughness={conf.rough} opacity={op} />
        </mesh>
        <mesh geometry={annulusGeo(rc, 12.6, 2.4)} position={[0, 0, zFront - 1]} raycast={ray}>
          <Mat color={conf.color} metalness={conf.metal} roughness={conf.rough} opacity={op} />
        </mesh>
        <BoltCircle n={conf.bolts} r={rc - 3.4} z={zFront + 0.2} ray={ray} />
        {conf.accent && (
          <mesh geometry={torusGeo(rc + 0.15, 0.7)} position={[0, 0, zFront - 4.2]} raycast={ray}>
            <Mat color={conf.accent} metalness={0.4} roughness={0.4} opacity={ghost ? 0.3 : 1} />
          </mesh>
        )}
        {style === "harmonic-module" && (
          <>
            <mesh geometry={torusGeo(rc + 0.1, 0.5)} position={[0, 0, zMid + zLen * 0.18]} raycast={ray}>
              <Mat color="#5d6674" metalness={0.7} roughness={0.35} opacity={ghost ? 0.2 : 1} />
            </mesh>
            <mesh geometry={torusGeo(rc + 0.1, 0.5)} position={[0, 0, zMid - zLen * 0.18]} raycast={ray}>
              <Mat color="#5d6674" metalness={0.7} roughness={0.35} opacity={ghost ? 0.2 : 1} />
            </mesh>
          </>
        )}
      </SelectablePart>
    </group>
  );
}

const STAGE_RENDERERS: Record<Stage["type"], (p: StageProps) => React.ReactNode> = {
  spur: (p) => <SpurStage {...p} />,
  belt: (p) => <BeltStage {...p} />,
  planetary: (p) => <PlanetaryStage {...p} />,
  harmonic: (p) => <HarmonicStage {...p} />,
  cycloidal: (p) => <CycloidalStage {...p} />,
  worm: (p) => <WormStage {...p} />,
  leadscrew: (p) => <ScrewStage {...p} />,
  ballscrew: (p) => <ScrewStage {...p} />,
};

function ChainNode({
  links,
  index,
  clockRef,
  explode,
  xray,
  final,
  isLinear,
}: {
  links: Link[];
  index: number;
  clockRef: React.RefObject<number>;
  explode: number;
  xray: boolean;
  final: { m: number; a: number };
  isLinear: boolean;
}) {
  if (index >= links.length) {
    // Linear chains end at the nut — the flange only makes sense for rotary output.
    return isLinear ? null : <OutputFlange clockRef={clockRef} final={final} />;
  }
  const link = links[index];
  return (
    <group>
      {STAGE_RENDERERS[link.stage.type]({ link, clockRef, explode, xray })}
      <group position={link.outPos} rotation={link.outRot}>
        <group position={[0, 0, link.baseGap + explode * 15]}>
          <ChainNode links={links} index={index + 1} clockRef={clockRef} explode={explode} xray={xray} final={final} isLinear={isLinear} />
        </group>
      </group>
    </group>
  );
}

// ---------------------------------------------------------------------------
// root
// ---------------------------------------------------------------------------

export function ActuatorAssembly() {
  const design = useDesignStore((s) => s.design);
  const playing = useDesignStore((s) => s.playing);
  const simSpeed = useDesignStore((s) => s.simSpeed);
  const explode = useSceneStore((s) => s.explode);
  const xray = useSceneStore((s) => s.xray);

  const clockRef = useRef(0);
  useFrame((_, dt) => {
    if (playing) clockRef.current += Math.min(dt, 0.1) * BASE_SPEED * simSpeed;
  });

  const { links, final, env } = useMemo(() => buildChain(design.stages), [design.stages]);
  const isLinear = design.stages.some((s) => STAGE_TYPES[s.type].linear);
  // Covers don't apply once a worm turns the chain 90°.
  const cover = design.cover && !env.hasWorm ? design.cover : undefined;
  // The servo horn replaces the generic output flange.
  const hideFlange = isLinear || cover === "smart-servo";

  // Center the whole machine on the origin (approximately).
  const totalLen = useMemo(() => {
    const motor = 40;
    const chain = links.reduce((acc, l) => acc + l.W + l.baseGap + explode * 15, 0) + (isLinear ? 0 : 10);
    return motor + chain;
  }, [links, explode, isLinear]);

  return (
    <group position={[0, 0, -(totalLen / 2 - 40)]}>
      <MotorAssembly clockRef={clockRef} explode={explode} xray={xray} hasCover={!!cover} />
      <group position={[0, 0, 2 + explode * 12]}>
        <ChainNode links={links} index={0} clockRef={clockRef} explode={explode} xray={xray} final={final} isLinear={hideFlange} />
      </group>
      {cover && <CoverAssembly style={cover} env={env} xray={xray} explode={explode} clockRef={clockRef} final={final} />}
    </group>
  );
}

export function useTotalLength(): number {
  const design = useDesignStore((s) => s.design);
  return useMemo(() => {
    const { links } = buildChain(design.stages);
    return 46 + links.reduce((acc, l) => acc + l.W + l.baseGap, 0) + 12;
  }, [design.stages]);
}

// re-export for meshing sanity checks in dev
export { generateGear, generateRingGear };
