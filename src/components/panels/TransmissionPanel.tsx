"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Plus, X } from "lucide-react";
import { STAGE_ORDER, STAGE_TYPES } from "@/lib/catalog";
import { ratioLabel, stageRatio } from "@/lib/physics";
import { useDesignStore } from "@/store/designStore";
import type { StageType } from "@/lib/types";
import { SectionTitle } from "@/components/ui/controls";
import StageEditor from "./StageEditor";

function IconBtn({ onClick, disabled, label, children }: { onClick: () => void; disabled?: boolean; label: string; children: React.ReactNode }) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      disabled={disabled}
      aria-label={label}
      title={label}
      className="grid h-6 w-6 place-items-center rounded-md border border-[var(--border)] text-[var(--muted)] transition enabled:hover:border-[var(--accent)] enabled:hover:text-[var(--accent)] disabled:opacity-30"
    >
      {children}
    </button>
  );
}

export default function TransmissionPanel() {
  const stages = useDesignStore((s) => s.design.stages);
  const selectedStageId = useDesignStore((s) => s.selectedStageId);
  const selectStage = useDesignStore((s) => s.selectStage);
  const addStage = useDesignStore((s) => s.addStage);
  const removeStage = useDesignStore((s) => s.removeStage);
  const moveStage = useDesignStore((s) => s.moveStage);
  const [showPalette, setShowPalette] = useState(false);

  return (
    <div className="panel p-3.5">
      <SectionTitle right={<span className="font-mono text-[11px] text-[var(--muted)]">{stages.length} stage{stages.length === 1 ? "" : "s"}</span>}>
        2 · Transmission
      </SectionTitle>
      <p className="mb-2.5 text-[11px] leading-snug text-[var(--muted)]">
        The gears. Each stage trades the motor&apos;s speed for strength — stack as many as you need.
      </p>

      {stages.length === 0 && (
        <p className="rounded-lg border border-dashed border-[var(--border)] p-3 text-center text-[11px] text-[var(--muted)]">
          Direct drive — no gearing. The output is the raw motor. Add a stage below to trade speed for torque.
        </p>
      )}

      <div className="space-y-2">
        {stages.map((st, i) => {
          const info = STAGE_TYPES[st.type];
          const open = st.id === selectedStageId;
          return (
            <div key={st.id} className={`overflow-hidden rounded-lg border transition ${open ? "border-[var(--accent)]" : "border-[var(--border)]"}`}>
              <div
                onClick={() => selectStage(open ? null : st.id)}
                className="flex cursor-pointer items-center gap-2 bg-[var(--surface-2)] px-2.5 py-2"
              >
                <span className="grid h-5 w-5 shrink-0 place-items-center text-[10px] font-bold text-[var(--bg)]" style={{ background: info.color }}>
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[12px] font-medium text-[var(--text)]">{info.label}</div>
                  <div className="font-mono text-[10px] text-[var(--muted)]">{info.linear ? `${st.lead ?? 2} mm/rev` : ratioLabel(stageRatio(st))}</div>
                </div>
                <IconBtn label="Move up" onClick={() => moveStage(st.id, -1)} disabled={i === 0}>
                  <ChevronUp size={13} strokeWidth={1.8} />
                </IconBtn>
                <IconBtn label="Move down" onClick={() => moveStage(st.id, 1)} disabled={i === stages.length - 1}>
                  <ChevronDown size={13} strokeWidth={1.8} />
                </IconBtn>
                <IconBtn label="Remove stage" onClick={() => removeStage(st.id)}>
                  <X size={13} strokeWidth={1.8} />
                </IconBtn>
              </div>
              {open && (
                <div className="bg-[var(--surface)] px-2.5 pb-3 pt-1">
                  <StageEditor stage={st} />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* add */}
      <button
        data-tour="add-stage"
        onClick={() => setShowPalette((v) => !v)}
        className="mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-[var(--border-strong)] py-2 text-[12px] font-medium text-[var(--muted)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
      >
        <Plus size={14} strokeWidth={2} />
        Add a gear stage
      </button>

      {showPalette && (
        <div data-tour="add-stage-palette" className="mt-2 grid grid-cols-2 gap-1.5 animate-fade-up">
          {STAGE_ORDER.map((type) => {
            const info = STAGE_TYPES[type as StageType];
            return (
              <button
                key={type}
                onClick={() => {
                  addStage(type as StageType);
                  setShowPalette(false);
                }}
                className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-2 text-left transition hover:border-[var(--accent)]"
                title={info.tagline}
              >
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full" style={{ background: info.color }} />
                  <span className="truncate text-[11px] font-medium text-[var(--text)]">{info.label}</span>
                </div>
                <div className="mt-0.5 line-clamp-2 text-[10px] leading-tight text-[var(--muted)]">{info.tagline}</div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
