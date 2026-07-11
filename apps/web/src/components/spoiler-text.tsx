"use client";

import { useState } from "react";
import { parseSpoilers } from "@/lib/spoilers";
import { cn } from "@/lib/utils";

/** A single tap-to-reveal redaction bar. */
function Spoiler({ text }: { text: string }) {
  const [shown, setShown] = useState(false);
  return (
    <span
      role="button"
      tabIndex={0}
      aria-label={shown ? undefined : "Spoiler. Tap to reveal."}
      onClick={() => setShown(true)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          setShown(true);
        }
      }}
      className={cn(
        "rounded-[3px] transition-colors",
        shown
          ? "bg-transparent"
          : "bg-foreground text-foreground hover:bg-foreground/80 cursor-pointer select-none",
      )}
    >
      {text}
    </span>
  );
}

/**
 * Render user prose with inline `>!spoilers!<` as tap-to-reveal bars.
 * XSS-safe: all text goes through React text nodes; no dangerouslySetInnerHTML.
 */
export function SpoilerText({ text, className }: { text: string; className?: string }) {
  const segments = parseSpoilers(text);
  return (
    <span className={cn("whitespace-pre-wrap", className)}>
      {segments.map((seg, i) =>
        seg.spoiler ? <Spoiler key={i} text={seg.text} /> : <span key={i}>{seg.text}</span>,
      )}
    </span>
  );
}
