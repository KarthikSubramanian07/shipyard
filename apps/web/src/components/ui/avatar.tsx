import { cn } from "@/lib/utils";

export interface AvatarUser {
  displayName: string;
  username: string;
  avatarKey?: string | null;
}

const SIZES = {
  sm: "size-6 text-[10px]",
  md: "size-9 text-xs",
  lg: "size-14 text-lg",
  xl: "size-24 text-3xl",
} as const;

// Deterministic warm hue from the username — every account gets its own tone.
const TONES = [
  "bg-flare-soft text-flare",
  "bg-verdigris-soft text-verdigris",
  "bg-brass-soft text-brass",
];

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? "").join("") || "?";
}

function toneFor(username: string): string {
  let h = 0;
  for (const c of username) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return TONES[h % TONES.length]!;
}

export function Avatar({
  user,
  size = "md",
  className,
}: {
  user: AvatarUser;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  const base = cn(
    "inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full font-semibold select-none",
    SIZES[size],
    className,
  );
  if (user.avatarKey) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={`/api/avatars/${user.avatarKey}`}
        alt={user.displayName}
        className={cn(base, "object-cover")}
        loading="lazy"
      />
    );
  }
  return <span className={cn(base, toneFor(user.username))}>{initials(user.displayName)}</span>;
}
