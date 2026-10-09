// Pages "advanced mode" entry for https://artshipyard.pages.dev.
// Every request is handed to the `shipyard` Worker (the OpenNext app) over a
// service binding: same Cloudflare thread, no public hop, no extra billing.
export default {
  async fetch(request, env) {
    return env.APP.fetch(request);
  },
};
