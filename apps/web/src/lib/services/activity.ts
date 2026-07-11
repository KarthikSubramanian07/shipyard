import type { DB } from "@/db";
import { activities } from "@/db/schema";
import { newId } from "@/lib/id";

type ActivityKind = (typeof import("@/db/schema").ACTIVITY_KINDS)[number];

export async function recordActivity(
  db: DB,
  input: { userId: string; kind: ActivityKind; entityId: string; workId?: string | null },
): Promise<void> {
  await db.insert(activities).values({
    id: newId(),
    userId: input.userId,
    kind: input.kind,
    entityId: input.entityId,
    workId: input.workId ?? null,
  });
}
