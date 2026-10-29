import { getCloudflareContext } from "@opennextjs/cloudflare";
import { sanitizeMediaObjectKey } from "@/lib/media/keys";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ key: string }> }) {
  const { key: raw } = await params;
  const key = sanitizeMediaObjectKey(raw);
  if (!key) return new Response("Not found", { status: 404 });

  const { env } = getCloudflareContext();
  // R2 may not be enabled yet - avatars are optional.
  if (!env.MEDIA) return new Response("Not found", { status: 404 });
  const object = await env.MEDIA.get(`avatars/${key}`);
  if (!object) return new Response("Not found", { status: 404 });

  return new Response(object.body, {
    headers: {
      "Content-Type": object.httpMetadata?.contentType ?? "image/jpeg",
      "Cache-Control": "public, max-age=86400, immutable",
      ETag: object.httpEtag,
    },
  });
}
