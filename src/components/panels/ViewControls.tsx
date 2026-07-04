"use client";

import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Focus, Minus, Plus } from "lucide-react";
import { cameraBus, panView, zoomBy } from "@/components/three/cameraBus";

const PAN = 14;
const ZOOM = 26;

function Btn({
  onClick,
  label,
  children,
  className = "",
}: {
  onClick: () => void;
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`grid h-8 w-8 place-items-center rounded-lg border border-[var(--border)] bg-[var(--surface)]/85 text-[var(--muted)] backdrop-blur-md transition hover:border-[var(--accent)] hover:text-[var(--accent)] active:scale-95 ${className}`}
    >
      {children}
    </button>
  );
}



/** Zoom / pan / re-frame pad — orbiting with a mouse isn't a given on phones. */
export default function ViewControls() {
  return (
    <div data-tour="view-controls" className="flex flex-col items-center gap-1.5">
      {/* zoom */}
      <div className="flex flex-col gap-1">
        <Btn onClick={() => zoomBy(ZOOM)} label="Zoom in">
          <Plus size={14} strokeWidth={1.8} />
        </Btn>
        <Btn onClick={() => zoomBy(-ZOOM)} label="Zoom out">
          <Minus size={14} strokeWidth={1.8} />
        </Btn>
      </div>

      {/* pan pad — arrows move the MACHINE in that direction */}
      <div className="grid grid-cols-3 gap-0.5">
        <span />
        <Btn onClick={() => panView(0, PAN)} label="Move machine up" className="h-7 w-7">
          <ChevronUp size={13} strokeWidth={1.8} />
        </Btn>
        <span />
        <Btn onClick={() => panView(-PAN, 0)} label="Move machine left" className="h-7 w-7">
          <ChevronLeft size={13} strokeWidth={1.8} />
        </Btn>
        <Btn onClick={() => cameraBus.reset?.()} label="Re-frame the machine" className="h-7 w-7">
          <Focus size={13} strokeWidth={1.8} />
        </Btn>
        <Btn onClick={() => panView(PAN, 0)} label="Move machine right" className="h-7 w-7">
          <ChevronRight size={13} strokeWidth={1.8} />
        </Btn>
        <span />
        <Btn onClick={() => panView(0, -PAN)} label="Move machine down" className="h-7 w-7">
          <ChevronDown size={13} strokeWidth={1.8} />
        </Btn>
        <span />
      </div>
    </div>
  );
}
