// Minimal worker entry used only by the Vitest workers pool so Miniflare has a
// module graph to load. Real requests are exercised by importing app modules
// directly in tests (unit-style) rather than through this fetch handler.
export default {
  async fetch(): Promise<Response> {
    return new Response("shipyard-test");
  },
};
