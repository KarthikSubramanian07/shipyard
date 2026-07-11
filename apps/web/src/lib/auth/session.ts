import { sha256 } from "@oslojs/crypto/sha2";
import { encodeBase32LowerCaseNoPadding, encodeHexLowerCase } from "@oslojs/encoding";
import { eq } from "drizzle-orm";
import type { DB } from "@/db";
import { sessions, users, type User } from "@/db/schema";

const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30; // 30 days
const RENEW_THRESHOLD_MS = SESSION_TTL_MS / 2;

export type SessionValidationResult =
  { session: { id: string; expiresAt: Date }; user: User } | { session: null; user: null };

/** 20 random bytes, base32 — this raw token goes in the cookie, never the DB. */
export function generateSessionToken(): string {
  const bytes = new Uint8Array(20);
  crypto.getRandomValues(bytes);
  return encodeBase32LowerCaseNoPadding(bytes);
}

/** The session id is SHA-256(token); a DB leak exposes no usable tokens. */
export function sessionIdFromToken(token: string): string {
  return encodeHexLowerCase(sha256(new TextEncoder().encode(token)));
}

export async function createSession(
  db: DB,
  token: string,
  userId: string,
): Promise<{ id: string; expiresAt: Date }> {
  const id = sessionIdFromToken(token);
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await db.insert(sessions).values({ id, userId, expiresAt });
  return { id, expiresAt };
}

export async function validateSessionToken(
  db: DB,
  token: string,
): Promise<SessionValidationResult> {
  const id = sessionIdFromToken(token);
  const row = await db
    .select({ session: sessions, user: users })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(eq(sessions.id, id))
    .get();

  if (!row) return { session: null, user: null };

  const { session, user } = row;
  if (Date.now() >= session.expiresAt.getTime()) {
    await db.delete(sessions).where(eq(sessions.id, id));
    return { session: null, user: null };
  }

  // Sliding renewal: extend the DB expiry when past the half-life.
  let expiresAt = session.expiresAt;
  if (Date.now() >= session.expiresAt.getTime() - RENEW_THRESHOLD_MS) {
    expiresAt = new Date(Date.now() + SESSION_TTL_MS);
    await db.update(sessions).set({ expiresAt }).where(eq(sessions.id, id));
  }

  return { session: { id, expiresAt }, user };
}

export async function invalidateSession(db: DB, sessionId: string): Promise<void> {
  await db.delete(sessions).where(eq(sessions.id, sessionId));
}

export async function invalidateUserSessions(db: DB, userId: string): Promise<void> {
  await db.delete(sessions).where(eq(sessions.userId, userId));
}
