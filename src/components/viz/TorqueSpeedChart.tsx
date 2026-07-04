"use client";

import { useMemo, useRef, useState } from "react";
import { fmt } from "@/lib/physics";
import type { DriveResult } from "@/lib/types";

const W = 420;
const H = 250;
const PAD = { l: 46, r: 46, t: 16, b: 34 };

export default function TorqueSpeedChart({ drive }: { drive: DriveResult }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hoverX, setHoverX] = useState<number | null>(null);

  const linear = drive.isLinear && drive.linear;
  // Scale factors to express the curve as force/linear-speed when it ends in a screw.
  const fScale = linear ? drive.linear!.stallForce / (drive.stallTorque || 1) : 1;
  const sScale = linear ? drive.linear!.noLoadSpeed / (drive.noLoadSpeed || 1) : 1;

  const data = useMemo(() => {
    const pts = drive.curve.map((p) => ({
      speed: p.speed * sScale,
      torque: p.torque * fScale,
      power: p.powerOut,
    }));
    const maxSpeed = Math.max(1e-6, ...pts.map((p) => p.speed));
    const maxTorque = Math.max(1e-6, ...pts.map((p) => p.torque));
    const maxPower = Math.max(1e-6, ...pts.map((p) => p.power));
    return { pts, maxSpeed, maxTorque, maxPower };
  }, [drive, fScale, sScale]);

  const xOf = (speed: number) => PAD.l + (speed / data.maxSpeed) * (W - PAD.l - PAD.r);
  const yTorque = (t: number) => H - PAD.b - (t / data.maxTorque) * (H - PAD.t - PAD.b);
  const yPower = (p: number) => H - PAD.b - (p / data.maxPower) * (H - PAD.t - PAD.b);

  const torquePath = data.pts.map((p, i) => `${i ? "L" : "M"} ${xOf(p.speed).toFixed(1)} ${yTorque(p.torque).toFixed(1)}`).join(" ");
  const powerPath = data.pts.map((p, i) => `${i ? "L" : "M"} ${xOf(p.speed).toFixed(1)} ${yPower(p.power).toFixed(1)}`).join(" ");
  const torqueArea = `${torquePath} L ${xOf(data.pts[data.pts.length - 1].speed).toFixed(1)} ${H - PAD.b} L ${PAD.l} ${H - PAD.b} Z`;

  const peak = drive.peakPower;
  const peakSpeed = peak.speed * sScale;
  const peakPx = { x: xOf(peakSpeed), y: yPower(peak.powerOut) };

  // hover → nearest sample
  const hovered = useMemo(() => {
    if (hoverX == null) return null;
    const speed = ((hoverX - PAD.l) / (W - PAD.l - PAD.r)) * data.maxSpeed;
    let best = data.pts[0];
    for (const p of data.pts) if (Math.abs(p.speed - speed) < Math.abs(best.speed - speed)) best = p;
    return best;
  }, [hoverX, data]);

  const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const rect = svgRef.current!.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * W;
    setHoverX(Math.max(PAD.l, Math.min(W - PAD.r, x)));
  };

  const torqueUnit = linear ? "N" : "N·m";
  const speedUnit = linear ? "mm/s" : "rpm";

  return (
    <div className="w-full">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="w-full touch-none"
        onPointerMove={onMove}
        onPointerLeave={() => setHoverX(null)}
      >
        {/* grid */}
        {[0, 0.25, 0.5, 0.75, 1].map((f) => (
          <g key={f}>
            <line x1={PAD.l} y1={PAD.t + f * (H - PAD.t - PAD.b)} x2={W - PAD.r} y2={PAD.t + f * (H - PAD.t - PAD.b)} stroke="var(--border)" strokeWidth={1} />
          </g>
        ))}
        {/* axes labels */}
        <text x={PAD.l - 8} y={PAD.t + 4} textAnchor="end" className="fill-[var(--muted)]" fontSize={9}>
          {fmt(data.maxTorque, 1)}
        </text>
        <text x={PAD.l - 8} y={H - PAD.b} textAnchor="end" className="fill-[var(--muted)]" fontSize={9}>
          0
        </text>
        <text x={W - PAD.r + 8} y={PAD.t + 4} textAnchor="start" className="fill-[var(--muted)]" fontSize={9}>
          {fmt(data.maxPower, 0)}
        </text>
        <text x={PAD.l} y={H - 8} textAnchor="start" className="fill-[var(--muted)]" fontSize={9}>
          0
        </text>
        <text x={W - PAD.r} y={H - 8} textAnchor="end" className="fill-[var(--muted)]" fontSize={9}>
          {fmt(data.maxSpeed, 0)} {speedUnit}
        </text>

        {/* torque area + line */}
        <path d={torqueArea} fill="var(--accent)" fillOpacity={0.1} />
        <path d={torquePath} fill="none" stroke="var(--accent)" strokeWidth={2.4} />
        {/* power line */}
        <path d={powerPath} fill="none" stroke="var(--power)" strokeWidth={2} strokeDasharray="1 0" opacity={0.9} />

        {/* peak power marker */}
        <circle cx={peakPx.x} cy={peakPx.y} r={4} fill="var(--power)" stroke="var(--surface)" strokeWidth={1.5} />
        <line x1={peakPx.x} y1={peakPx.y} x2={peakPx.x} y2={H - PAD.b} stroke="var(--power)" strokeWidth={1} strokeDasharray="3 3" opacity={0.5} />

        {/* hover */}
        {hovered && (
          <g>
            <line x1={xOf(hovered.speed)} y1={PAD.t} x2={xOf(hovered.speed)} y2={H - PAD.b} stroke="var(--text)" strokeWidth={1} strokeOpacity={0.35} />
            <circle cx={xOf(hovered.speed)} cy={yTorque(hovered.torque)} r={3.5} fill="var(--accent)" />
            <circle cx={xOf(hovered.speed)} cy={yPower(hovered.power)} r={3.5} fill="var(--power)" />
          </g>
        )}
      </svg>

      <div className="mt-1 flex flex-wrap items-center justify-between gap-2 text-[11px]">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2 w-3 bg-[var(--accent)]" /> Torque ({torqueUnit})
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2 w-3 bg-[var(--power)]" /> Power (W)
          </span>
        </div>
        {hovered ? (
          <span className="font-mono text-[var(--muted)]">
            @ {fmt(hovered.speed, 0)} {speedUnit}: {fmt(hovered.torque, 2)} {torqueUnit} · {fmt(hovered.power, 0)} W
          </span>
        ) : (
          <span className="text-[var(--muted)]">Peak {fmt(peak.powerOut, 0)} W</span>
        )}
      </div>
    </div>
  );
}
