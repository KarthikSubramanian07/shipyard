# edge - the `artshipyard.pages.dev` front door

A ten-line Cloudflare Pages project whose `_worker.js` forwards every request to
the `shipyard` Worker (the OpenNext app in `apps/web`) through a service binding.
It exists only to give Shipyard a clean `*.pages.dev` hostname; all routing,
rendering and agent content negotiation happen in the app Worker.

```sh
# one-time
npx wrangler pages project create artshipyard --production-branch main
# deploy (CI does this on push to main)
npx wrangler pages deploy --branch main
```
