"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { submitComment } from "@/app/actions/content";
import type { EntityType } from "@/db/schema";
import { SpoilerText } from "@/components/spoiler-text";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { relativeTime } from "@/lib/utils";

export interface CommentView {
  id: string;
  parentId: string | null;
  body: string;
  createdAt: number;
  user: { username: string; displayName: string; avatarKey: string | null };
}

export function CommentSection({
  entityType,
  entityId,
  path,
  comments,
  authed,
}: {
  entityType: EntityType;
  entityId: string;
  path: string;
  comments: CommentView[];
  authed: boolean;
}) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [pending, start] = useTransition();

  const roots = comments.filter((c) => !c.parentId);
  const repliesByParent = new Map<string, CommentView[]>();
  for (const c of comments) {
    if (c.parentId) {
      const arr = repliesByParent.get(c.parentId) ?? [];
      arr.push(c);
      repliesByParent.set(c.parentId, arr);
    }
  }

  function post() {
    if (!body.trim()) return;
    const fd = new FormData();
    fd.set("body", body.trim());
    start(async () => {
      const res = await submitComment(entityType, entityId, path, fd);
      if (res.ok) {
        setBody("");
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-5">
      {authed ? (
        <div className="flex gap-3">
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={2}
            placeholder="Add a comment…"
            className="border-input bg-card focus-visible:border-ring focus-visible:ring-ring/40 flex-1 resize-none rounded-lg border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2"
          />
          <Button size="sm" onClick={post} disabled={pending || !body.trim()}>
            Reply
          </Button>
        </div>
      ) : (
        <p className="text-muted-foreground text-sm">
          <Link href="/login" className="text-primary font-medium hover:underline">
            Log in
          </Link>{" "}
          to join the conversation.
        </p>
      )}

      {roots.length === 0 ? (
        <p className="text-muted-foreground text-sm">No comments yet. Be the first.</p>
      ) : (
        <ul className="space-y-4">
          {roots.map((c) => (
            <li key={c.id} className="space-y-3">
              <CommentRow comment={c} />
              {(repliesByParent.get(c.id) ?? []).length > 0 && (
                <ul className="border-border space-y-3 border-l pl-4">
                  {repliesByParent.get(c.id)!.map((r) => (
                    <li key={r.id}>
                      <CommentRow comment={r} />
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function CommentRow({ comment }: { comment: CommentView }) {
  return (
    <div className="flex gap-3">
      <Avatar user={comment.user} size="sm" />
      <div className="min-w-0">
        <p className="text-sm">
          <Link href={`/u/${comment.user.username}`} className="font-medium hover:underline">
            {comment.user.displayName}
          </Link>{" "}
          <span className="text-muted-foreground text-xs">
            {relativeTime(comment.createdAt * 1000)}
          </span>
        </p>
        <SpoilerText text={comment.body} className="text-foreground/90 text-sm" />
      </div>
    </div>
  );
}
