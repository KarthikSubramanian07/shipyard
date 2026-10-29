import { Bell } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { getDb } from "@/db";
import { requireUser } from "@/lib/auth";
import { getNotifications, markAllRead } from "@/lib/services/notifications";
import { Avatar } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/misc";
import { relativeTime } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Notifications",
  robots: { index: false, follow: false },
};

const VERB: Record<string, string> = {
  follow: "started following you",
  like: "liked something you made",
  comment: "commented on your work",
  kudos: "left kudos on your fic",
  chapter: "posted a new chapter",
};

export default async function NotificationsPage() {
  const user = await requireUser("/notifications");
  const db = getDb();
  const items = await getNotifications(db, user.id, 50);
  // Mark everything read now that they're viewing the page.
  await markAllRead(db, user.id);

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="font-display mb-6 text-2xl font-semibold">Notifications</h1>
      {items.length === 0 ? (
        <EmptyState
          icon={Bell}
          title="All quiet"
          description="Likes, follows, comments and kudos land here."
        />
      ) : (
        <ul className="divide-border divide-y">
          {items.map(({ notification, actor }) => (
            <li key={notification.id} className="flex items-center gap-3 py-4">
              {actor ? (
                <Avatar user={actor} size="md" />
              ) : (
                <Bell className="bg-muted text-muted-foreground size-9 rounded-full p-2" />
              )}
              <p className="flex-1 text-sm">
                {actor ? (
                  <Link href={`/u/${actor.username}`} className="font-medium hover:underline">
                    {actor.displayName}
                  </Link>
                ) : (
                  <span className="font-medium">Someone</span>
                )}{" "}
                <span className="text-muted-foreground">
                  {VERB[notification.type] ?? "did something"}
                </span>
              </p>
              <span className="text-muted-foreground text-xs">
                {relativeTime(notification.createdAt)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
