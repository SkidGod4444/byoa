import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft, ArrowUpRight, BookOpen, FileText, Mail, Play, Search } from "lucide-react";
import { CONCEPTS, CONCEPTS_BY_ID } from "@/lib/concepts";
import { LEARN, type LearnResource } from "@/lib/learn";

export function generateStaticParams() {
  return CONCEPTS.map((c) => ({ slug: c.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const c = CONCEPTS_BY_ID[slug];
  if (!c) return {};
  return {
    title: c.term,
    description: c.short,
  };
}

const RES_ICON: Record<LearnResource["type"], typeof Play> = {
  video: Play,
  article: FileText,
  wiki: BookOpen,
  newsletter: Mail,
  search: Search,
};

const CATEGORY_LABEL: Record<string, string> = {
  motor: "Motors",
  gearing: "Gearing",
  specs: "Performance",
  control: "Control & feel",
};

export default async function LearnPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const concept = CONCEPTS_BY_ID[slug];
  const learn = LEARN[slug];
  if (!concept) notFound();

  const related = (concept.see ?? []).filter((id) => CONCEPTS_BY_ID[id]);

  return (
    <div className="mx-auto min-h-dvh w-full max-w-2xl px-5 py-8">
      {/* top nav */}
      <div className="flex items-center justify-between">
        <Link
          href="/learn"
          className="flex items-center gap-1.5 text-[12px] font-medium text-[var(--muted)] transition hover:text-[var(--text)]"
        >
          <ArrowLeft size={13} />
          All topics
        </Link>
        <Link
          href="/"
          className="flex items-center gap-1.5 border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-[12px] font-medium text-[var(--text)] transition hover:border-[var(--accent)]"
        >
          Open the 3D builder
          <ArrowUpRight size={13} />
        </Link>
      </div>

      {/* header */}
      <div className="mt-8">
        <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--accent)]">
          {CATEGORY_LABEL[concept.category] ?? concept.category}
        </div>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-[var(--text)]">{concept.term}</h1>
        <p className="mt-2 text-[15px] leading-relaxed text-[var(--muted)]">{concept.short}</p>
      </div>

      {/* zero-jargon explanation */}
      {learn && (
        <section className="mt-8 border border-[var(--border)] bg-[var(--surface)]">
          <div className="h-0.5 w-full bg-[var(--accent)]" />
          <div className="p-5">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
              In plain words
            </h2>
            <div className="mt-3 space-y-4">
              {learn.plain.map((p, i) => (
                <p key={i} className="text-[14.5px] leading-relaxed text-[var(--text)]">
                  {p}
                </p>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* the precise version */}
      <section className="mt-4 border border-[var(--border)] bg-[var(--surface-2)] p-5">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
          The precise version
        </h2>
        <p className="mt-3 text-[13.5px] leading-relaxed text-[var(--muted)]">{concept.body}</p>
      </section>

      {/* related */}
      {related.length > 0 && (
        <section className="mt-6">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">Related topics</h2>
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {related.map((id) => (
              <Link
                key={id}
                href={`/learn/${id}`}
                className="border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1 text-[12px] text-[var(--muted)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
              >
                {CONCEPTS_BY_ID[id].term}
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* resources */}
      {learn && learn.resources.length > 0 && (
        <section className="mt-6">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
            Keep going — good resources
          </h2>
          <div className="mt-2.5 space-y-1.5">
            {learn.resources.map((r) => {
              const Icon = RES_ICON[r.type];
              return (
                <a
                  key={r.url}
                  href={r.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center gap-3 border border-[var(--border)] bg-[var(--surface)] px-3.5 py-2.5 transition hover:border-[var(--accent)]"
                >
                  <span className="grid h-7 w-7 shrink-0 place-items-center border border-[var(--border)] bg-[var(--surface-2)] text-[var(--muted)] transition group-hover:text-[var(--accent)]">
                    <Icon size={13} strokeWidth={1.8} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-medium text-[var(--text)] transition group-hover:text-[var(--accent)]">
                      {r.label}
                    </span>
                    <span className="block text-[11px] text-[var(--muted)]">{r.source}</span>
                  </span>
                  <ArrowUpRight size={14} className="shrink-0 text-[var(--muted)] transition group-hover:text-[var(--accent)]" />
                </a>
              );
            })}
          </div>
        </section>
      )}

      <footer className="mt-10 border-t border-[var(--border)] pt-4 text-[11px] text-[var(--muted)]">
        BYOA · see this idea moving —{" "}
        <Link href="/" className="text-[var(--accent)] hover:underline">
          open the 3D builder
        </Link>{" "}
        and click the parts.
      </footer>
    </div>
  );
}
