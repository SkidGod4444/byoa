"use client";

import { useState, type ReactNode } from "react";
import { CONCEPTS_BY_ID } from "@/lib/concepts";
import { useUiStore } from "@/store/uiStore";

// --- inline concept tooltip --------------------------------------------------
export function ConceptTip({ id }: { id: string }) {
  const c = CONCEPTS_BY_ID[id];
  const openGlossary = useUiStore((s) => s.openGlossary);
  if (!c) return null;
  return (
    <span className="group/tip relative ml-1 inline-flex align-middle">
      <button
        type="button"
        aria-label={`About ${c.term}`}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          openGlossary(id);
        }}
        className="grid h-3.5 w-3.5 place-items-center border border-[var(--border-strong)] text-[9px] font-bold leading-none text-[var(--muted)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
      >
        ?
      </button>
      <span className="pointer-events-none absolute bottom-full left-1/2 z-40 mb-1.5 hidden w-60 -translate-x-1/2 rounded-lg border border-[var(--border)] bg-[var(--surface-3)] p-2.5 text-left text-[11px] font-normal leading-snug text-[var(--muted)] shadow-xl group-hover/tip:block group-focus-within/tip:block">
        <b className="text-[var(--text)]">{c.term}</b> — {c.short}
      </span>
    </span>
  );
}

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

// --- slider + editable number ------------------------------------------------
export function Field({
  label,
  value,
  min,
  max,
  step = 1,
  unit,
  concept,
  precision = 2,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  concept?: string;
  precision?: number;
  onChange: (v: number) => void;
}) {
  const [buf, setBuf] = useState<string | null>(null);
  const round = (n: number) => {
    const p = Math.pow(10, precision);
    return Math.round(n * p) / p;
  };
  const shown = buf ?? String(round(value));

  return (
    <label className="block select-none">
      <div className="flex items-baseline justify-between gap-2">
        <span className="flex items-center text-[11px] text-[var(--muted)]">
          {label}
          {concept && <ConceptTip id={concept} />}
        </span>
        <span className="flex items-baseline gap-1">
          <input
            inputMode="decimal"
            value={shown}
            onChange={(e) => {
              setBuf(e.target.value);
              const n = parseFloat(e.target.value);
              if (!isNaN(n)) onChange(clamp(n, min, max));
            }}
            onBlur={() => setBuf(null)}
            className="w-14 rounded border border-transparent bg-transparent px-1 text-right font-mono text-[12px] text-[var(--text)] hover:border-[var(--border)] focus:border-[var(--accent)] focus:outline-none"
          />
          {unit && <span className="w-8 shrink-0 text-[10px] text-[var(--muted)]">{unit}</span>}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => {
          setBuf(null);
          onChange(clamp(parseFloat(e.target.value), min, max));
        }}
        className="mt-1.5 w-full"
      />
    </label>
  );
}

// --- segmented control -------------------------------------------------------
export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string; color?: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="grid grid-flow-col gap-1 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-1">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            onClick={() => onChange(o.value)}
            className={`flex items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-[11px] font-medium transition ${
              active ? "bg-[var(--surface-3)] text-[var(--text)] shadow" : "text-[var(--muted)] hover:text-[var(--text)]"
            }`}
          >
            {o.color && <span className="h-2 w-2 rounded-full" style={{ background: o.color }} />}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

// --- big stat ----------------------------------------------------------------
export function Stat({
  label,
  value,
  unit,
  concept,
  tone = "default",
  big = false,
}: {
  label: string;
  value: ReactNode;
  unit?: string;
  concept?: string;
  tone?: "default" | "accent" | "good" | "warn" | "bad";
  big?: boolean;
}) {
  const color =
    tone === "accent"
      ? "text-[var(--accent)]"
      : tone === "good"
        ? "text-[var(--good)]"
        : tone === "warn"
          ? "text-[var(--warn)]"
          : tone === "bad"
            ? "text-[var(--bad)]"
            : "text-[var(--text)]";
  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2">
      <div className="flex items-center text-[10px] uppercase tracking-wide text-[var(--muted)]">
        {label}
        {concept && <ConceptTip id={concept} />}
      </div>
      <div className={`mt-0.5 font-mono font-semibold ${big ? "text-2xl" : "text-base"} ${color}`}>
        {value}
        {unit && <span className="ml-1 text-[11px] font-normal text-[var(--muted)]">{unit}</span>}
      </div>
    </div>
  );
}

export function SectionTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="mb-2.5 flex items-center justify-between">
      <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">{children}</h3>
      {right}
    </div>
  );
}
