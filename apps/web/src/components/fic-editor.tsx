"use client";

import { ChevronDown } from "lucide-react";
import { useRef, useState, useTransition } from "react";
import { createFicAction } from "@/app/actions/fic";
import { FIC_CANON, FIC_RATINGS, FIC_TYPES } from "@/db/schema";
import { Button } from "@/components/ui/button";
import { ficLength, wordCount } from "@/lib/utils";

const TYPE_LABEL: Record<string, string> = {
  "alternate-ending": "Alternate ending",
  "missing-scene": "Missing scene",
  continuation: "Continuation",
  crossover: "Crossover",
  rewrite: "Rewrite",
  theory: "Theory",
  commentary: "Commentary",
};

export function FicEditor({ workId, workTitle }: { workId: string; workTitle: string }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [body, setBody] = useState("");
  const [showDetails, setShowDetails] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const words = wordCount(body);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!formRef.current) return;
    const fd = new FormData(formRef.current);
    start(async () => {
      const res = await createFicAction(workId, fd);
      if (res?.error) setError(res.error);
    });
  }

  return (
    <form ref={formRef} onSubmit={submit} className="mx-auto max-w-2xl px-4 py-8">
      <p className="text-muted-foreground mb-6 text-sm">
        Writing for <span className="text-foreground font-medium">{workTitle}</span>
      </p>

      <input
        name="title"
        required
        maxLength={160}
        placeholder="Title your fic"
        className="font-display placeholder:text-muted-foreground/50 w-full border-none bg-transparent text-3xl font-semibold tracking-tight focus:outline-none"
      />

      <textarea
        name="summary"
        rows={2}
        maxLength={1000}
        placeholder="A one-paragraph summary (optional)…"
        className="text-muted-foreground placeholder:text-muted-foreground/50 mt-3 w-full resize-none border-none bg-transparent text-base focus:outline-none"
      />

      {/* Details */}
      <button
        type="button"
        onClick={() => setShowDetails((v) => !v)}
        className="text-primary mt-4 flex items-center gap-1 text-sm font-medium"
      >
        <ChevronDown className={`size-4 transition-transform ${showDetails ? "" : "-rotate-90"}`} />
        Details &amp; tags
      </button>

      {showDetails && (
        <div className="border-border bg-card mt-3 grid gap-4 rounded-xl border p-4 sm:grid-cols-2">
          <Field label="Type">
            <select name="type" className={selectCls} defaultValue="alternate-ending">
              {FIC_TYPES.map((t) => (
                <option key={t} value={t}>
                  {TYPE_LABEL[t]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Rating">
            <select name="rating" className={selectCls} defaultValue="general">
              {FIC_RATINGS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Canon">
            <select name="canon" className={selectCls} defaultValue="canon-divergent">
              {FIC_CANON.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Pairing (optional)">
            <input name="pairing" maxLength={80} placeholder="e.g. Kaz/Inej" className={inputCls} />
          </Field>
          <Field label="Tone tags (comma-separated)" className="sm:col-span-2">
            <ToneInput />
          </Field>
        </div>
      )}

      <div className="border-border mt-6 border-t pt-6">
        <textarea
          name="body"
          required
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Write. The blank page is yours…"
          className="prose-shipyard min-h-[50vh] w-full resize-none border-none bg-transparent focus:outline-none"
        />
      </div>

      {error ? <p className="text-destructive text-sm">{error}</p> : null}

      <div className="border-border bg-background/90 sticky bottom-0 -mx-4 mt-4 flex items-center justify-between border-t px-4 py-3 backdrop-blur">
        <span className="text-muted-foreground text-sm">
          {words.toLocaleString()} words · {ficLength(words)}
        </span>
        <Button type="submit" disabled={pending || words === 0}>
          {pending ? "Publishing…" : "Publish"}
        </Button>
      </div>
    </form>
  );
}

const selectCls =
  "h-10 w-full rounded-lg border border-input bg-background px-3 text-sm capitalize focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none";
const inputCls =
  "h-10 w-full rounded-lg border border-input bg-background px-3 text-sm focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none";

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={`space-y-1.5 text-sm font-medium ${className ?? ""}`}>
      <span className="text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

/** Comma-separated tone entry that emits one hidden <input name="tone"> per tag. */
function ToneInput() {
  const [raw, setRaw] = useState("");
  const tags = raw
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean)
    .slice(0, 8);
  return (
    <>
      <input
        value={raw}
        onChange={(e) => setRaw(e.target.value)}
        placeholder="angst, slow burn, hurt-comfort"
        className={inputCls}
      />
      {tags.map((t) => (
        <input key={t} type="hidden" name="tone" value={t} />
      ))}
    </>
  );
}
