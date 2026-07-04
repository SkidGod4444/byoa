"use client";

import { BookOpen, RotateCcw, Trophy } from "lucide-react";
import { useDesignStore } from "@/store/designStore";
import { useUiStore } from "@/store/uiStore";
import { useChallengeStore } from "@/store/challengeStore";
import { q } from "@/lib/physics";
import PresetMenu from "./panels/PresetMenu";
import ShareButton from "./panels/ShareButton";

export default function Header() {
  const name = useDesignStore((s) => s.design.name);
  const setName = useDesignStore((s) => s.setName);
  const reset = useDesignStore((s) => s.reset);
  const openGlossary = useUiStore((s) => s.openGlossary);
  const openChallenges = useChallengeStore((s) => s.setPickerOpen);
  const openIntro = useUiStore((s) => s.setIntroOpen);

  return (
    <header className="sticky top-0 z-30 border-b border-[var(--border)] bg-[var(--bg)]/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-[1600px] flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2.5">
        {/* brand */}
        <div className="flex items-center gap-2.5">
          <div className="grid h-8 w-8 place-items-center rounded-lg border border-[var(--border-strong)] bg-[var(--surface-2)]">
            <svg width="20" height="20" viewBox="0 0 24 24" className="text-[var(--accent)]">
              <g fill="none" stroke="currentColor" strokeWidth="1.6">
                <circle cx="12" cy="12" r="3.2" />
                {Array.from({ length: 8 }, (_, k) => {
                  const a = (k * 45 * Math.PI) / 180;
                  return <line key={k} x1={q(12 + 5 * Math.cos(a))} y1={q(12 + 5 * Math.sin(a))} x2={q(12 + 8 * Math.cos(a))} y2={q(12 + 8 * Math.sin(a))} />;
                })}
              </g>
            </svg>
          </div>
          <div className="leading-none">
            <div className="text-[15px] font-bold tracking-tight text-[var(--text)]">
              BYOA<span className="ml-1.5 text-[11px] font-normal text-[var(--muted)]">Build Your Own Actuators</span>
            </div>
          </div>
        </div>

        {/* design name */}
        <div className="order-3 flex w-full items-center gap-2 sm:order-2 sm:w-auto sm:flex-1">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            aria-label="Design name"
            className="w-full max-w-xs rounded-lg border border-transparent bg-[var(--surface-2)] px-3 py-1.5 text-[13px] font-medium text-[var(--text)] transition hover:border-[var(--border)] focus:border-[var(--accent)] focus:outline-none"
          />
        </div>

        {/* actions */}
        <div className="order-2 ml-auto flex items-center gap-2 sm:order-3">
          <button
            onClick={() => openIntro(true)}
            className="hidden items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12px] font-medium text-[var(--muted)] transition hover:text-[var(--text)] sm:flex"
          >
            How it works
          </button>
          <button
            onClick={() => openChallenges(true)}
            className="flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-1.5 text-[12px] font-medium text-[var(--text)] transition hover:border-[var(--accent)]"
          >
            <Trophy size={14} strokeWidth={1.8} className="text-[var(--accent)]" />
            Challenges
          </button>
          <button
            onClick={() => openGlossary()}
            className="flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-1.5 text-[12px] font-medium text-[var(--text)] transition hover:border-[var(--accent)]"
          >
            <BookOpen size={14} strokeWidth={1.8} />
            Learn
          </button>
          <PresetMenu />
          <ShareButton />
          <button
            onClick={reset}
            aria-label="Reset design"
            title="Reset to a blank design"
            className="grid h-8 w-8 place-items-center rounded-lg border border-[var(--border)] bg-[var(--surface-2)] text-[var(--muted)] transition hover:border-[var(--bad)] hover:text-[var(--bad)]"
          >
            <RotateCcw size={14} strokeWidth={1.8} />
          </button>
        </div>
      </div>
    </header>
  );
}
