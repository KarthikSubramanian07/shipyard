import { getCloudflareContext } from "@opennextjs/cloudflare";
import { generateCodeVerifier, generateState } from "arctic";
import { NextResponse } from "next/server";
import { createGoogleClient } from "@/lib/auth/oauth";

export const dynamic = "force-dynamic";

export async function GET() {
  const { env } = getCloudflareContext();
  const google = createGoogleClient(env);
  if (!google) {
    return NextResponse.redirect(
      new URL("/login?error=google_unavailable", env.NEXT_PUBLIC_APP_URL),
    );
  }

  const state = generateState();
  const codeVerifier = generateCodeVerifier();
  const url = google.createAuthorizationURL(state, codeVerifier, ["openid", "profile", "email"]);

  const res = NextResponse.redirect(url.toString());
  const opts = {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 600,
  };
  res.cookies.set("google_oauth_state", state, opts);
  res.cookies.set("google_code_verifier", codeVerifier, opts);
  return res;
}
