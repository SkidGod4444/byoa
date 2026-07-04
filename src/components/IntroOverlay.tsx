"use client";

import { useEffect } from "react";
import { GraduationCap, Play } from "lucide-react";
import { useUiStore } from "@/store/uiStore";
import { useTourStore } from "@/store/tourStore";
import { useAcademyStore } from "@/store/academyStore";

const STEPS = [
  {
    n: "1",
    color: "var(--accent)",
    title: "Click any part — learn its anatomy",
    body: "The 3D machine is alive: click the rotor, a planet gear, the flexspline… and a card explains what it is, what it does, and what to watch.",
  },
  {
    n: "2",
    color: "#a78bfa",
    title: "Pull it apart",
    body: "Drag to orbit, scroll to zoom. Slide Explode to open the actuator up like an anatomy diagram, and X-ray the housings to see inside.",
  },
  {
    n: "3",
    color: "#34d399",
    title: "Build your own",
    body: "Swap the motor, stack gear stages — planetary, harmonic, worm, screws — and watch strength, speed, and feel change in plain terms.",
  },
];

export default function IntroOverlay() {
  const open = useUiStore((s) => s.introOpen);
  const setOpen = useUiStore((s) => s.setIntroOpen);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, setOpen]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/65 backdrop-blur-sm" onClick={() => setOpen(false)} />
      <div className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-2xl animate-fade-up">
        <div className="relative overflow-hidden border-b border-[var(--border)] px-6 py-6">
          <div className="pointer-events-none absolute -right-8 -top-10 opacity-[0.12]">
            <svg width="180" height="180" viewBox="0 0 24 24" className="text-[var(--accent)]">
              <g fill="none" stroke="currentColor" strokeWidth="1">
                <circle cx="12" cy="12" r="3.2" />
                {Array.from({ length: 8 }, (_, k) => {
                  const a = (k * 45 * Math.PI) / 180;
                  return <line key={k} x1={12 + 5 * Math.cos(a)} y1={12 + 5 * Math.sin(a)} x2={12 + 8 * Math.cos(a)} y2={12 + 8 * Math.sin(a)} />;
                })}
              </g>
            </svg>
          </div>
          <h2 className="text-xl font-bold tracking-tight text-[var(--text)]">Build Your Own Actuators</h2>
          <p className="mt-1.5 max-w-md text-[13px] leading-relaxed text-[var(--muted)]">
            An actuator is a robot&apos;s muscle: a <b className="text-[var(--text)]">motor</b> for power and a{" "}
            <b className="text-[var(--text)]">transmission</b> to trade its fast, weak spin for slow, strong motion. Assemble one
            here and learn exactly how each choice shapes what it can do.
          </p>
        </div>

        <div className="space-y-3 p-5">
          {STEPS.map((s) => (
            <div key={s.n} className="flex gap-3">
              <span className="grid h-7 w-7 shrink-0 place-items-center text-[12px] font-bold text-[var(--bg)]" style={{ background: s.color }}>
                {s.n}
              </span>
              <div>
                <div className="text-[13px] font-semibold text-[var(--text)]">{s.title}</div>
                <div className="text-[12px] leading-snug text-[var(--muted)]">{s.body}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-[var(--border)] p-4">
          <button
            onClick={() => setOpen(false)}
            className="border border-[var(--border)] px-3.5 py-2 text-[12px] font-medium text-[var(--muted)] transition hover:text-[var(--text)]"
          >
            Skip for now
          </button>
          <button
            onClick={() => {
              setOpen(false);
              useAcademyStore.getState().openAcademy();
            }}
            className="hidden items-center gap-2 border border-[var(--accent)]/50 bg-[var(--accent-soft)] px-4 py-2 text-[13px] font-semibold text-[var(--accent)] transition hover:bg-[var(--accent)]/20 sm:flex"
          >
            <GraduationCap size={14} strokeWidth={2} />
            Start the course
          </button>
          <button
            onClick={() => {
              setOpen(false);
              useTourStore.getState().start();
            }}
            className="flex items-center gap-2 bg-[var(--accent)] px-4 py-2 text-[13px] font-semibold text-[var(--bg)] transition hover:brightness-110"
          >
            <Play size={13} strokeWidth={2.2} />
            60-second tour
          </button>
        </div>
      </div>
    </div>
  );
}
