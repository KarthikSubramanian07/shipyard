import { Google } from "arctic";

/**
 * Build the Google OAuth2 client (PKCE). Returns null when credentials aren't
 * configured, so the UI can hide the Google button gracefully.
 */
export function createGoogleClient(
  env: Pick<CloudflareEnv, "GOOGLE_CLIENT_ID" | "GOOGLE_CLIENT_SECRET" | "NEXT_PUBLIC_APP_URL">,
): Google | null {
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) return null;
  const redirectURI = `${env.NEXT_PUBLIC_APP_URL}/login/google/callback`;
  return new Google(env.GOOGLE_CLIENT_ID, env.GOOGLE_CLIENT_SECRET, redirectURI);
}

export interface GoogleClaims {
  sub: string;
  name?: string;
  email?: string;
  picture?: string;
}
