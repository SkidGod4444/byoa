"use client";

import { useEffect } from "react";
import dynamic from "next/dynamic";
import { useDesignStore } from "@/store/designStore";
import { useUiStore } from "@/store/uiStore";
import Header from "./Header";
import GlossaryDialog from "./GlossaryDialog";
import IntroOverlay from "./IntroOverlay";
import TourOverlay from "./TourOverlay";
import SmallScreenGate from "./SmallScreenGate";
import MotorEditor from "./panels/MotorEditor";
import TransmissionPanel from "./panels/TransmissionPanel";
import SpecsPanel from "./panels/SpecsPanel";
import AnatomyCard from "./panels/AnatomyCard";
import SceneToolbar from "./panels/SceneToolbar";
import ViewControls from "./panels/ViewControls";

// The 3D scene touches WebGL — client-only.
const ActuatorScene = dynamic(() => import("./three/ActuatorScene"), {
  ssr: false,
  loading: () => (
    <div className="grid h-full w-full place-items-center">
      <div className="text-[12px] text-[var(--muted)]">Assembling the actuator…</div>
    </div>
  ),
});

function PanelToggle({
  side,
  open,
  onClick,
}: {
  side: "left" | "right";
  open: boolean;
  onClick: () => void;
}) {
  // chevron points toward what the click will do (collapse vs reveal)
  const pointsLeft = (side === "left") === open;
  return (
    <button
      onClick={onClick}
      aria-label={`${open ? "Collapse" : "Show"} ${side} panel`}
      title={`${open ? "Collapse" : "Show"} ${side} panel`}
      className="pointer-events-auto grid h-8 w-8 place-items-center rounded-lg border border-[var(--border)] bg-[var(--surface)]/85 text-[var(--muted)] backdrop-blur-md transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
    >
      <svg width="13" height="13" viewBox="0 0 14 14" style={{ transform: pointsLeft ? undefined : "scaleX(-1)" }}>
        <rect x="1.5" y="2" width="11" height="10" rx="2" fill="none" stroke="currentColor" strokeWidth="1.2" />
        <line x1="5.4" y1="2" x2="5.4" y2="12" stroke="currentColor" strokeWidth="1.2" />
        <path d="M10.4 5.4 L8.6 7 L10.4 8.6" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}

export default function AppShell() {
  const hydrate = useDesignStore((s) => s.hydrate);
  const setIntroOpen = useUiStore((s) => s.setIntroOpen);
  const leftOpen = useUiStore((s) => s.leftOpen);
  const rightOpen = useUiStore((s) => s.rightOpen);
  const setLeftOpen = useUiStore((s) => s.setLeftOpen);
  const setRightOpen = useUiStore((s) => s.setRightOpen);

  useEffect(() => {
    hydrate();
    try {
      const params = new URLSearchParams(window.location.search);
      // Don't interrupt someone opening a shared design or explicitly skipping the tour.
      const skip = params.has("d") || params.has("notour");
      if (!skip && !window.localStorage.getItem("byoa.introSeen")) {
        setIntroOpen(true);
        window.localStorage.setItem("byoa.introSeen", "1");
      }
    } catch {
      /* ignore */
    }
  }, [hydrate, setIntroOpen]);

  return (
    <div className="flex min-h-dvh flex-col lg:h-dvh lg:overflow-hidden">
      <Header />

      <main className="relative min-h-0 flex-1">
        {/* 3D stage — the hero. Fixed height on mobile, fills on desktop. */}
        <div data-tour="scene" className="relative h-[52vh] min-h-[380px] lg:absolute lg:inset-0 lg:h-auto lg:min-h-0">
          <ActuatorScene />

          {/* top overlay: panel toggles + view controls, tracking the open sidebars */}
          <div
            className="pointer-events-none absolute top-3 flex items-start justify-between"
            style={{ left: "var(--ov-l)", right: "var(--ov-r)" }}
          >
            <PanelToggle side="left" open={leftOpen} onClick={() => setLeftOpen(!leftOpen)} />
            <div className="flex flex-col items-end gap-2">
              <PanelToggle side="right" open={rightOpen} onClick={() => setRightOpen(!rightOpen)} />
              <div className="pointer-events-auto">
                <ViewControls />
              </div>
            </div>
          </div>

          {/* bottom overlay: chain chips + playback / explode / x-ray */}
          <div className="pointer-events-none absolute bottom-3" style={{ left: "var(--ov-l)", right: "var(--ov-r)" }}>
            <SceneToolbar />
          </div>
        </div>

        {/* overlay inset variables — panels overlap the canvas on lg only */}
        <style>{`
          [data-tour="scene"] { --ov-l: 12px; --ov-r: 12px; }
          @media (min-width: 1024px) {
            [data-tour="scene"] { --ov-l: ${leftOpen ? "352px" : "12px"}; --ov-r: ${rightOpen ? "352px" : "12px"}; }
          }
        `}</style>

        {/* left column — build controls */}
        {leftOpen && (
          <div className="space-y-3 px-3 py-3 lg:absolute lg:bottom-0 lg:left-0 lg:top-0 lg:w-[340px] lg:overflow-y-auto lg:p-3">
            <div data-tour="motor-panel">
              <MotorEditor />
            </div>
            <div data-tour="transmission">
              <TransmissionPanel />
            </div>
          </div>
        )}

        {/* right column — anatomy + performance */}
        {rightOpen && (
          <div className="space-y-3 px-3 pb-3 lg:absolute lg:bottom-0 lg:right-0 lg:top-0 lg:w-[340px] lg:overflow-y-auto lg:p-3">
            <div data-tour="anatomy">
              <AnatomyCard />
            </div>
            <div data-tour="specs">
              <SpecsPanel />
            </div>
          </div>
        )}
      </main>

      <footer className="border-t border-[var(--border)] px-4 py-2.5 text-center text-[11px] text-[var(--muted)]">
        BYOA · a hands-on actuator playground. Proportions are schematic; numbers are first-order engineering estimates
        for learning, not datasheet specs.
      </footer>

      <GlossaryDialog />
      <IntroOverlay />
      <TourOverlay />
      <SmallScreenGate />
    </div>
  );
}
