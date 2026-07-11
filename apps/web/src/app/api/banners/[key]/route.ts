import { getCloudflareContext } from "@opennextjs/cloudflare";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  const { env } = getCloudflareContext();
  if (!env.MEDIA) return new Response("Not found", { status: 404 });
  const object = await env.MEDIA.get(`banners/${key}`);
  if (!object) return new Response("Not found", { status: 404 });

  return new Response(object.body, {
    headers: {
      "Content-Type": object.httpMetadata?.contentType ?? "image/jpeg",
      "Cache-Control": "public, max-age=86400, immutable",
      ETag: object.httpEtag,
    },
  });
}
