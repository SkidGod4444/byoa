"use client";

import { useEffect, useRef, useState } from "react";
import { Rocket, X } from "lucide-react";
import { TOUR_STEPS, useTourStore } from "@/store/tourStore";

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

const PAD = 10;

function unionRects(a: DOMRect, b: DOMRect): Rect {
  const x = Math.min(a.left, b.left);
  const y = Math.min(a.top, b.top);
  return {
    x,
    y,
    w: Math.max(a.right, b.right) - x,
    h: Math.max(a.bottom, b.bottom) - y,
  };
}

/**
 * The spotlight is built from FOUR mask rectangles around the hole instead of
 * one backdrop — so the hole itself contains no element at all and real clicks
 * fall straight through onto the live control underneath.
 */
export default function TourOverlay() {
  const active = useTourStore((s) => s.active);
  const stepIndex = useTourStore((s) => s.step);
  const next = useTourStore((s) => s.next);
  const prev = useTourStore((s) => s.prev);
  const end = useTourStore((s) => s.end);

  const step = TOUR_STEPS[stepIndex];
  const [rect, setRect] = useState<Rect | null>(null);
  const scrolledFor = useRef<string>("");

  // Follow the target's rect every frame — it moves (dropdown opens, panel
  // grows, layout shifts) and the spotlight glides along via CSS transitions.
  useEffect(() => {
    if (!active) return;
    let raf = 0;
    const tick = () => {
      const t = step?.target ? document.querySelector(`[data-tour="${step.target}"]`) : null;
      if (!t) {
        setRect(null);
      } else {
        // one-time scroll to bring the target into view
        if (scrolledFor.current !== step.id) {
          scrolledFor.current = step.id;
          t.scrollIntoView({ block: "nearest", behavior: "smooth" });
        }
        const extra = step.extraTarget ? document.querySelector(`[data-tour="${step.extraTarget}"]`) : null;
        const r = extra ? unionRects(t.getBoundingClientRect(), extra.getBoundingClientRect()) : (({ left, top, width, height }) => ({ x: left, y: top, w: width, h: height }))(t.getBoundingClientRect());
        setRect((old) =>
          old && Math.abs(old.x - r.x) < 1 && Math.abs(old.y - r.y) < 1 && Math.abs(old.w - r.w) < 1 && Math.abs(old.h - r.h) < 1 ? old : r,
        );
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active, step]);

  // keyboard driving
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") end();
      else if (e.key === "ArrowRight" || e.key === "Enter") next();
      else if (e.key === "ArrowLeft") prev();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, next, prev, end]);

  if (!active || !step) return null;

  const hole: Rect | null = rect
    ? { x: rect.x - PAD, y: rect.y - PAD, w: rect.w + 2 * PAD, h: rect.h + 2 * PAD }
    : null;

  const vw = typeof window !== "undefined" ? window.innerWidth : 1600;
  const vh = typeof window !== "undefined" ? window.innerHeight : 900;

  // card placement: right of hole → left → below → above → center
  const CARD_W = 340;
  const CARD_H = 220; // estimate for clamping
  let cardStyle: React.CSSProperties;
  if (!hole) {
    cardStyle = { left: "50%", top: "50%", transform: "translate(-50%, -50%)" };
  } else if (hole.x + hole.w + CARD_W + 24 < vw) {
    cardStyle = { left: hole.x + hole.w + 16, top: Math.max(16, Math.min(vh - CARD_H - 16, hole.y)) };
  } else if (hole.x - CARD_W - 24 > 0) {
    cardStyle = { left: hole.x - CARD_W - 16, top: Math.max(16, Math.min(vh - CARD_H - 16, hole.y)) };
  } else if (hole.y + hole.h + CARD_H + 24 < vh) {
    cardStyle = { left: Math.max(16, Math.min(vw - CARD_W - 16, hole.x)), top: hole.y + hole.h + 16 };
  } else {
    cardStyle = { left: Math.max(16, Math.min(vw - CARD_W - 16, hole.x)), top: Math.max(16, hole.y - CARD_H - 16) };
  }

  // Targeted steps stay lightly dimmed so the 3D machine remains watchable —
  // the whole point is seeing the app react while the tour drives it.
  const maskCls = `fixed transition-all duration-300 ease-out ${hole ? "bg-black/40" : "bg-black/70 backdrop-blur-[2px]"}`;
  const last = stepIndex === TOUR_STEPS.length - 1;

  return (
    <div className="fixed inset-0 z-[80] pointer-events-none">
      {/* mask — four rects framing a truly empty (click-through) hole */}
      {hole ? (
        <>
          <div className={`${maskCls} pointer-events-auto`} style={{ left: 0, top: 0, width: vw, height: Math.max(0, hole.y) }} onClick={next} />
          <div className={`${maskCls} pointer-events-auto`} style={{ left: 0, top: hole.y + hole.h, width: vw, height: Math.max(0, vh - hole.y - hole.h) }} onClick={next} />
          <div className={`${maskCls} pointer-events-auto`} style={{ left: 0, top: hole.y, width: Math.max(0, hole.x), height: hole.h }} onClick={next} />
          <div className={`${maskCls} pointer-events-auto`} style={{ left: hole.x + hole.w, top: hole.y, width: Math.max(0, vw - hole.x - hole.w), height: hole.h }} onClick={next} />
          {/* glow ring */}
          <div
            className="fixed border-2 border-[var(--accent)] transition-all duration-300 ease-out"
            style={{
              left: hole.x,
              top: hole.y,
              width: hole.w,
              height: hole.h,
              boxShadow: "0 0 0 1px rgba(249,115,22,0.35), 0 0 26px 2px rgba(249,115,22,0.4), inset 0 0 18px rgba(249,115,22,0.1)",
            }}
          />
        </>
      ) : (
        <div className={`${maskCls} pointer-events-auto inset-0`} style={{ left: 0, top: 0, width: vw, height: vh }} />
      )}

      {/* step card */}
      <div
        key={step.id}
        className="pointer-events-auto fixed z-[81] w-[340px] max-w-[calc(100vw-32px)] animate-fade-up overflow-hidden border border-[var(--border-strong)] bg-[var(--surface)] shadow-2xl"
        style={cardStyle}
      >
        <div className="h-0.5 w-full bg-[var(--accent)]" />
        <div className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="grid h-9 w-9 place-items-center border border-[var(--accent)]/40 bg-[var(--accent-soft)] text-[var(--accent)]">
              <step.icon size={18} strokeWidth={1.8} />
            </div>
            <button
              onClick={end}
              aria-label="End tour"
              className="grid h-6 w-6 shrink-0 place-items-center border border-[var(--border)] text-[var(--muted)] transition hover:border-[var(--bad)] hover:text-[var(--bad)]"
            >
              <X size={12} strokeWidth={1.8} />
            </button>
          </div>
          <h3 className="mt-2 text-[15px] font-bold tracking-tight text-[var(--text)]">{step.title}</h3>
          <p className="mt-1.5 text-[12.5px] leading-relaxed text-[var(--muted)]">{step.body}</p>

          <div className="mt-4 flex items-center justify-between">
            {/* progress dots */}
            <div className="flex items-center gap-1">
              {TOUR_STEPS.map((s, i) => (
                <span
                  key={s.id}
                  className={`transition-all ${i === stepIndex ? "h-1 w-5 bg-[var(--accent)]" : "h-1 w-1.5 bg-[var(--border-strong)]"}`}
                />
              ))}
            </div>
            <div className="flex items-center gap-1.5">
              {stepIndex > 0 && (
                <button
                  onClick={prev}
                  className="border border-[var(--border)] px-2.5 py-1.5 text-[12px] font-medium text-[var(--muted)] transition hover:text-[var(--text)]"
                >
                  Back
                </button>
              )}
              <button
                onClick={next}
                className="bg-[var(--accent)] px-3.5 py-1.5 text-[12px] font-semibold text-[var(--bg)] transition hover:brightness-110"
              >
                {last ? (
                  <span className="flex items-center gap-1.5">
                    Start exploring <Rocket size={13} strokeWidth={2} />
                  </span>
                ) : (
                  "Next →"
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
