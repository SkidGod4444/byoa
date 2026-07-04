"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, LayoutGrid } from "lucide-react";
import { PRESETS } from "@/lib/presets";
import { useDesignStore } from "@/store/designStore";

export default function PresetMenu() {
  const loadDesign = useDesignStore((s) => s.loadDesign);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        data-tour="examples"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-1.5 text-[12px] font-medium text-[var(--text)] transition hover:border-[var(--accent)]"
      >
        <LayoutGrid size={14} strokeWidth={1.8} />
        Examples
        <ChevronDown size={12} strokeWidth={1.8} className={`transition ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div
          data-tour="examples-menu"
          className="absolute right-0 z-50 mt-1.5 w-80 origin-top-right animate-fade-up rounded-xl border border-[var(--border)] bg-[var(--surface)] p-1.5 shadow-2xl"
        >
          <div className="px-2 py-1.5 text-[10px] uppercase tracking-wide text-[var(--muted)]">Real-world actuators</div>
          {PRESETS.map((p) => (
            <button
              key={p.design.id}
              onClick={() => {
                loadDesign(p.design);
                setOpen(false);
              }}
              className="group block w-full rounded-lg px-2.5 py-2 text-left transition hover:bg-[var(--surface-2)]"
            >
              <div className="text-[12px] font-semibold text-[var(--text)] group-hover:text-[var(--accent)]">{p.design.name}</div>
              <div className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-[var(--muted)]">{p.story}</div>
              <div className="mt-1 flex flex-wrap gap-1">
                {p.tags.map((t) => (
                  <span key={t} className="bg-[var(--surface-3)] px-1.5 py-0.5 text-[9px] text-[var(--muted)]">{t}</span>
                ))}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
