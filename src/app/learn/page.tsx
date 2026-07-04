import Link from "next/link";
import type { Metadata } from "next";
import { ArrowUpRight, ArrowLeft } from "lucide-react";
import { CONCEPTS } from "@/lib/concepts";

export const metadata: Metadata = {
  title: "Learn",
  description: "Plain-language guides to every robot-actuator concept — motors, gearing, performance, and control.",
};

const CATEGORIES: { key: string; label: string; blurb: string }[] = [
  { key: "motor", label: "Motors", blurb: "Where the motion comes from." },
  { key: "gearing", label: "Gearing", blurb: "Trading speed for strength." },
  { key: "specs", label: "Performance", blurb: "Reading what a machine can do." },
  { key: "control", label: "Control & feel", blurb: "Precision, feedback, and touch." },
];

export default function LearnIndex() {
  return (
    <div className="mx-auto min-h-dvh w-full max-w-3xl px-5 py-8">
      <div className="flex items-center justify-between">
        <Link href="/" className="flex items-center gap-1.5 text-[12px] font-medium text-[var(--muted)] transition hover:text-[var(--text)]">
          <ArrowLeft size={13} />
          Back to the builder
        </Link>
      </div>

      <h1 className="mt-8 text-3xl font-bold tracking-tight text-[var(--text)]">Learn actuators</h1>
      <p className="mt-2 max-w-xl text-[14px] leading-relaxed text-[var(--muted)]">
        Every idea the builder touches, explained twice: once in plain words with zero jargon, once precisely —
        with hand-picked videos and articles to go deeper.
      </p>

      {CATEGORIES.map((cat) => (
        <section key={cat.key} className="mt-8">
          <div className="flex items-baseline gap-3">
            <h2 className="text-[13px] font-bold uppercase tracking-[0.14em] text-[var(--accent)]">{cat.label}</h2>
            <span className="text-[12px] text-[var(--muted)]">{cat.blurb}</span>
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {CONCEPTS.filter((c) => c.category === cat.key).map((c) => (
              <Link
                key={c.id}
                href={`/learn/${c.id}`}
                className="group border border-[var(--border)] bg-[var(--surface)] p-3.5 transition hover:border-[var(--accent)]"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[13.5px] font-semibold text-[var(--text)] transition group-hover:text-[var(--accent)]">
                    {c.term}
                  </span>
                  <ArrowUpRight size={13} className="shrink-0 text-[var(--muted)] transition group-hover:text-[var(--accent)]" />
                </div>
                <p className="mt-1 line-clamp-2 text-[12px] leading-snug text-[var(--muted)]">{c.short}</p>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
