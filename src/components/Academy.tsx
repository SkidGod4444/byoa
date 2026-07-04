"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, GraduationCap, Lightbulb, Lock, Play, X } from "lucide-react";
import { ALL_LESSONS, MODULES, type LessonAction } from "@/lib/academy";
import { decodeDesign } from "@/lib/shareCodec";
import { useAcademyStore } from "@/store/academyStore";
import { useChallengeStore } from "@/store/challengeStore";
import { useDesignStore } from "@/store/designStore";
import { useLabStore } from "@/store/labStore";
import { useUiStore } from "@/store/uiStore";

function ActionIcon({ action }: { action: LessonAction }) {
  return action.kind === "challenge" ? <Play size={13} /> : <ArrowRight size={13} />;
}

export default function Academy() {
  const open = useAcademyStore((s) => s.open);
  const activeId = useAcademyStore((s) => s.activeLessonId);
  const completed = useAcademyStore((s) => s.completed);
  const setActive = useAcademyStore((s) => s.setActive);
  const complete = useAcademyStore((s) => s.complete);
  const close = useAcademyStore((s) => s.close);
  const hydrate = useAcademyStore((s) => s.hydrate);
  const challengesDone = useChallengeStore((s) => s.done);
  const router = useRouter();

  useEffect(() => hydrate(), [hydrate]);

  // A practice lesson counts as done once its challenge is solved.
  const isDone = useMemo(() => {
    const set = new Set(completed);
    return (lessonId: string) => {
      const l = ALL_LESSONS.find((x) => x.id === lessonId);
      if (l?.practiceChallenge && challengesDone.includes(l.practiceChallenge)) return true;
      return set.has(lessonId);
    };
  }, [completed, challengesDone]);

  // Reflect solved challenges back into saved progress.
  useEffect(() => {
    for (const l of ALL_LESSONS) {
      if (l.practiceChallenge && challengesDone.includes(l.practiceChallenge) && !completed.includes(l.id)) {
        complete(l.id);
      }
    }
  }, [challengesDone, completed, complete]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close]);

  if (!open) return null;

  const lesson = ALL_LESSONS.find((l) => l.id === activeId) ?? ALL_LESSONS[0];
  const activeModule = MODULES.find((m) => m.lessons.some((l) => l.id === lesson.id))!;
  const idx = ALL_LESSONS.findIndex((l) => l.id === lesson.id);
  const doneCount = ALL_LESSONS.filter((l) => isDone(l.id)).length;
  const pct = Math.round((doneCount / ALL_LESSONS.length) * 100);
  const next = ALL_LESSONS[idx + 1];

  const runAction = (a: LessonAction) => {
    complete(lesson.id);
    switch (a.kind) {
      case "load": {
        const d = decodeDesign(a.code);
        if (d) useDesignStore.getState().loadDesign(d);
        close();
        break;
      }
      case "lab":
        useLabStore.getState().openLab(a.tab);
        close();
        break;
      case "challenge":
        useChallengeStore.getState().start(a.id);
        useUiStore.getState().setLeftOpen(true);
        close();
        break;
      case "glossary":
        close();
        useUiStore.getState().openGlossary(a.conceptId);
        break;
      case "learn":
        close();
        router.push(`/learn/${a.slug}`);
        break;
    }
  };

  const goNextLesson = () => {
    complete(lesson.id);
    if (next) setActive(next.id);
    else close();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-3 sm:p-8" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/65 backdrop-blur-sm" onClick={close} />
      <div className="relative flex max-h-[90vh] w-full max-w-4xl overflow-hidden border border-[var(--border)] bg-[var(--surface)] shadow-2xl animate-fade-up">
        {/* sidebar: curriculum */}
        <aside className="hidden w-64 shrink-0 flex-col border-r border-[var(--border)] bg-[var(--surface-2)] sm:flex">
          <div className="border-b border-[var(--border)] p-4">
            <div className="flex items-center gap-2">
              <GraduationCap size={16} className="text-[var(--accent)]" />
              <span className="text-[14px] font-bold text-[var(--text)]">Academy</span>
            </div>
            <div className="mt-2 h-1.5 w-full bg-[var(--surface-3)]">
              <div className="h-full bg-[var(--accent)] transition-all" style={{ width: `${pct}%` }} />
            </div>
            <div className="mt-1 text-[10px] text-[var(--muted)]">
              {doneCount}/{ALL_LESSONS.length} lessons · {pct}%
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {MODULES.map((m) => (
              <div key={m.id} className="mb-2">
                <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">{m.title}</div>
                {m.lessons.map((l) => {
                  const done = isDone(l.id);
                  const active = l.id === lesson.id;
                  return (
                    <button
                      key={l.id}
                      onClick={() => setActive(l.id)}
                      className={`flex w-full items-center gap-2 px-2 py-1.5 text-left text-[12px] transition ${active ? "bg-[var(--surface-3)] text-[var(--text)]" : "text-[var(--muted)] hover:text-[var(--text)]"}`}
                    >
                      <span className={`grid h-4 w-4 shrink-0 place-items-center border ${done ? "border-[var(--good)] bg-[var(--good)]/15 text-[var(--good)]" : "border-[var(--border-strong)]"}`}>
                        {done && <Check size={10} strokeWidth={3} />}
                      </span>
                      <span className="truncate">{l.title}</span>
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </aside>

        {/* lesson */}
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-center justify-between border-b border-[var(--border)] p-4">
            <div className="min-w-0">
              <div className="text-[10px] font-semibold uppercase tracking-wide text-[var(--accent)]">
                {activeModule.title} · Lesson {idx + 1} of {ALL_LESSONS.length}
              </div>
              <h2 className="mt-0.5 truncate text-[17px] font-bold text-[var(--text)]">{lesson.title}</h2>
            </div>
            <button onClick={close} className="grid h-8 w-8 shrink-0 place-items-center border border-[var(--border)] text-[var(--muted)] hover:border-[var(--bad)] hover:text-[var(--bad)]">
              <X size={14} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-5">
            <div className="space-y-3.5">
              {lesson.body.map((p, i) => (
                <p key={i} className="text-[14px] leading-relaxed text-[var(--text)]">
                  {p}
                </p>
              ))}
            </div>

            <div className="mt-4 flex gap-2.5 border border-[var(--accent)]/30 bg-[var(--accent-soft)] p-3">
              <Lightbulb size={15} className="mt-0.5 shrink-0 text-[var(--accent)]" />
              <p className="text-[12.5px] leading-snug text-[var(--text)]">
                <span className="font-semibold text-[var(--accent)]">Takeaway: </span>
                {lesson.takeaway}
              </p>
            </div>

            {lesson.action && (
              <button
                onClick={() => runAction(lesson.action!)}
                className="mt-4 flex w-full items-center justify-center gap-2 bg-[var(--accent)] px-4 py-2.5 text-[13px] font-semibold text-[var(--bg)] transition hover:brightness-110"
              >
                <ActionIcon action={lesson.action} />
                {lesson.action.label}
              </button>
            )}
            {lesson.practiceChallenge && (
              <p className="mt-2 flex items-center gap-1.5 text-[11px] text-[var(--muted)]">
                {isDone(lesson.id) ? (
                  <>
                    <Check size={12} className="text-[var(--good)]" /> Solved — nice work.
                  </>
                ) : (
                  <>
                    <Lock size={11} /> This lesson completes when you solve the challenge.
                  </>
                )}
              </p>
            )}
          </div>

          <div className="flex items-center justify-between border-t border-[var(--border)] p-4">
            <button
              onClick={() => idx > 0 && setActive(ALL_LESSONS[idx - 1].id)}
              disabled={idx === 0}
              className="border border-[var(--border)] px-3 py-1.5 text-[12px] font-medium text-[var(--muted)] transition enabled:hover:text-[var(--text)] disabled:opacity-30"
            >
              Back
            </button>
            <button
              onClick={goNextLesson}
              className="flex items-center gap-1.5 bg-[var(--surface-3)] px-4 py-1.5 text-[12px] font-semibold text-[var(--text)] transition hover:bg-[var(--border-strong)]"
            >
              {next ? "Mark done & next" : "Finish course"}
              {next && <ArrowRight size={13} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
