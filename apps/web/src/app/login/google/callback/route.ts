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
  const storedState = store.get("google_oauth_state")?.value;
  const codeVerifier = store.get("google_code_verifier")?.value;

  if (!code || !state || !storedState || !codeVerifier || state !== storedState) {
    loginUrl.searchParams.set("error", "oauth");
    return NextResponse.redirect(loginUrl);
  }

  let tokens: OAuth2Tokens;
  try {
    tokens = await google.validateAuthorizationCode(code, codeVerifier);
  } catch {
    loginUrl.searchParams.set("error", "oauth");
    return NextResponse.redirect(loginUrl);
  }

  const claims = decodeIdToken(tokens.idToken()) as GoogleClaims;
  const db = getDb();

  let user = await getUserByGoogleId(db, claims.sub);
  if (!user && claims.email) user = await getUserByEmail(db, claims.email);
  if (!user) {
    const username = await uniqueUsername(db, claims.name ?? claims.email?.split("@")[0] ?? "fan");
    user = await createUser(db, {
      username,
      email: claims.email ?? `${claims.sub}@google.local`,
      displayName: claims.name ?? username,
      googleId: claims.sub,
    });
  }

  const token = generateSessionToken();
  const session = await createSession(db, token, user.id);
  await setSessionCookie(token, session.expiresAt);
  return NextResponse.redirect(new URL(`/u/${user.username}`, env.NEXT_PUBLIC_APP_URL));
}
