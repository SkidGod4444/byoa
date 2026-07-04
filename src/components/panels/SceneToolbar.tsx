"use client";

import { Pause, Play, ScanEye } from "lucide-react";
import { MOTOR_TYPES, STAGE_TYPES } from "@/lib/catalog";
import { ratioLabel, stageRatio } from "@/lib/physics";
import { partPositions } from "@/components/three/Assemblies";
import { useDesignStore } from "@/store/designStore";
import { useSceneStore } from "@/store/sceneStore";

function Chip({
  label,
  sub,
  color,
  active,
  onClick,
}: {
  label: string;
  sub?: string;
  color: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex shrink-0 items-center gap-1.5 border px-2.5 py-1 text-[11px] font-medium transition ${
        active
          ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--text)]"
          : "border-[var(--border)] bg-[var(--surface)]/80 text-[var(--muted)] hover:border-[var(--border-strong)] hover:text-[var(--text)]"
      }`}
    >
      <span className="h-2 w-2 rounded-full" style={{ background: color }} />
      {label}
      {sub && <span className="font-mono text-[9px] text-[var(--muted)]">{sub}</span>}
    </button>
  );
}

function Arrow() {
  return (
    <svg width="14" height="8" viewBox="0 0 14 8" className="shrink-0 text-[var(--muted)]" aria-hidden>
      <path d="M0 4 H10 M8 1 L12 4 L8 7" fill="none" stroke="currentColor" strokeWidth="1.2" strokeOpacity="0.6" />
    </svg>
  );
}

export default function SceneToolbar() {
  const design = useDesignStore((s) => s.design);
  const playing = useDesignStore((s) => s.playing);
  const setPlaying = useDesignStore((s) => s.setPlaying);
  const simSpeed = useDesignStore((s) => s.simSpeed);
  const setSimSpeed = useDesignStore((s) => s.setSimSpeed);
  const selected = useSceneStore((s) => s.selected);
  const select = useSceneStore((s) => s.select);
  const explode = useSceneStore((s) => s.explode);
  const setExplode = useSceneStore((s) => s.setExplode);
  const xray = useSceneStore((s) => s.xray);
  const setXray = useSceneStore((s) => s.setXray);
  const selectStage = useDesignStore((s) => s.selectStage);

  const chipSelect = (key: string) => {
    select({ key, pos: partPositions.get(key) ?? null });
    if (key.startsWith("stage-")) selectStage(key.slice(6));
  };

  const isLinear = design.stages.some((s) => STAGE_TYPES[s.type].linear);

  return (
    <div className="pointer-events-auto flex w-full flex-col gap-2">
      {/* chain chips */}
      <div data-tour="chips" className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
        <Chip
          label={MOTOR_TYPES[design.motor.type].label}
          color={MOTOR_TYPES[design.motor.type].color}
          active={selected?.key === "motor" || (selected?.key.startsWith("motor/") ?? false)}
          onClick={() => chipSelect("motor")}
        />
        {design.stages.map((st) => (
          <span key={st.id} className="flex items-center gap-1.5">
            <Arrow />
            <Chip
              label={STAGE_TYPES[st.type].label}
              sub={STAGE_TYPES[st.type].linear ? `${st.lead ?? 2}mm` : ratioLabel(stageRatio(st))}
              color={STAGE_TYPES[st.type].color}
              active={selected?.key.includes(`stage-${st.id}`) ?? false}
              onClick={() => chipSelect(`stage-${st.id}`)}
            />
          </span>
        ))}
        {!isLinear && (
          <span className="flex items-center gap-1.5">
            <Arrow />
            <Chip label="Output" color="#d9a13c" active={selected?.key === "output"} onClick={() => chipSelect("output")} />
          </span>
        )}
      </div>

      {/* controls */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-[var(--border)] bg-[var(--surface)]/85 px-3 py-2 backdrop-blur-md">
        <button
          onClick={() => setPlaying(!playing)}
          aria-label={playing ? "Pause" : "Play"}
          className="grid h-7 w-7 shrink-0 place-items-center rounded-lg border border-[var(--border)] bg-[var(--surface-2)] text-[var(--text)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
        >
          {playing ? <Pause size={12} strokeWidth={2} /> : <Play size={12} strokeWidth={2} />}
        </button>

        <label className="flex items-center gap-2 text-[11px] text-[var(--muted)]">
          Speed
          <input type="range" min={0.1} max={2.5} step={0.1} value={simSpeed} onChange={(e) => setSimSpeed(parseFloat(e.target.value))} className="w-20" />
          <span className="w-7 font-mono text-[10px]">{simSpeed.toFixed(1)}×</span>
        </label>

        <label data-tour="explode" className="flex items-center gap-2 text-[11px] text-[var(--muted)]">
          <span className="font-medium text-[var(--accent)]">Explode</span>
          <input type="range" min={0} max={1} step={0.01} value={explode} onChange={(e) => setExplode(parseFloat(e.target.value))} className="w-28" />
        </label>

        <button
          data-tour="xray"
          onClick={() => setXray(!xray)}
          className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-medium transition ${
            xray ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]" : "border-[var(--border)] bg-[var(--surface-2)] text-[var(--muted)] hover:text-[var(--text)]"
          }`}
        >
          <ScanEye size={13} strokeWidth={1.8} />
          X-ray
        </button>

        <span className="ml-auto hidden text-[10px] text-[var(--muted)] md:block">Drag to orbit · scroll to zoom · click a part</span>
      </div>
    </div>
  );
}
