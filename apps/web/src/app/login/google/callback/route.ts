import { getCloudflareContext } from "@opennextjs/cloudflare";
import { decodeIdToken, type OAuth2Tokens } from "arctic";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getDb, type DB } from "@/db";
import { createSession, generateSessionToken, setSessionCookie } from "@/lib/auth";
import type { GoogleClaims } from "@/lib/auth/oauth";
import { createGoogleClient } from "@/lib/auth/oauth";
import {
  createUser,
  getUserByEmail,
  getUserByGoogleId,
  getUserByUsername,
} from "@/lib/services/users";
import { slugify } from "@/lib/slug";

export const dynamic = "force-dynamic";

const OAUTH_STATE_COOKIE = "google_oauth_state";
const OAUTH_VERIFIER_COOKIE = "google_code_verifier";

function clearOAuthCookies(
  store: Awaited<ReturnType<typeof cookies>>,
): void {
  store.set(OAUTH_STATE_COOKIE, "", { path: "/", maxAge: 0 });
  store.set(OAUTH_VERIFIER_COOKIE, "", { path: "/", maxAge: 0 });
}

async function uniqueUsername(db: DB, seed: string): Promise<string> {
  const base = (slugify(seed).replace(/-/g, "_").slice(0, 16) || "fan").replace(/^_+|_+$/g, "");
  if (!(await getUserByUsername(db, base))) return base;
  for (let i = 0; i < 25; i++) {
    const candidate = `${base}${Math.floor(1000 + Math.random() * 9000)}`.slice(0, 20);
    if (!(await getUserByUsername(db, candidate))) return candidate;
  }
  return `${base}${Date.now().toString(36)}`.slice(0, 20);
}

export async function GET(request: Request) {
  const { env } = getCloudflareContext();
  const google = createGoogleClient(env);
  const loginUrl = new URL("/login", env.NEXT_PUBLIC_APP_URL);
  if (!google) return NextResponse.redirect(loginUrl);

  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const store = await cookies();
  const storedState = store.get(OAUTH_STATE_COOKIE)?.value;
  const codeVerifier = store.get(OAUTH_VERIFIER_COOKIE)?.value;

  const fail = (error: string) => {
    clearOAuthCookies(store);
    loginUrl.searchParams.set("error", error);
    return NextResponse.redirect(loginUrl);
  };

  if (!code || !state || !storedState || !codeVerifier || state !== storedState) {
    return fail("oauth");
  }

  let tokens: OAuth2Tokens;
  try {
    tokens = await google.validateAuthorizationCode(code, codeVerifier);
  } catch {
    return fail("oauth");
  }

  const claims = decodeIdToken(tokens.idToken()) as GoogleClaims;
  // Refuse unverified Google emails so an attacker cannot squat via a fake inbox.
  if (!claims.email || claims.email_verified !== true) {
    return fail("oauth_email");
  }

  const db = getDb();

  // Only match by googleId. Never auto-login by email alone — that lets an
  // attacker who registered the victim's email with a password hijack the
  // real Google user's session (and keeps password access).
  let user = await getUserByGoogleId(db, claims.sub);
  if (!user) {
    const existing = await getUserByEmail(db, claims.email);
    if (existing) {
      return fail("oauth_link");
    }
    const username = await uniqueUsername(db, claims.name ?? claims.email.split("@")[0] ?? "fan");
    user = await createUser(db, {
      username,
      email: claims.email,
      displayName: claims.name ?? username,
      googleId: claims.sub,
    });
  }

  clearOAuthCookies(store);
  const token = generateSessionToken();
  const session = await createSession(db, token, user.id);
  await setSessionCookie(token, session.expiresAt);
  return NextResponse.redirect(new URL(`/u/${user.username}`, env.NEXT_PUBLIC_APP_URL));
}
