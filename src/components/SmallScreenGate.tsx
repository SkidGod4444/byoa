"use client";

import { Monitor, Smartphone } from "lucide-react";

/**
 * BYOA is a dense 3D engineering workspace — below tablet width it degrades
 * into something that teaches nothing. Rather than ship a bad experience,
 * small screens get a polite full-screen gate (pure CSS breakpoint: covers
 * everything below `md`, disappears above it, live on rotate/resize).
 */
export default function SmallScreenGate() {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[var(--bg)] p-6 md:hidden">
      <div className="w-full max-w-sm border border-[var(--border)] bg-[var(--surface)]">
        <div className="h-0.5 w-full bg-[var(--accent)]" />
        <div className="p-6">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center border border-[var(--border-strong)] bg-[var(--surface-2)]">
              <svg width="22" height="22" viewBox="0 0 24 24" className="text-[var(--accent)]">
                <g fill="none" stroke="currentColor" strokeWidth="1.6">
                  <circle cx="12" cy="12" r="3.2" />
                  {Array.from({ length: 8 }, (_, k) => {
                    const a = (k * 45 * Math.PI) / 180;
                    const q = (n: number) => Math.round(n * 1000) / 1000;
                    return <line key={k} x1={q(12 + 5 * Math.cos(a))} y1={q(12 + 5 * Math.sin(a))} x2={q(12 + 8 * Math.cos(a))} y2={q(12 + 8 * Math.sin(a))} />;
                  })}
                </g>
              </svg>
            </div>
            <div className="leading-tight">
              <div className="text-[15px] font-bold text-[var(--text)]">BYOA</div>
              <div className="text-[11px] text-[var(--muted)]">Build Your Own Actuators</div>
            </div>
          </div>

          <div className="mt-5 flex items-center gap-3 text-[var(--muted)]">
            <Smartphone size={20} strokeWidth={1.6} className="text-[var(--bad)]" />
            <span className="text-[13px]">→</span>
            <Monitor size={26} strokeWidth={1.6} className="text-[var(--good)]" />
          </div>

          <h1 className="mt-4 text-[17px] font-bold tracking-tight text-[var(--text)]">Built for big screens</h1>
          <p className="mt-2 text-[13px] leading-relaxed text-[var(--muted)]">
            BYOA is a 3D engineering workspace — animated gears, anatomy cards, and live physics need room to
            breathe. Please open it on a <b className="text-[var(--text)]">desktop or laptop</b> (a large tablet in
            landscape works too).
          </p>
          <p className="mt-3 border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-[12px] text-[var(--muted)]">
            Nothing to install — just visit this page again on a bigger screen.
          </p>
        </div>
      </div>
    </div>
  );
}
