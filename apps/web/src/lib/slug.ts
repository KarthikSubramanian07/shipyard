/** Lowercase, ASCII-folded, hyphenated slug. Always returns something usable. */
export function slugify(input: string): string {
  const base = input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "") // strip diacritics
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/g, "");
  return base || "untitled";
}

/** Work slug includes the year for disambiguation + prettier SEO URLs. */
export function workSlug(title: string, year?: number | null): string {
  const s = slugify(title);
  return year ? `${s}-${year}` : s;
}

/** Append a short id suffix to guarantee uniqueness for user-authored content. */
export function uniqueSlug(title: string, idSuffix: string): string {
  return `${slugify(title)}-${idSuffix.slice(0, 6)}`;
}
