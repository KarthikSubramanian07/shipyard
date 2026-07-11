import type { FlareKey } from "@/db/schema";

export interface FlareDef {
  key: FlareKey;
  emoji: string;
  label: string;
}

/** The fixed, curated flare set. Order = display order in the picker. */
export const FLARES: FlareDef[] = [
  { key: "heart", emoji: "💛", label: "Adored" },
  { key: "peak", emoji: "🔥", label: "Peak" },
  { key: "sob", emoji: "😭", label: "Wrecked me" },
  { key: "mind", emoji: "🤯", label: "Mindbender" },
  { key: "more", emoji: "👀", label: "Need more" },
  { key: "lol", emoji: "😂", label: "Funny" },
];

export const FLARE_BY_KEY = Object.fromEntries(FLARES.map((f) => [f.key, f])) as Record<
  FlareKey,
  FlareDef
>;

export function flareEmoji(key: FlareKey): string {
  return FLARE_BY_KEY[key]?.emoji ?? "💛";
}
