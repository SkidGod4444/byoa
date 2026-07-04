"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, FlaskConical, Gauge, Play, RotateCw, X, XCircle } from "lucide-react";
import { simulateMove, stressTest, type MoveResult, type StressSeverity } from "@/lib/simulate";
import { fmt } from "@/lib/physics";
import { useDesignStore, useDrive } from "@/store/designStore";
import { useLabStore } from "@/store/labStore";
import { Field } from "@/components/ui/controls";

const DEG = Math.PI / 180;

// ---- animated arm swinging the trajectory ----------------------------------
function ArmPlayer({ result, startDeg }: { result: MoveResult; startDeg: number }) {
  const ref = useRef<SVGGElement>(null);
  const massRef = useRef<SVGCircleElement>(null);
  const trailRef = useRef<SVGTextElement>(null);
  const samples = result.samples;

  useEffect(() => {
    if (!samples.length) return;
    let raf = 0;
    let t0 = 0;
    const dur = samples[samples.length - 1].t;
    const angleAt = (t: number) => {
      // hold the final angle for a beat, then loop
      if (t >= dur) return samples[samples.length - 1].angleDeg;
      let i = 1;
      while (i < samples.length && samples[i].t < t) i++;
      const a = samples[i - 1];
      const b = samples[Math.min(i, samples.length - 1)];
      const f = (t - a.t) / Math.max(1e-4, b.t - a.t);
      return a.angleDeg + f * (b.angleDeg - a.angleDeg);
    };
    const loop = (now: number) => {
      if (!t0) t0 = now;
      const elapsed = ((now - t0) / 1000) % (dur + 0.8);
      const ang = angleAt(elapsed);
      // SVG y is down; negate so +angle swings up
      if (ref.current) ref.current.setAttribute("transform", `rotate(${-ang})`);
      if (trailRef.current) trailRef.current.textContent = `${Math.round(ang)}°`;
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [samples]);

  const R = 96;
  return (
    <svg viewBox="-130 -120 260 240" className="h-full w-full">
      {/* target + start guides */}
      <line x1={0} y1={0} x2={R * Math.cos(-result.samples.at(-1)!.angleDeg * DEG)} y2={R * Math.sin(-result.samples.at(-1)!.angleDeg * DEG)} stroke="var(--accent)" strokeWidth={1} strokeDasharray="3 4" opacity={0.5} />
      <line x1={0} y1={0} x2={R * Math.cos(-startDeg * DEG)} y2={R * Math.sin(-startDeg * DEG)} stroke="var(--muted)" strokeWidth={1} strokeDasharray="2 4" opacity={0.35} />
      {/* ground */}
      <line x1={-120} y1={0} x2={120} y2={0} stroke="var(--border)" strokeWidth={1} />
      {/* the arm */}
      <g ref={ref}>
        <line x1={0} y1={0} x2={R} y2={0} stroke="var(--text)" strokeWidth={5} strokeLinecap="round" />
        <circle ref={massRef} cx={R} cy={0} r={13} fill="var(--accent)" />
      </g>
      {/* pivot */}
      <circle r={7} fill="var(--surface-3)" stroke="var(--border-strong)" strokeWidth={1.5} />
      <circle r={2.5} fill="var(--muted)" />
      <text ref={trailRef} x={0} y={-100} textAnchor="middle" className="fill-[var(--muted)]" fontSize={13} fontFamily="var(--font-mono)">
        0°
      </text>
    </svg>
  );
}

// ---- angle / torque plot ----------------------------------------------------
function MovePlot({ result }: { result: MoveResult }) {
  const W = 300;
  const H = 130;
  const pad = { l: 4, r: 4, t: 8, b: 14 };
  const s = result.samples;
  if (s.length < 2) return null;
  const tMax = s[s.length - 1].t;
  const angles = s.map((p) => p.angleDeg);
  const aMin = Math.min(...angles, 0);
  const aMax = Math.max(...angles, s[s.length - 1].angleDeg);
  const target = s[s.length - 1].angleDeg;
  const x = (t: number) => pad.l + (t / tMax) * (W - pad.l - pad.r);
  const y = (a: number) => pad.t + (1 - (a - aMin) / Math.max(1e-6, aMax - aMin)) * (H - pad.t - pad.b);
  const path = s.map((p, i) => `${i ? "L" : "M"} ${x(p.t).toFixed(1)} ${y(p.angleDeg).toFixed(1)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
      <line x1={pad.l} y1={y(target)} x2={W - pad.r} y2={y(target)} stroke="var(--accent)" strokeWidth={1} strokeDasharray="3 4" opacity={0.6} />
      <path d={path} fill="none" stroke="var(--text)" strokeWidth={2} />
      <text x={pad.l} y={H - 2} className="fill-[var(--muted)]" fontSize={8}>
        0 s
      </text>
      <text x={W - pad.r} y={H - 2} textAnchor="end" className="fill-[var(--muted)]" fontSize={8}>
        {tMax.toFixed(2)} s · angle vs time
      </text>
    </svg>
  );
}

function MotionTab() {
  const design = useDesignStore((s) => s.design);
  const drive = useDrive();
  const mass = useLabStore((s) => s.mass);
  const armLen = useLabStore((s) => s.armLen);
  const targetDeg = useLabStore((s) => s.targetDeg);
  const setMass = useLabStore((s) => s.setMass);
  const setArmLen = useLabStore((s) => s.setArmLen);
  const setTargetDeg = useLabStore((s) => s.setTargetDeg);
  const [runKey, setRunKey] = useState(0);

  const result = useMemo(
    () => simulateMove(design, drive, { mass, armLen, startDeg: 0, targetDeg }),
    [design, drive, mass, armLen, targetDeg],
  );

  if (drive.isLinear) {
    return (
      <div className="p-6 text-center text-[13px] text-[var(--muted)]">
        Motion Lab simulates a rotary joint swinging a load. This design ends in a screw (linear output) — remove the
        screw stage to try it, or use the Stress test tab.
      </div>
    );
  }

  const reflectPct = (result.reflected / (result.reflected + result.payloadInertia)) * 100;

  return (
    <div className="grid gap-4 p-4 sm:grid-cols-2">
      {/* left: animated arm */}
      <div className="flex flex-col">
        <div className="relative aspect-square w-full border border-[var(--border)] bg-[var(--surface-2)]" key={runKey}>
          <ArmPlayer result={result} startDeg={0} />
        </div>
        <button
          onClick={() => setRunKey((k) => k + 1)}
          className="mt-2 flex items-center justify-center gap-1.5 border border-[var(--border)] bg-[var(--surface-2)] py-1.5 text-[12px] font-medium text-[var(--text)] transition hover:border-[var(--accent)]"
        >
          <RotateCw size={12} /> Replay
        </button>
      </div>

      {/* right: controls + result */}
      <div className="flex flex-col gap-3">
        <div className="space-y-2.5">
          <Field label="Payload" value={mass} min={0.1} max={40} step={0.1} precision={1} unit="kg" onChange={setMass} />
          <Field label="Arm length" value={armLen * 100} min={5} max={80} step={1} precision={0} unit="cm" onChange={(v) => setArmLen(v / 100)} />
          <Field label="Swing to" value={targetDeg} min={15} max={170} step={5} precision={0} unit="deg" onChange={setTargetDeg} />
        </div>

        <MovePlot result={result} />

        <div className={`border-l-2 p-2.5 text-[12px] leading-snug ${result.canHold && result.reached ? "border-[var(--good)] text-[var(--text)]" : "border-[var(--bad)] text-[var(--text)]"}`}>
          {result.verdict}
        </div>

        <div className="grid grid-cols-3 gap-2">
          <Metric label="Settle" value={result.settleTime != null ? `${fmt(result.settleTime, 2)}s` : "—"} />
          <Metric label="Overshoot" value={`${fmt(result.overshoot, 0)}%`} />
          <Metric label="Peak" value={`${fmt(result.peakSpeed, 0)} rpm`} />
        </div>

        <div className="border border-[var(--border)] bg-[var(--surface-2)] p-2.5">
          <div className="mb-1 text-[10px] uppercase tracking-wide text-[var(--muted)]">What makes it sluggish or snappy</div>
          <div className="flex h-3 w-full overflow-hidden border border-[var(--border)]">
            <div className="h-full bg-[var(--accent)]" style={{ width: `${reflectPct}%` }} title="reflected motor inertia" />
            <div className="h-full bg-[var(--muted)]" style={{ width: `${100 - reflectPct}%` }} title="payload inertia" />
          </div>
          <div className="mt-1 flex justify-between text-[10px] text-[var(--muted)]">
            <span className="text-[var(--accent)]">reflected rotor {fmt(reflectPct, 0)}%</span>
            <span>payload {fmt(100 - reflectPct, 0)}%</span>
          </div>
          <p className="mt-1.5 text-[10.5px] leading-snug text-[var(--muted)]">
            Gearing multiplies the motor&apos;s spinning mass by ratio². Crank the ratio up and the reflected share
            balloons — the joint feels heavy even with plenty of torque. That&apos;s why fast robots keep ratios low.
          </p>
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-[var(--border)] bg-[var(--surface-2)] px-2 py-1.5 text-center">
      <div className="font-mono text-[13px] font-semibold text-[var(--text)]">{value}</div>
      <div className="text-[9px] uppercase tracking-wide text-[var(--muted)]">{label}</div>
    </div>
  );
}

const SEV_ICON: Record<StressSeverity, typeof CheckCircle2> = { ok: CheckCircle2, warn: AlertTriangle, bad: XCircle };
const SEV_COLOR: Record<StressSeverity, string> = { ok: "var(--good)", warn: "var(--warn)", bad: "var(--bad)" };

function StressTab() {
  const design = useDesignStore((s) => s.design);
  const drive = useDrive();
  const mass = useLabStore((s) => s.mass);
  const armLen = useLabStore((s) => s.armLen);
  const setMass = useLabStore((s) => s.setMass);
  const setArmLen = useLabStore((s) => s.setArmLen);

  const findings = useMemo(() => stressTest(design, drive, { mass, armLen }), [design, drive, mass, armLen]);

  return (
    <div className="p-4">
      <div className="grid gap-2.5 sm:grid-cols-2">
        <Field label="Payload" value={mass} min={0.1} max={40} step={0.1} precision={1} unit="kg" onChange={setMass} />
        {!drive.isLinear && <Field label="Arm length" value={armLen * 100} min={5} max={80} step={1} precision={0} unit="cm" onChange={(v) => setArmLen(v / 100)} />}
      </div>
      <div className="mt-3 space-y-2">
        {findings.map((f) => {
          const Icon = SEV_ICON[f.severity];
          const color = SEV_COLOR[f.severity];
          return (
            <div key={f.id} className="border p-3" style={{ borderColor: `color-mix(in srgb, ${color} 40%, transparent)`, background: `color-mix(in srgb, ${color} 7%, transparent)` }}>
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-2 text-[13px] font-semibold text-[var(--text)]">
                  <Icon size={14} style={{ color }} />
                  {f.title}
                </span>
                {f.metric && <span className="font-mono text-[11px]" style={{ color }}>{f.metric}</span>}
              </div>
              <p className="mt-1.5 text-[12px] leading-snug text-[var(--muted)]">{f.detail}</p>
            </div>
          );
        })}
      </div>
      <p className="mt-3 text-[10.5px] leading-snug text-[var(--muted)]">
        These are the limits a spec sheet hides. Thermal and continuous-torque numbers use a simple I²R heating rule
        (~40% of peak current sustained) — illustrative, not a datasheet.
      </p>
    </div>
  );
}

export default function LabModal() {
  const open = useLabStore((s) => s.open);
  const tab = useLabStore((s) => s.tab);
  const setTab = useLabStore((s) => s.setTab);
  const close = useLabStore((s) => s.close);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 sm:p-8" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={close} />
      <div className="relative flex max-h-[88vh] w-full max-w-2xl flex-col overflow-hidden border border-[var(--border)] bg-[var(--surface)] shadow-2xl animate-fade-up">
        <div className="h-0.5 w-full bg-[var(--accent)]" />
        <div className="flex items-center gap-3 border-b border-[var(--border)] p-4">
          <FlaskConical size={16} className="text-[var(--accent)]" />
          <div>
            <h2 className="text-[15px] font-bold text-[var(--text)]">Test Lab</h2>
            <p className="text-[11px] text-[var(--muted)]">Put your actuator to work — watch it move, then find where it breaks.</p>
          </div>
          <button onClick={close} className="ml-auto grid h-8 w-8 place-items-center border border-[var(--border)] text-[var(--muted)] hover:border-[var(--bad)] hover:text-[var(--bad)]">
            <X size={14} />
          </button>
        </div>

        <div className="flex gap-1 border-b border-[var(--border)] px-3 pt-2">
          {(
            [
              { key: "motion", label: "Motion Lab", icon: Play },
              { key: "stress", label: "Stress test", icon: Gauge },
            ] as const
          ).map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-1.5 border-b-2 px-3 py-2 text-[12px] font-medium transition ${tab === t.key ? "border-[var(--accent)] text-[var(--text)]" : "border-transparent text-[var(--muted)] hover:text-[var(--text)]"}`}
            >
              <t.icon size={13} />
              {t.label}
            </button>
          ))}
        </div>

        <div className="overflow-y-auto">{tab === "motion" ? <MotionTab /> : <StressTab />}</div>
      </div>
    </div>
  );
}
