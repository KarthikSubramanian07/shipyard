"use client";

import { Bell, BellRing, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { addChapterAction, toggleSubscriptionAction } from "@/app/actions/fic";
import { Button } from "@/components/ui/button";

export function SubscribeButton({
  ficId,
  initialSubscribed,
  authed,
}: {
  ficId: string;
  initialSubscribed: boolean;
  authed: boolean;
}) {
  const router = useRouter();
  const [subscribed, setSubscribed] = useState(initialSubscribed);
  const [pending, start] = useTransition();

  function onClick() {
    if (!authed) {
      router.push("/login");
      return;
    }
    const next = !subscribed;
    setSubscribed(next);
    start(async () => {
      const res = await toggleSubscriptionAction(ficId);
      setSubscribed(res.subscribed);
    });
  }

  return (
    <Button variant="secondary" onClick={onClick} disabled={pending}>
      {subscribed ? <BellRing /> : <Bell />}
      {subscribed ? "Subscribed" : "Subscribe"}
    </Button>
  );
}

export function AddChapter({ ficId, ficSlug }: { ficId: string; ficSlug: string }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!formRef.current) return;
    const fd = new FormData(formRef.current);
    start(async () => {
      const res = await addChapterAction(ficId, ficSlug, fd);
      if (res?.error) setError(res.error);
    });
  }

  if (!open) {
    return (
      <Button variant="outline" onClick={() => setOpen(true)}>
        <Plus /> Add a chapter
      </Button>
    );
  }

  return (
    <form
      ref={formRef}
      onSubmit={submit}
      className="border-border bg-card space-y-3 rounded-xl border p-4"
    >
      <input
        name="title"
        maxLength={160}
        placeholder="Chapter title (optional)"
        className="border-input bg-background focus-visible:ring-ring/40 h-10 w-full rounded-lg border px-3 text-sm focus-visible:outline-none focus-visible:ring-2"
      />
      <textarea
        name="body"
        required
        rows={10}
        placeholder="Write the next chapter…"
        className="prose-shipyard border-input bg-background focus-visible:ring-ring/40 w-full resize-y rounded-lg border px-3 py-2 focus-visible:outline-none focus-visible:ring-2"
      />
      {error ? <p className="text-destructive text-sm">{error}</p> : null}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
          Cancel
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? "Publishing…" : "Publish chapter"}
        </Button>
      </div>
    </form>
  );
}
