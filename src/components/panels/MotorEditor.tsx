"use client";

import { MOTOR_TYPES } from "@/lib/catalog";
import { deriveMotor, fmt } from "@/lib/physics";
import { useDesignStore } from "@/store/designStore";
import type { MotorType } from "@/lib/types";
import { Field, Segmented, SectionTitle } from "@/components/ui/controls";

export default function MotorEditor() {
  const motor = useDesignStore((s) => s.design.motor);
  const updateMotor = useDesignStore((s) => s.updateMotor);
  const setMotorType = useDesignStore((s) => s.setMotorType);
  const info = MOTOR_TYPES[motor.type];
  const d = deriveMotor(motor);

  return (
    <div className="panel p-3.5">
      <SectionTitle>1 · Power Source</SectionTitle>
      <p className="mb-2.5 text-[11px] leading-snug text-[var(--muted)]">
        The engine. Every actuator starts with raw spin — pick what kind, then shape it below.
      </p>

      <Segmented<MotorType>
        value={motor.type}
        onChange={setMotorType}
        options={[
          { value: "brushed-dc", label: "Brushed", color: MOTOR_TYPES["brushed-dc"].color },
          { value: "bldc", label: "BLDC", color: MOTOR_TYPES.bldc.color },
          { value: "stepper", label: "Stepper", color: MOTOR_TYPES.stepper.color },
        ]}
      />

      <p className="mt-2.5 text-[11px] leading-snug text-[var(--muted)]">{info.tagline}</p>
      <p className="mt-1 text-[10px] text-[var(--muted)] opacity-70">
        Switching loads that motor family&apos;s typical numbers — tweak them freely after.
      </p>

      <div className="mt-3 space-y-3">
        <Field label="Voltage" concept="motor" value={motor.voltage} min={3} max={60} step={0.5} precision={1} unit="V" onChange={(v) => updateMotor({ voltage: v })} />
        <Field label="Kv (speed const)" concept="kv-kt" value={motor.kv} min={20} max={3000} step={5} precision={0} unit="rpm/V" onChange={(v) => updateMotor({ kv: v })} />
        <Field label="Winding resistance" concept="back-emf" value={motor.resistance} min={0.02} max={10} step={0.01} precision={2} unit="Ω" onChange={(v) => updateMotor({ resistance: v })} />
        <Field label="Current limit" concept="current-limit" value={motor.currentLimit} min={1} max={80} step={0.5} precision={1} unit="A" onChange={(v) => updateMotor({ currentLimit: v })} />
        <Field label="No-load current" value={motor.noLoadCurrent} min={0} max={3} step={0.05} precision={2} unit="A" onChange={(v) => updateMotor({ noLoadCurrent: v })} />
        <Field label="Rotor inertia" concept="reflected-inertia" value={motor.rotorInertia} min={1} max={400} step={1} precision={0} unit="kg·mm²" onChange={(v) => updateMotor({ rotorInertia: v })} />
      </div>

      {/* derived read-outs */}
      <div className="mt-3 grid grid-cols-3 gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-2 text-center">
        <div>
          <div className="font-mono text-[12px] font-semibold text-[var(--text)]">{fmt(d.kt, 3)}</div>
          <div className="text-[9px] uppercase text-[var(--muted)]">Kt N·m/A</div>
        </div>
        <div>
          <div className="font-mono text-[12px] font-semibold text-[var(--text)]">{fmt(d.noLoadSpeed, 0)}</div>
          <div className="text-[9px] uppercase text-[var(--muted)]">no-load rpm</div>
        </div>
        <div>
          <div className="font-mono text-[12px] font-semibold text-[var(--text)]">{fmt(d.stallTorque, 2)}</div>
          <div className="text-[9px] uppercase text-[var(--muted)]">stall N·m</div>
        </div>
      </div>
    </div>
  );
}
