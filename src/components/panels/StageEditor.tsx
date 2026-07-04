"use client";

import { STAGE_TYPES } from "@/lib/catalog";
import { planetaryRingTeeth, ratioLabel, stageRatio } from "@/lib/physics";
import { useDesignStore } from "@/store/designStore";
import type { Stage } from "@/lib/types";
import { Field } from "@/components/ui/controls";

export default function StageEditor({ stage }: { stage: Stage }) {
  const updateStage = useDesignStore((s) => s.updateStage);
  const info = STAGE_TYPES[stage.type];
  const set = (patch: Partial<Stage>) => updateStage(stage.id, patch);
  const eff = (
    <Field label="Efficiency" concept="efficiency" value={stage.efficiency} min={0.3} max={0.99} step={0.01} precision={2} unit="η" onChange={(v) => set({ efficiency: v })} />
  );

  return (
    <div className="space-y-3 border-t border-[var(--border)] pt-3">
      {(stage.type === "spur" || stage.type === "belt") && (
        <>
          <Field label={stage.type === "belt" ? "Drive pulley teeth" : "Driving teeth"} concept="gear-ratio" value={stage.teethIn ?? 15} min={6} max={80} step={1} precision={0} unit="T" onChange={(v) => set({ teethIn: v })} />
          <Field label={stage.type === "belt" ? "Driven pulley teeth" : "Driven teeth"} value={stage.teethOut ?? 45} min={6} max={200} step={1} precision={0} unit="T" onChange={(v) => set({ teethOut: v })} />
          {eff}
        </>
      )}

      {stage.type === "planetary" && (
        <>
          <Field label="Sun teeth" concept="gear-ratio" value={stage.sunTeeth ?? 12} min={8} max={40} step={1} precision={0} unit="T" onChange={(v) => set({ sunTeeth: v })} />
          <Field label="Planet teeth" value={stage.planetTeeth ?? 18} min={8} max={60} step={1} precision={0} unit="T" onChange={(v) => set({ planetTeeth: v })} />
          <Field label="Planet count" value={stage.planetCount ?? 3} min={3} max={5} step={1} precision={0} unit="×" onChange={(v) => set({ planetCount: v })} />
          <p className="text-[10px] text-[var(--muted)]">
            Derived ring gear: <span className="font-mono text-[var(--text)]">{planetaryRingTeeth(stage)} teeth</span>
          </p>
          {eff}
        </>
      )}

      {stage.type === "worm" && (
        <>
          <Field label="Worm starts" concept="worm" value={stage.wormStarts ?? 1} min={1} max={4} step={1} precision={0} unit="×" onChange={(v) => set({ wormStarts: v })} />
          <Field label="Wheel teeth" value={stage.teethOut ?? 40} min={20} max={120} step={1} precision={0} unit="T" onChange={(v) => set({ teethOut: v })} />
          {eff}
        </>
      )}

      {(stage.type === "harmonic" || stage.type === "cycloidal") && (
        <>
          <Field
            label="Reduction ratio"
            concept={stage.type === "harmonic" ? "harmonic-drive" : "gear-ratio"}
            value={stage.ratio}
            min={stage.type === "harmonic" ? 30 : 10}
            max={stage.type === "harmonic" ? 320 : 120}
            step={1}
            precision={0}
            unit=":1"
            onChange={(v) => set({ ratio: v })}
          />
          {eff}
        </>
      )}

      {(stage.type === "leadscrew" || stage.type === "ballscrew") && (
        <>
          <Field label="Lead (travel/turn)" concept="leadscrew" value={stage.lead ?? 2} min={0.5} max={25} step={0.5} precision={1} unit="mm" onChange={(v) => set({ lead: v })} />
          {eff}
        </>
      )}

      <div className="flex flex-wrap gap-1.5">
        <Badge>{info.linear ? "Linear output" : `Ratio ${ratioLabel(stageRatio(stage))}`}</Badge>
        <Badge>~{info.typicalBacklash} arcmin backlash</Badge>
        <Badge>{info.backdrivable ? "Backdrivable" : "Self-locking / stiff"}</Badge>
      </div>

      <p className="text-[11px] leading-snug text-[var(--muted)]">{info.description}</p>
    </div>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="border border-[var(--border)] bg-[var(--surface-2)] px-2 py-0.5 text-[10px] text-[var(--muted)]">
      {children}
    </span>
  );
}
