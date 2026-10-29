// Custom Worker entry (https://opennext.js.org/cloudflare/howtos/custom-worker):
// reuses the OpenNext-generated handler and layers agent-friendly Markdown
// content negotiation on top of every page route.
import { withAgentNegotiation } from "./src/lib/agent/handler";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment -- present only after a build
// @ts-ignore `.open-next/worker.js` is generated at build time
import { default as handler } from "./.open-next/worker.js";

export default {
  fetch(request, env, ctx) {
    return withAgentNegotiation(request, (req) => handler.fetch(req, env, ctx));
  },
} satisfies ExportedHandler<CloudflareEnv>;
