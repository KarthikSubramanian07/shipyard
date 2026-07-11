"use client";

import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface MediaHit {
  source: string;
  externalId: string;
  type: string;
  title: string;
  year: number | null;
  posterUrl: string | null;
  subtitle: string | null;
}
interface UserHit {
  id: string;
  username: string;
  displayName: string;
}

export function SearchBox({ className, autoFocus }: { className?: string; autoFocus?: boolean }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [media, setMedia] = useState<MediaHit[]>([]);
  const [users, setUsers] = useState<UserHit[]>([]);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) {
      setMedia([]);
      setUsers([]);
      return;
    }
    setLoading(true);
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(term)}`, {
          signal: ctrl.signal,
        });
        if (res.ok) {
          const data = (await res.json()) as { media: MediaHit[]; users: UserHit[] };
          setMedia(data.media ?? []);
          setUsers(data.users ?? []);
          setOpen(true);
        }
      } catch {
        /* aborted */
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [q]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (q.trim()) router.push(`/search?q=${encodeURIComponent(q.trim())}`);
    setOpen(false);
  }

  const hasResults = media.length > 0 || users.length > 0;

  return (
    <div ref={boxRef} className={cn("relative w-full", className)}>
      <form onSubmit={submit}>
        <div className="relative">
          <Search className="text-muted-foreground pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onFocus={() => hasResults && setOpen(true)}
            autoFocus={autoFocus}
            placeholder="What did you watch last?"
            className="border-input bg-card placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/40 h-10 w-full rounded-full border pl-9 pr-4 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2"
            aria-label="Search works and people"
          />
        </div>
      </form>

      {open && (loading || hasResults) && (
        <div className="border-border bg-popover absolute z-50 mt-2 max-h-[70vh] w-full overflow-auto rounded-xl border p-1.5 shadow-lg">
          {loading && !hasResults ? (
            <p className="text-muted-foreground px-3 py-6 text-center text-sm">Searching…</p>
          ) : null}

          {media.map((m) => (
            <a
              key={`${m.source}:${m.externalId}`}
              href={`/work/resolve?source=${m.source}&id=${encodeURIComponent(m.externalId)}`}
              className="hover:bg-muted flex items-center gap-3 rounded-lg px-2 py-1.5"
              onClick={() => setOpen(false)}
            >
              <div className="bg-muted h-12 w-8 shrink-0 overflow-hidden rounded">
                {m.posterUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={m.posterUrl} alt="" className="h-full w-full object-cover" />
                ) : null}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">
                  {m.title}{" "}
                  {m.year ? <span className="text-muted-foreground">({m.year})</span> : null}
                </p>
                <p className="text-muted-foreground truncate text-xs capitalize">
                  {m.subtitle ?? m.type}
                </p>
              </div>
            </a>
          ))}

          {users.length > 0 && (
            <p className="text-muted-foreground px-3 pb-1 pt-2 text-xs font-medium uppercase tracking-wide">
              People
            </p>
          )}
          {users.map((u) => (
            <a
              key={u.id}
              href={`/u/${u.username}`}
              className="hover:bg-muted flex items-center gap-3 rounded-lg px-2 py-1.5"
              onClick={() => setOpen(false)}
            >
              <span className="text-sm font-medium">{u.displayName}</span>
              <span className="text-muted-foreground text-xs">@{u.username}</span>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
