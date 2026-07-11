import { and, count, desc, eq } from "drizzle-orm";
import type { DB } from "@/db";
import { notifications, users } from "@/db/schema";
import { newId } from "@/lib/id";

type NotificationType = (typeof import("@/db/schema").NOTIFICATION_TYPES)[number];
type EntityType = (typeof import("@/db/schema").ENTITY_TYPES)[number];

export async function notify(
  db: DB,
  input: {
    userId: string;
    type: NotificationType;
    actorId?: string | null;
    entityType?: EntityType | null;
    entityId?: string | null;
  },
): Promise<void> {
  // Never notify someone about their own action.
  if (input.actorId && input.actorId === input.userId) return;
  await db.insert(notifications).values({
    id: newId(),
    userId: input.userId,
    type: input.type,
    actorId: input.actorId ?? null,
    entityType: input.entityType ?? null,
    entityId: input.entityId ?? null,
  });
}

export async function getNotifications(db: DB, userId: string, limit = 40) {
  return db
    .select({
      notification: notifications,
      actor: {
        id: users.id,
        username: users.username,
        displayName: users.displayName,
        avatarKey: users.avatarKey,
      },
    })
    .from(notifications)
    .leftJoin(users, eq(notifications.actorId, users.id))
    .where(eq(notifications.userId, userId))
    .orderBy(desc(notifications.createdAt))
    .limit(limit);
}

export async function unreadCount(db: DB, userId: string): Promise<number> {
  const row = await db
    .select({ c: count() })
    .from(notifications)
    .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)))
    .get();
  return row?.c ?? 0;
}

export async function markAllRead(db: DB, userId: string): Promise<void> {
  await db
    .update(notifications)
    .set({ isRead: true })
    .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));
}
