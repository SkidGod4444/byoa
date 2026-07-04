"use client";

import { useState } from "react";
import { Check, Share2 } from "lucide-react";
import { encodeDesign, useDesignStore } from "@/store/designStore";

export default function ShareButton() {
  const design = useDesignStore((s) => s.design);
  const [copied, setCopied] = useState(false);

  const share = async () => {
    const url = `${window.location.origin}${window.location.pathname}?d=${encodeDesign(design)}`;
    window.history.replaceState(null, "", url);
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      /* clipboard may be blocked; URL is still in the address bar */
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  return (
    <button
      onClick={share}
      className="flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-1.5 text-[12px] font-medium text-[var(--text)] transition hover:border-[var(--accent)]"
    >
      {copied ? (
        <>
          <Check size={14} strokeWidth={2} className="text-[var(--good)]" />
          Copied link
        </>
      ) : (
        <>
          <Share2 size={14} strokeWidth={1.8} />
          Share
        </>
      )}
    </button>
  );
}
