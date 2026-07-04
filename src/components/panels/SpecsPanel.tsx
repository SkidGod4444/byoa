"use client";

import { BicepsFlexed, Hand, Zap } from "lucide-react";
import { fmt, ratioLabel } from "@/lib/physics";
import { useDrive } from "@/store/designStore";
import type { BackdriveRating } from "@/lib/types";
import { SectionTitle, Stat } from "@/components/ui/controls";
import TorqueSpeedChart from "@/components/viz/TorqueSpeedChart";

const RATING: Record<BackdriveRating, { label: string; tone: "good" | "warn" | "bad"; note: string }> = {
  excellent: { label: "Excellent", tone: "good", note: "Push the output and it gives — ideal for legs and safe robots." },
  good: { label: "Good", tone: "good", note: "Push the output and the motor turns." },
  moderate: { label: "Moderate", tone: "warn", note: "Backdrives, but with noticeable resistance." },
  poor: { label: "Poor", tone: "bad", note: "Very hard to move from the output side." },
  none: { label: "Self-locking", tone: "bad", note: "Holds its position with the power off — can't be pushed back." },
};

/** Translate engineering numbers into felt quantities for beginners. */
function PlainTerms() {
  const drive = useDrive();
  const r = RATING[drive.backdrive];

  let strength: string;
  let speed: string;
  if (drive.isLinear && drive.linear) {
    const kg = drive.linear.stallForce / 9.81;
    strength = `pushes with up to ${fmt(drive.linear.stallForce, 0)} N — like lifting ${fmt(kg, kg < 20 ? 1 : 0)} kg straight up`;
    speed = `travels up to ${fmt(drive.linear.noLoadSpeed, 0)} mm/s`;
  } else {
    // torque τ can hold m = τ / (g·r) at the end of a 10 cm arm
    const kg = drive.stallTorque / (9.81 * 0.1);
    strength = `can hold ~${fmt(kg, kg < 20 ? 1 : 0)} kg at the end of a 10 cm arm`;
    const rps = drive.noLoadSpeed / 60;
    speed = rps >= 1 ? `spins up to ${fmt(rps, 1)} turns per second` : `takes ${fmt(rps > 0 ? 1 / rps : Infinity, 1)} s per turn at full speed`;
  }

  return (
    <div className="space-y-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-3">
      <div className="text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">In plain terms</div>
      <p className="flex gap-2 text-[12px] leading-snug text-[var(--text)]">
        <BicepsFlexed size={14} className="mt-0.5 shrink-0 text-[var(--accent)]" /> <span>It {strength}.</span>
      </p>
      <p className="flex gap-2 text-[12px] leading-snug text-[var(--text)]">
        <Zap size={14} className="mt-0.5 shrink-0 text-[var(--warn)]" /> <span>It {speed}.</span>
      </p>
      <p className="flex gap-2 text-[12px] leading-snug text-[var(--text)]">
        <Hand size={14} className="mt-0.5 shrink-0 text-[var(--muted)]" /> <span>{r.note}</span>
      </p>
    </div>
  );
}

export default function SpecsPanel() {
  const drive = useDrive();
  const r = RATING[drive.backdrive];

  return (
    <div className="panel p-3.5">
      <SectionTitle right={<span className="font-mono text-[11px] text-[var(--accent)]">{ratioLabel(drive.totalRatio)}</span>}>
        What it can do
      </SectionTitle>

      <PlainTerms />

      {/* hero numbers */}
      <div className="mt-2 grid grid-cols-2 gap-2">
        {drive.isLinear && drive.linear ? (
          <>
            <Stat big label="Max force" concept="torque" value={fmt(drive.linear.stallForce, 0)} unit="N" tone="accent" />
            <Stat big label="Max speed" concept="speed" value={fmt(drive.linear.noLoadSpeed, 0)} unit="mm/s" />
          </>
        ) : (
          <>
            <Stat big label="Stall torque" concept="stall-torque" value={fmt(drive.stallTorque, drive.stallTorque < 10 ? 2 : 1)} unit="N·m" tone="accent" />
            <Stat big label="No-load speed" concept="no-load-speed" value={fmt(drive.noLoadSpeed, drive.noLoadSpeed < 100 ? 1 : 0)} unit="rpm" />
          </>
        )}
      </div>

      {/* backdrivability */}
      <div className="mt-2 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2.5">
        <div className="flex items-center justify-between">
          <span className="flex items-center text-[10px] uppercase tracking-wide text-[var(--muted)]">Backdrivability</span>
          <span
            className={`px-2 py-0.5 text-[11px] font-semibold ${
              r.tone === "good" ? "bg-[var(--good)]/15 text-[var(--good)]" : r.tone === "warn" ? "bg-[var(--warn)]/15 text-[var(--warn)]" : "bg-[var(--bad)]/15 text-[var(--bad)]"
            }`}
          >
            {r.label}
          </span>
        </div>
      </div>

      {/* engineer detail */}
      <details data-tour="engineer" className="group mt-2">
        <summary className="flex cursor-pointer select-none items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-[11px] font-medium text-[var(--muted)] transition hover:text-[var(--text)]">
          Engineer view — curve & full specs
          <svg width="10" height="10" viewBox="0 0 10 10" className="transition group-open:rotate-180">
            <path d="M2 3.5 L5 6.5 L8 3.5" fill="none" stroke="currentColor" strokeWidth="1.3" />
          </svg>
        </summary>
        <div className="mt-2 space-y-2">
          <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-2.5">
            <TorqueSpeedChart drive={drive} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Stat label="Peak power" concept="power" value={fmt(drive.peakPower.powerOut, 0)} unit="W" tone="warn" />
            <Stat label="Peak efficiency" concept="efficiency" value={fmt(drive.peakEfficiency.efficiency * 100, 0)} unit="%" />
            <Stat label="Drivetrain loss" value={fmt((1 - drive.totalEfficiency) * 100, 0)} unit="%" tone={drive.totalEfficiency < 0.7 ? "bad" : "default"} />
            <Stat label="Backlash" concept="backlash" value={fmt(drive.backlash, 1)} unit="arcmin" tone={drive.backlash < 2 ? "good" : "default"} />
            <Stat label="Reflected inertia" concept="reflected-inertia" value={fmt(drive.reflectedInertia, 0)} unit="kg·mm²" />
            <Stat label="Total ratio" concept="gear-ratio" value={ratioLabel(drive.totalRatio)} />
          </div>
        </div>
      </details>
    </div>
  );
}
