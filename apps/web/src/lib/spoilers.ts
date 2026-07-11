export interface TextSegment {
  text: string;
  spoiler: boolean;
}

const SPOILER_RE = />!([\s\S]+?)!</g;

/**
 * Split text on inline spoiler markers `>!hidden!<` into ordered segments.
 * Pure and XSS-safe by construction: it only ever returns plain strings, which
 * the renderer emits as React text nodes (auto-escaped). Never build HTML here.
 */
export function parseSpoilers(input: string): TextSegment[] {
  const segments: TextSegment[] = [];
  let lastIndex = 0;
  for (const match of input.matchAll(SPOILER_RE)) {
    const start = match.index ?? 0;
    if (start > lastIndex) {
      segments.push({ text: input.slice(lastIndex, start), spoiler: false });
    }
    segments.push({ text: match[1]!, spoiler: true });
    lastIndex = start + match[0].length;
  }
  if (lastIndex < input.length) {
    segments.push({ text: input.slice(lastIndex), spoiler: false });
  }
  return segments;
}

/** Does the text contain at least one inline spoiler marker? */
export function hasSpoilerMarkers(input: string): boolean {
  return /(>![\s\S]+?!<)/.test(input);
}
