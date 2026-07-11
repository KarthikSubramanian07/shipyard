/**
 * Only allow same-site absolute paths as post-auth redirect targets.
 * Rejects protocol-relative (`//evil.com`), backslash tricks, and full URLs -
 * i.e. prevents open-redirect via the `?next=` param.
 */
export function safeNextPath(next: unknown, fallback = "/"): string {
  if (typeof next !== "string" || next.length === 0) return fallback;
  if (!next.startsWith("/")) return fallback;
  if (next.startsWith("//") || next.startsWith("/\\")) return fallback;
  return next;
}
