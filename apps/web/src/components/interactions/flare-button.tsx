"use client";

import { Flame } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { setFlareAction } from "@/app/actions/social";
import type { EntityType, FlareKey } from "@/db/schema";
import { FLARES, flareEmoji } from "@/lib/flares";
import { cn, formatCount } from "@/lib/utils";

/**
 * Flares: expressive reactions replacing the plain like. Tap to open the
 * picker, choose a flare (or tap your current one to clear it).
 */
export function FlareButton({
  entityType,
  entityId,
  initialFlare = null,
  initialCount,
  authed,
  path,
}: {
  entityType: EntityType;
  entityId: string;
  initialFlare?: FlareKey | null;
  initialCount: number;
  authed: boolean;
  path?: string;
}) {
  const router = useRouter();
  const [flare, setFlare] = useState<FlareKey | null>(initialFlare);
  const [count, setCount] = useState(initialCount);
  const [open, setOpen] = useState(false);
  const [, start] = useTransition();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  function choose(next: FlareKey) {
    if (!authed) {
      router.push("/login");
      return;
    }
    const resolved: FlareKey | null = flare === next ? null : next;
    // Count moves only when adding or removing, not when switching flare.
    if (flare === null && resolved !== null) setCount((c) => c + 1);
    if (flare !== null && resolved === null) setCount((c) => Math.max(0, c - 1));
    setFlare(resolved);
    setOpen(false);
    start(async () => {
      const res = await setFlareAction(entityType, entityId, resolved, path);
      setFlare(res.flare);
    });
  }

  return (
    <div ref={ref} className="relative inline-block">
      <button
        onClick={() => (authed ? setOpen((v) => !v) : router.push("/login"))}
        className={cn(
          "inline-flex items-center gap-1.5 text-sm font-medium transition-colors",
          flare ? "text-primary" : "text-muted-foreground hover:text-primary",
        )}
        aria-haspopup="true"
        aria-expanded={open}
      >
        {flare ? (
          <span className="text-base leading-none">{flareEmoji(flare)}</span>
        ) : (
          <Flame className="size-4" />
        )}
        {count > 0 ? formatCount(count) : "Flare"}
      </button>

      {open && (
        <div className="border-border bg-popover absolute bottom-full left-0 z-50 mb-2 flex gap-0.5 rounded-full border p-1 shadow-lg">
          {FLARES.map((f) => (
            <button
              key={f.key}
              title={f.label}
              aria-label={f.label}
              onClick={() => choose(f.key)}
              className={cn(
                "flex size-9 items-center justify-center rounded-full text-lg transition-transform hover:scale-125",
                flare === f.key && "bg-flare-soft",
              )}
            >
              {f.emoji}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
