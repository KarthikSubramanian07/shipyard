"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useActionState } from "react";
import { login, signup, type AuthState } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Logo } from "@/components/ui/logo";

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const action = mode === "login" ? login : signup;
  const [state, formAction, pending] = useActionState<AuthState, FormData>(action, {});
  const params = useSearchParams();
  const next = params.get("next") ?? "";
  const oauthError = params.get("error");
  const isLogin = mode === "login";

  const oauthMessage =
    oauthError === "oauth_link"
      ? "An account with that email already exists. Log in with your password first."
      : oauthError === "oauth_email"
        ? "Google did not provide a verified email. Try email/password signup."
        : oauthError === "oauth"
          ? "Google sign-in failed. Please try again."
          : null;

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 py-12">
      <div className="mb-6 text-center">
        <Link href="/" className="inline-block">
          <Logo />
        </Link>
        <h1 className="font-display mt-6 text-2xl font-semibold">
          {isLogin ? "Welcome back to the yard" : "Build your harbor"}
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          {isLogin
            ? "Log what you love. Rewrite what you wish."
            : "Free forever. No paywall, ever."}
        </p>
      </div>

      <a
        href="/login/google"
        className="border-border bg-card hover:bg-muted mb-4 flex h-10 items-center justify-center gap-2 rounded-lg border text-sm font-medium"
      >
        <GoogleGlyph /> Continue with Google
      </a>

      <div className="text-muted-foreground mb-4 flex items-center gap-3 text-xs">
        <span className="bg-border h-px flex-1" /> or <span className="bg-border h-px flex-1" />
      </div>

      <form action={formAction} className="space-y-4">
        <input type="hidden" name="next" value={next} />
        {!isLogin && (
          <div className="space-y-1.5">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              name="username"
              placeholder="obsessive_fan"
              autoComplete="username"
              required
            />
          </div>
        )}
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" autoComplete="email" required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete={isLogin ? "current-password" : "new-password"}
            required
          />
        </div>

        {oauthMessage ? <p className="text-destructive mb-4 text-sm">{oauthMessage}</p> : null}

        {state?.error ? <p className="text-destructive text-sm">{state.error}</p> : null}

        <Button type="submit" size="lg" className="w-full" disabled={pending}>
          {pending ? "…" : isLogin ? "Log in" : "Create account"}
        </Button>
      </form>

      <p className="text-muted-foreground mt-6 text-center text-sm">
        {isLogin ? (
          <>
            New here?{" "}
            <Link href="/signup" className="text-primary font-medium hover:underline">
              Join Shipyard
            </Link>
          </>
        ) : (
          <>
            Already aboard?{" "}
            <Link href="/login" className="text-primary font-medium hover:underline">
              Log in
            </Link>
          </>
        )}
      </p>
    </div>
  );
}

function GoogleGlyph() {
  return (
    <svg className="size-4" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1Z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.26 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 1.46 14.97.5 12 .5A11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 6.68 9.14 4.75 12 4.75Z"
      />
    </svg>
  );
}
