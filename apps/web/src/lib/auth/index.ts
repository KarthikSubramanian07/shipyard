import "server-only";
import { redirect } from "next/navigation";
import { cache } from "react";
import { getDb } from "@/db";
import type { User } from "@/db/schema";
import { getSessionToken } from "./cookies";
import { validateSessionToken } from "./session";

/** Resolve the signed-in user for this request (memoised), or null. */
export const getCurrentUser = cache(async (): Promise<User | null> => {
  const token = await getSessionToken();
  if (!token) return null;
  const db = getDb();
  const { user } = await validateSessionToken(db, token);
  return user;
});

/** Use in server components/actions that require auth; redirects to /login. */
export async function requireUser(next?: string): Promise<User> {
  const user = await getCurrentUser();
  if (!user) redirect(next ? `/login?next=${encodeURIComponent(next)}` : "/login");
  return user;
}

export * from "./session";
export * from "./cookies";
export * from "./password";
