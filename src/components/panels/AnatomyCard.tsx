"use client";

import { MOTOR_TYPES, STAGE_TYPES } from "@/lib/catalog";
import { partInfoFor } from "@/lib/anatomy";
import { CONCEPTS_BY_ID } from "@/lib/concepts";
import { useDesignStore } from "@/store/designStore";
import { useSceneStore } from "@/store/sceneStore";
import { useUiStore } from "@/store/uiStore";
import AskAI from "./AskAI";

function ConceptChips({ ids }: { ids: string[] }) {
  const openGlossary = useUiStore((s) => s.openGlossary);
  const valid = ids.filter((id) => CONCEPTS_BY_ID[id]);
  if (!valid.length) return null;
  return (
    <div className="mt-2.5 flex flex-wrap gap-1.5">
      {valid.map((id) => (
        <button
          key={id}
          onClick={() => openGlossary(id)}
          className="border border-[var(--border)] bg-[var(--surface-2)] px-2 py-0.5 text-[10px] text-[var(--muted)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
        >
          {CONCEPTS_BY_ID[id].term}
        </button>
      ))}
    </div>
  );
}

function ProsCons({ pros, cons }: { pros: string[]; cons: string[] }) {
  return (
    <div className="mt-3 grid grid-cols-2 gap-3">
      <div>
        <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--good)]">Strengths</div>
        <ul className="space-y-1">
          {pros.map((p) => (
            <li key={p} className="flex gap-1.5 text-[11px] leading-snug text-[var(--muted)]">
              <span className="text-[var(--good)]">+</span>
              {p}
            </li>
          ))}
        </ul>
      </div>
      <div>
        <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--bad)]">Trade-offs</div>
        <ul className="space-y-1">
          {cons.map((c) => (
            <li key={c} className="flex gap-1.5 text-[11px] leading-snug text-[var(--muted)]">
              <span className="text-[var(--bad)]">−</span>
              {c}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function Watch({ text }: { text: string }) {
  return (
    <div className="mt-3 flex gap-2 rounded-lg border border-[var(--accent)]/25 bg-[var(--accent-soft)] px-3 py-2">
      <svg width="14" height="14" viewBox="0 0 14 14" className="mt-0.5 shrink-0 text-[var(--accent)]">
        <circle cx="7" cy="7" r="2.4" fill="currentColor" />
        <path d="M1 7 C3 3.4 5 2 7 2 C9 2 11 3.4 13 7 C11 10.6 9 12 7 12 C5 12 3 10.6 1 7 Z" fill="none" stroke="currentColor" strokeWidth="1.2" />
      </svg>
      <p className="text-[11px] leading-snug text-[var(--text)]">
        <span className="font-semibold text-[var(--accent)]">Watch: </span>
        {text}
      </p>
    </div>
  );
}

export default function AnatomyCard() {
  const selected = useSceneStore((s) => s.selected);
  const design = useDesignStore((s) => s.design);

  // Nothing selected → invite exploration.
  if (!selected) {
    return (
      <div className="panel p-3.5">
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">Anatomy</h3>
        <div className="mt-2 flex items-start gap-2.5">
          <svg width="26" height="26" viewBox="0 0 24 24" className="mt-0.5 shrink-0 text-[var(--accent)]">
            <path d="M6 3 L6 15 L9.5 12.4 L11.6 17.6 L13.9 16.7 L11.8 11.6 L16 11 Z" fill="currentColor" />
          </svg>
          <p className="text-[12px] leading-relaxed text-[var(--muted)]">
            <b className="text-[var(--text)]">Click any part of the machine</b> to see what it is and what it does.
            Drag to orbit, scroll to zoom — and try the <b className="text-[var(--text)]">Explode</b> slider to open it
            up like an anatomy diagram.
          </p>
        </div>
      </div>
    );
  }

  const key = selected.key;

  // Whole-motor or motor-part selections.
  if (key === "motor") {
    const info = MOTOR_TYPES[design.motor.type];
    return (
      <div className="panel animate-fade-up p-3.5">
        <div className="flex items-center justify-between">
          <h3 className="text-[13px] font-bold text-[var(--text)]">{info.label} Motor</h3>
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: info.color }} />
        </div>
        <p className="mt-0.5 text-[11px] font-medium text-[var(--accent)]">{info.tagline}</p>
        <p className="mt-2 text-[12px] leading-relaxed text-[var(--muted)]">{info.description}</p>
        <ProsCons pros={info.pros} cons={info.cons} />
        <ConceptChips ids={["torque-speed-curve", "kv-kt", "back-emf", "current-limit"]} />
        <AskAI partKey="motor" />
      </div>
    );
  }

  // Whole-stage selection (from the chain chips).
  if (key.startsWith("stage-") && !key.includes("/")) {
    const st = design.stages.find((s) => s.id === key.slice(6));
    if (st) {
      const info = STAGE_TYPES[st.type];
      return (
        <div className="panel animate-fade-up p-3.5">
          <div className="flex items-center justify-between">
            <h3 className="text-[13px] font-bold text-[var(--text)]">{info.label}</h3>
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: info.color }} />
          </div>
          <p className="mt-0.5 text-[11px] font-medium text-[var(--accent)]">{info.tagline}</p>
          <p className="mt-2 text-[12px] leading-relaxed text-[var(--muted)]">{info.description}</p>
          <ProsCons pros={info.pros} cons={info.cons} />
          <div className="mt-3 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-[11px] text-[var(--muted)]">
            <span className="text-[var(--text)]">Found in:</span> {info.usedIn}
          </div>
          <AskAI partKey={key} />
        </div>
      );
    }
  }

  // Individual part.
  const info = partInfoFor(key);
  if (!info) return null;
  return (
    <div className="panel animate-fade-up p-3.5">
      <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--accent)]">Part anatomy</div>
      <h3 className="mt-1 text-[14px] font-bold text-[var(--text)]">{info.name}</h3>
      <p className="mt-0.5 text-[11px] font-medium text-[var(--muted)]">{info.role}</p>
      <p className="mt-2 text-[12px] leading-relaxed text-[var(--muted)]">{info.story}</p>
      {info.watch && <Watch text={info.watch} />}
      {info.concepts && <ConceptChips ids={info.concepts} />}
      <AskAI partKey={key} />
    </div>
  );
}
