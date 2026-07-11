"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { postReaction } from "@/app/actions/content";
import { Button } from "@/components/ui/button";

export function ReactionComposer({ workId, authed }: { workId: string; authed: boolean }) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  if (!authed) {
    return (
      <p className="border-border text-muted-foreground rounded-lg border border-dashed px-4 py-3 text-sm">
        <a href="/login" className="text-primary font-medium hover:underline">
          Log in
        </a>{" "}
        to drop a hot take.
      </p>
    );
  }

  function post() {
    if (!body.trim()) return;
    setError(null);
    const fd = new FormData();
    fd.set("body", body.trim());
    start(async () => {
      const res = await postReaction(workId, fd);
      if (res.ok) {
        setBody("");
        router.refresh();
      } else {
        setError(res.error ?? "Try again");
      }
    });
  }

  return (
    <div className="space-y-2">
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        maxLength={280}
        rows={2}
        placeholder="Drop a hot take (280 chars)…"
        className="border-input bg-card focus-visible:border-ring focus-visible:ring-ring/40 w-full resize-none rounded-lg border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2"
      />
      <div className="flex items-center justify-between">
        <span className="text-muted-foreground text-xs">{280 - body.length}</span>
        <Button size="sm" onClick={post} disabled={pending || !body.trim()}>
          Post reaction
        </Button>
      </div>
      {error ? <p className="text-destructive text-sm">{error}</p> : null}
    </div>
  );
}
