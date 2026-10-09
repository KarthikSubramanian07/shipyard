import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/ui/logo";

export const metadata: Metadata = {
  title: "Privacy",
  description:
    "What Shipyard stores about you, why, and how to get it deleted. No ads, no trackers, no data sales.",
  alternates: { canonical: "/privacy" },
};

const SECTIONS: { title: string; body: React.ReactNode }[] = [
  {
    title: "The short version",
    body: "Shipyard has no ads, no third-party analytics, no tracking pixels, and never sells or shares your data. We keep only what's needed to run your account and show your public activity.",
  },
  {
    title: "What we store",
    body: "When you sign up: your email address, a username, and a password hash (scrypt - we never see or store the password itself). If you add them: a display name, bio, location, avatar and banner image. Everything you create - logs, ratings, reviews, rankings, lists, fics, comments, follows and reactions - is stored so it can be shown on the site.",
  },
  {
    title: "What's public",
    body: "Profiles, logs, reviews, lists and fics are public by design and readable without an account; that's the point of Shipyard. Your email address is never shown to anyone.",
  },
  {
    title: "Cookies",
    body: "One first-party cookie, shipyard_session, keeps you signed in. It's HTTP-only, expires after 30 days, and is deleted when you log out. Your light/dark theme choice lives in your browser's local storage. There are no advertising or cross-site cookies.",
  },
  {
    title: "Sign in with Google",
    body: "If you choose Google sign-in, Google shares your email and basic profile with us to create your account. We don't receive your Google password or access to anything else in your Google account.",
  },
  {
    title: "Where it lives",
    body: "Shipyard runs on Cloudflare: data is stored in Cloudflare D1 and R2, and Cloudflare processes requests (including IP addresses, briefly, for security, rate limiting and abuse prevention). Film and TV details come from TMDB and book details from Open Library; poster images load directly from their servers.",
  },
  {
    title: "Your choices",
    body: (
      <>
        You can change your profile at any time in settings. To remove something you posted, export
        your data, or delete your account entirely, use the{" "}
        <Link href="/contact" className="text-primary hover:underline">
          contact page
        </Link>
        . Deleted accounts are removed from the live database right away.
      </>
    ),
  },
  {
    title: "Changes",
    body: "If this policy changes in a way that matters, we'll say so on this page and in the project's public changelog on GitHub. Last updated October 2026.",
  },
];

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <Logo className="mb-8" />
      <h1 className="font-display text-balance text-4xl font-semibold tracking-tight">
        Privacy, plainly.
      </h1>
      <p className="text-muted-foreground mt-4 text-balance text-lg">
        Shipyard is a free, open-source fan platform. Here&apos;s exactly what it keeps about you
        and why - no legalese.
      </p>
      <div className="text-foreground/90 mt-12 space-y-10">
        {SECTIONS.map((s) => (
          <section key={s.title} className="space-y-2">
            <h2 className="font-display text-2xl font-semibold">{s.title}</h2>
            <p>{s.body}</p>
          </section>
        ))}
      </div>
    </div>
  );
}
