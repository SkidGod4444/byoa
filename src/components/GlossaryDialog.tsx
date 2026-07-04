"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowUpRight, X } from "lucide-react";
import { CONCEPTS, CONCEPTS_BY_ID, type Concept } from "@/lib/concepts";
import { useUiStore } from "@/store/uiStore";

const CATEGORIES: { key: Concept["category"] | "all"; label: string }[] = [
  { key: "all", label: "All" },
  { key: "motor", label: "Motors" },
  { key: "gearing", label: "Gearing" },
  { key: "specs", label: "Performance" },
  { key: "control", label: "Control" },
];

export default function GlossaryDialog() {
  const open = useUiStore((s) => s.glossaryOpen);
  const focusId = useUiStore((s) => s.focusConceptId);
  const close = useUiStore((s) => s.closeGlossary);
  const openGlossary = useUiStore((s) => s.openGlossary);
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState<Concept["category"] | "all">("all");
  const focusRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, close]);

  // Adjust filters during render when a new concept is focused (avoids a
  // cascading setState-in-effect; see react.dev "you might not need an effect").
  const [prevFocus, setPrevFocus] = useState<string | null>(null);
  if (open && focusId && focusId !== prevFocus) {
    setPrevFocus(focusId);
    setQuery("");
    setCat("all");
  }

  useEffect(() => {
    if (open && focusId) {
      const t = setTimeout(() => focusRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 60);
      return () => clearTimeout(t);
    }
  }, [open, focusId]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return CONCEPTS.filter((c) => (cat === "all" || c.category === cat) && (!q || c.term.toLowerCase().includes(q) || c.body.toLowerCase().includes(q)));
  }, [query, cat]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 sm:p-8" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={close} />
      <div className="relative flex max-h-[86vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-2xl animate-fade-up">
        {/* header */}
        <div className="flex items-center gap-3 border-b border-[var(--border)] p-4">
          <div>
            <h2 className="text-[15px] font-bold text-[var(--text)]">Actuator Concepts</h2>
            <p className="text-[11px] text-[var(--muted)]">
              Quick reference — click any card for the full plain-words guide with videos & articles.
            </p>
          </div>
          <button
            onClick={() => {
              close();
              router.push("/learn");
            }}
            className="ml-auto flex items-center gap-1.5 border border-[var(--border)] bg-[var(--surface-2)] px-3 py-1.5 text-[12px] font-medium text-[var(--text)] transition hover:border-[var(--accent)]"
          >
            All guides
            <ArrowUpRight size={12} />
          </button>
          <button onClick={close} className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-[var(--border)] text-[var(--muted)] hover:border-[var(--bad)] hover:text-[var(--bad)]">
            <X size={14} strokeWidth={1.8} />
          </button>
        </div>

        {/* controls */}
        <div className="flex flex-col gap-2 border-b border-[var(--border)] p-3 sm:flex-row sm:items-center">
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search concepts…"
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-[13px] text-[var(--text)] placeholder:text-[var(--muted)] focus:border-[var(--accent)] focus:outline-none"
          />
          <div className="flex shrink-0 gap-1">
            {CATEGORIES.map((c) => (
              <button
                key={c.key}
                onClick={() => setCat(c.key)}
                className={`rounded-lg px-2.5 py-1.5 text-[11px] font-medium transition ${cat === c.key ? "bg-[var(--surface-3)] text-[var(--text)]" : "text-[var(--muted)] hover:text-[var(--text)]"}`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        {/* list */}
        <div className="grid gap-2.5 overflow-y-auto p-4 sm:grid-cols-2">
          {filtered.map((c) => {
            const isFocus = c.id === focusId;
            return (
              <div
                key={c.id}
                ref={isFocus ? focusRef : undefined}
                role="button"
                tabIndex={0}
                onClick={() => {
                  close();
                  router.push(`/learn/${c.id}`);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    close();
                    router.push(`/learn/${c.id}`);
                  }
                }}
                className={`group cursor-pointer rounded-xl border p-3 transition hover:border-[var(--accent)] ${isFocus ? "border-[var(--accent)] bg-[var(--accent-soft)]" : "border-[var(--border)] bg-[var(--surface-2)]"}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[13px] font-semibold text-[var(--text)] transition group-hover:text-[var(--accent)]">{c.term}</span>
                  <span className="flex items-center gap-1 text-[9px] uppercase tracking-wide text-[var(--muted)] opacity-0 transition group-hover:opacity-100">
                    Full guide <ArrowUpRight size={10} />
                  </span>
                </div>
                <div className="mt-0.5 text-[11px] font-medium text-[var(--accent)]">{c.short}</div>
                <p className="mt-1.5 text-[11.5px] leading-relaxed text-[var(--muted)]">{c.body}</p>
                {c.see && c.see.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {c.see.filter((id) => CONCEPTS_BY_ID[id]).map((id) => (
                      <button
                        key={id}
                        onClick={(e) => {
                          e.stopPropagation();
                          openGlossary(id);
                        }}
                        className="bg-[var(--surface-3)] px-1.5 py-0.5 text-[9px] text-[var(--muted)] transition hover:text-[var(--accent)]"
                      >
                        {CONCEPTS_BY_ID[id].term}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
          {filtered.length === 0 && <p className="col-span-full py-8 text-center text-[13px] text-[var(--muted)]">No concepts match “{query}”.</p>}
        </div>
      </div>
    </div>
  );
}
