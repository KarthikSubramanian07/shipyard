"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { setProgressAction } from "@/app/actions/progress";
import type { WorkType } from "@/db/schema";
import { Button } from "@/components/ui/button";
import { formatProgress, progressNoun } from "@/lib/progress";

/**
 * "How far are you?" - powers progress-aware spoilers. Films are single-unit so
 * this renders nothing for them.
 */
export function ProgressControl({
  workId,
  workType,
  initial,
  authed,
  path,
}: {
  workId: string;
  workType: WorkType;
  initial: number | null;
  authed: boolean;
  path: string;
}) {
  const router = useRouter();
  const noun = progressNoun(workType);
  const [pos, setPos] = useState(initial ?? 0);
  const [saved, setSaved] = useState(initial ?? 0);
  const [pending, start] = useTransition();
  if (!noun) return null;

  function save() {
    if (!authed) {
      router.push("/login");
      return;
    }
    start(async () => {
      await setProgressAction(workId, pos, formatProgress(workType, pos) || null, path);
      setSaved(pos);
    });
  }

  return (
    <div className="border-border bg-card rounded-lg border p-3">
      <p className="text-muted-foreground text-xs font-medium">How far are you?</p>
      <div className="mt-2 flex items-center gap-2">
        <span className="text-sm">{noun}</span>
        <input
          type="number"
          min={0}
          max={999}
          value={pos}
          onChange={(e) => setPos(Math.max(0, Number(e.target.value) || 0))}
          className="border-input bg-background focus-visible:ring-ring/40 h-9 w-16 rounded-lg border px-2 text-sm focus-visible:outline-none focus-visible:ring-2"
        />
        <Button size="sm" variant="secondary" onClick={save} disabled={pending || pos === saved}>
          {pending ? "…" : "Save"}
        </Button>
      </div>
      <p className="text-muted-foreground mt-1.5 text-xs">
        {saved > 0
          ? `You're on ${formatProgress(workType, saved)}. Reviews past this stay hidden.`
          : "Set this and spoiler-ahead reviews get blurred for you."}
      </p>
    </div>
  );
}
