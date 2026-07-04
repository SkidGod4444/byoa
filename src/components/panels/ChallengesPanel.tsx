"use client";

import { useEffect } from "react";
import { Check, ChevronRight, Lightbulb, Trophy, X } from "lucide-react";
import { CHALLENGES, CHALLENGES_BY_ID } from "@/lib/challenges";
import { useChallengeStore } from "@/store/challengeStore";
import { useDesignStore, useDrive } from "@/store/designStore";
import { useUiStore } from "@/store/uiStore";
import { useState } from "react";

/**
 * The active challenge docks above the build panels and grades the design
 * LIVE: every slider move re-checks the requirements, so learning happens by
 * building, failing, and adjusting — not by reading.
 */
export function ActiveChallengeCard() {
  const activeId = useChallengeStore((s) => s.activeId);
  const done = useChallengeStore((s) => s.done);
  const abandon = useChallengeStore((s) => s.abandon);
  const complete = useChallengeStore((s) => s.complete);
  const design = useDesignStore((s) => s.design);
  const drive = useDrive();
  const [showHint, setShowHint] = useState(false);

  const challenge = activeId ? CHALLENGES_BY_ID[activeId] : null;
  const results = challenge ? challenge.requirements.map((r) => ({ r, ok: r.ok(design, drive), current: r.current(design, drive) })) : [];
  const passed = challenge != null && results.every((x) => x.ok);

  // record completion once every requirement turns green
  useEffect(() => {
    if (passed && challenge) complete(challenge.id);
  }, [passed, challenge, complete]);

  if (!challenge) return null;
  const nextChallenge = CHALLENGES.find((c) => !done.includes(c.id) && c.id !== challenge.id);

  return (
    <div className={`panel border-l-2 p-3.5 ${passed ? "border-l-[var(--good)]" : "border-l-[var(--accent)]"}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <Trophy size={14} className={passed ? "text-[var(--good)]" : "text-[var(--accent)]"} />
          <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">Challenge</span>
        </div>
        <button
          onClick={abandon}
          aria-label="Close challenge"
          className="grid h-6 w-6 place-items-center border border-[var(--border)] text-[var(--muted)] transition hover:border-[var(--bad)] hover:text-[var(--bad)]"
        >
          <X size={12} />
        </button>
      </div>

      <h3 className="mt-1.5 text-[14px] font-bold text-[var(--text)]">{challenge.title}</h3>
      <p className="mt-1 text-[12px] leading-snug text-[var(--muted)]">{challenge.brief}</p>

      {/* live requirement grading */}
      <div className="mt-2.5 space-y-1.5">
        {results.map(({ r, ok, current }) => (
          <div key={r.label} className={`flex items-center justify-between gap-2 border px-2.5 py-1.5 ${ok ? "border-[var(--good)]/40 bg-[var(--good)]/8" : "border-[var(--border)] bg-[var(--surface-2)]"}`}>
            <span className="flex min-w-0 items-center gap-1.5 text-[11px] text-[var(--text)]">
              <span className={`grid h-3.5 w-3.5 shrink-0 place-items-center ${ok ? "text-[var(--good)]" : "text-[var(--muted)]"}`}>
                {ok ? <Check size={11} strokeWidth={2.6} /> : <X size={11} strokeWidth={2} />}
              </span>
              <span className="truncate">{r.label}</span>
            </span>
            <span className={`shrink-0 font-mono text-[11px] ${ok ? "text-[var(--good)]" : "text-[var(--muted)]"}`}>{current}</span>
          </div>
        ))}
      </div>

      {passed ? (
        <div className="mt-2.5 border border-[var(--good)]/40 bg-[var(--good)]/8 p-2.5 animate-fade-up">
          <div className="text-[11px] font-bold uppercase tracking-wide text-[var(--good)]">Solved — what you just learned</div>
          <p className="mt-1 text-[11.5px] leading-snug text-[var(--text)]">{challenge.lesson}</p>
          <div className="mt-2 flex gap-1.5">
            {nextChallenge ? (
              <button
                onClick={() => {
                  setShowHint(false);
                  useChallengeStore.getState().start(nextChallenge.id);
                }}
                className="flex items-center gap-1 bg-[var(--good)] px-2.5 py-1.5 text-[11px] font-semibold text-[var(--bg)] transition hover:brightness-110"
              >
                Next: {nextChallenge.title}
                <ChevronRight size={12} />
              </button>
            ) : (
              <span className="text-[11px] font-semibold text-[var(--good)]">All challenges cleared — you&apos;re dangerous now.</span>
            )}
          </div>
        </div>
      ) : (
        <div className="mt-2.5">
          <button
            onClick={() => setShowHint((v) => !v)}
            className="flex items-center gap-1.5 text-[11px] font-medium text-[var(--warn)] transition hover:brightness-110"
          >
            <Lightbulb size={12} />
            {showHint ? "Hide hint" : "Need a hint?"}
          </button>
          {showHint && <p className="mt-1.5 border border-[var(--warn)]/30 bg-[var(--warn)]/8 p-2 text-[11px] leading-snug text-[var(--text)] animate-fade-up">{challenge.hint}</p>}
        </div>
      )}
    </div>
  );
}

/** Mission list — pick a challenge, see progress. */
export function ChallengePicker() {
  const open = useChallengeStore((s) => s.pickerOpen);
  const setOpen = useChallengeStore((s) => s.setPickerOpen);
  const start = useChallengeStore((s) => s.start);
  const done = useChallengeStore((s) => s.done);
  const hydrate = useChallengeStore((s) => s.hydrate);

  useEffect(() => hydrate(), [hydrate]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, setOpen]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 sm:p-10" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setOpen(false)} />
      <div className="relative flex max-h-[84vh] w-full max-w-2xl flex-col overflow-hidden border border-[var(--border)] bg-[var(--surface)] shadow-2xl animate-fade-up">
        <div className="h-0.5 w-full bg-[var(--accent)]" />
        <div className="flex items-center gap-3 border-b border-[var(--border)] p-4">
          <Trophy size={16} className="text-[var(--accent)]" />
          <div>
            <h2 className="text-[15px] font-bold text-[var(--text)]">Design challenges</h2>
            <p className="text-[11px] text-[var(--muted)]">
              Real engineering briefs, graded live while you build — {done.length}/{CHALLENGES.length} solved.
            </p>
          </div>
          <button onClick={() => setOpen(false)} className="ml-auto grid h-8 w-8 place-items-center border border-[var(--border)] text-[var(--muted)] hover:border-[var(--bad)] hover:text-[var(--bad)]">
            <X size={14} />
          </button>
        </div>
        <div className="grid gap-2 overflow-y-auto p-4 sm:grid-cols-2">
          {CHALLENGES.map((c, i) => {
            const solved = done.includes(c.id);
            return (
              <button
                key={c.id}
                onClick={() => {
                  start(c.id);
                  useUiStore.getState().setLeftOpen(true);
                }}
                className={`group border p-3 text-left transition hover:border-[var(--accent)] ${solved ? "border-[var(--good)]/40 bg-[var(--good)]/5" : "border-[var(--border)] bg-[var(--surface-2)]"}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[12.5px] font-semibold text-[var(--text)] transition group-hover:text-[var(--accent)]">
                    {i + 1}. {c.title}
                  </span>
                  {solved && <Check size={13} className="shrink-0 text-[var(--good)]" strokeWidth={2.6} />}
                </div>
                <p className="mt-1 line-clamp-2 text-[11px] leading-snug text-[var(--muted)]">{c.brief}</p>
                <span className="mt-1.5 inline-block border border-[var(--border)] px-1.5 py-0.5 text-[9px] uppercase tracking-wide text-[var(--muted)]">
                  {c.teaches}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
