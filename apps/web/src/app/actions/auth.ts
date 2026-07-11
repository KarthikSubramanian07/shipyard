"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getDb } from "@/db";
import {
  createSession,
  deleteSessionCookie,
  generateSessionToken,
  getSessionToken,
  hashPassword,
  invalidateSession,
  sessionIdFromToken,
  setSessionCookie,
  verifyPassword,
} from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { createUser, getUserByEmail, getUserByUsername } from "@/lib/services/users";
import { loginSchema, signupSchema } from "@/lib/validation";

export interface AuthState {
  error?: string;
}

async function clientIp(): Promise<string> {
  const h = await headers();
  return h.get("cf-connecting-ip") ?? h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}

export async function signup(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = signupSchema.safeParse({
    username: formData.get("username"),
    email: formData.get("email"),
    password: formData.get("password"),
    displayName: formData.get("displayName") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check your details" };
  }

  const db = getDb();
  const limit = await rateLimit(db, `signup:${await clientIp()}`, 8, 60 * 60 * 1000);
  if (!limit.ok) return { error: "Too many attempts. Try again later." };

  const { username, email, password, displayName } = parsed.data;
  if (await getUserByUsername(db, username)) return { error: "That username is taken" };
  if (await getUserByEmail(db, email)) return { error: "That email already has an account" };

  const passwordHash = await hashPassword(password);
  const user = await createUser(db, { username, email, passwordHash, displayName });

  const token = generateSessionToken();
  const session = await createSession(db, token, user.id);
  await setSessionCookie(token, session.expiresAt);
  redirect(`/u/${user.username}`);
}

export async function login(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { error: "Enter your email and password" };

  const db = getDb();
  const limit = await rateLimit(db, `login:${await clientIp()}`, 10, 15 * 60 * 1000);
  if (!limit.ok) return { error: "Too many attempts. Try again later." };

  const user = await getUserByEmail(db, parsed.data.email);
  // Same generic error whether the email or password is wrong.
  if (!user?.passwordHash || !(await verifyPassword(user.passwordHash, parsed.data.password))) {
    return { error: "Wrong email or password" };
  }

  const token = generateSessionToken();
  const session = await createSession(db, token, user.id);
  await setSessionCookie(token, session.expiresAt);
  const next = formData.get("next");
  redirect(typeof next === "string" && next.startsWith("/") ? next : `/u/${user.username}`);
}

export async function logout(): Promise<void> {
  const token = await getSessionToken();
  if (token) {
    await invalidateSession(getDb(), sessionIdFromToken(token));
  }
  await deleteSessionCookie();
  redirect("/");
}
