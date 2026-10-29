/** Safe object-key pattern for R2 avatar/banner keys (no path separators). */
const MEDIA_OBJECT_KEY = /^[a-zA-Z0-9._-]{1,200}$/;

/**
 * Reject path traversal and unexpected characters before prefixing
 * `avatars/` or `banners/` for R2 GETs.
 */
export function sanitizeMediaObjectKey(key: string): string | null {
  if (!MEDIA_OBJECT_KEY.test(key)) return null;
  if (key.includes("..")) return null;
  return key;
}
