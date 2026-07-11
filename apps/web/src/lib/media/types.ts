import type { WorkSource, WorkType } from "@/db/schema";

export interface MediaSearchResult {
  source: WorkSource;
  externalId: string;
  type: WorkType;
  title: string;
  year: number | null;
  posterUrl: string | null;
  /** Author, network, or a short descriptor for the result row. */
  subtitle: string | null;
}

export interface MediaDetail extends MediaSearchResult {
  synopsis: string | null;
  /** Provider-specific extras (cast, crew, authors, runtime, …). */
  metadata: Record<string, unknown>;
}

export class MediaError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "MediaError";
  }
}
