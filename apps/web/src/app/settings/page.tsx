import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { SettingsForm } from "@/components/settings-form";

export const metadata: Metadata = {
  title: "Settings",
  robots: { index: false, follow: false },
};

export default async function SettingsPage() {
  const user = await requireUser("/settings");
  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="font-display mb-6 text-2xl font-semibold">Settings</h1>
      <SettingsForm
        displayName={user.displayName}
        bio={user.bio ?? ""}
        pronouns={user.pronouns ?? ""}
        location={user.location ?? ""}
      />
    </div>
  );
}
