"use client";

import { useState } from "react";
import { Check, Copy, Sparkles } from "lucide-react";
import { buildAiPrompt, chatgptUrl, claudeUrl } from "@/lib/aiContext";
import { useDesignStore } from "@/store/designStore";

/**
 * "Explain with AI" — builds a prompt about the clicked part *and the user's
 * live design numbers*, then hands it to the user's assistant of choice.
 * The prompt links /ai/context.md so a browsing-capable AI can read the
 * app's full knowledge base.
 */
export default function AskAI({ partKey }: { partKey: string | null }) {
  const design = useDesignStore((s) => s.design);
  const [copied, setCopied] = useState(false);

  const open = (make: (p: string) => string) => {
    window.open(make(buildAiPrompt(design, partKey)), "_blank", "noopener");
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(buildAiPrompt(design, partKey));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable */
    }
  };

  const btn =
    "flex items-center gap-1.5 border border-[var(--border)] bg-[var(--surface-2)] px-2.5 py-1.5 text-[11px] font-medium text-[var(--text)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]";

  return (
    <div className="mt-3 border-t border-[var(--border)] pt-2.5">
      <div className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">
        <Sparkles size={11} className="text-[var(--accent)]" />
        Explain with AI — includes your design&apos;s numbers
      </div>
      <div className="flex flex-wrap gap-1.5">
        <button onClick={() => open(claudeUrl)} className={btn} title="Open Claude with a ready-made prompt">
          Ask Claude
        </button>
        <button onClick={() => open(chatgptUrl)} className={btn} title="Open ChatGPT with a ready-made prompt">
          Ask ChatGPT
        </button>
        <button onClick={copy} className={btn} title="Copy the prompt for any other assistant">
          {copied ? <Check size={12} className="text-[var(--good)]" /> : <Copy size={12} />}
          {copied ? "Copied" : "Copy prompt"}
        </button>
      </div>
    </div>
  );
}
