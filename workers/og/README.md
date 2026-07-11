# shipyard-og

A production Cloudflare Worker (Rust → WebAssembly) that renders **Open Graph
share-card PNGs** for [Shipyard](https://tryclear.app) — a media-tracking +
fanfic social platform. Every share is an ad, so the cards are designed to be
handsome marketing collateral, not generic auto-generated boxes.

## What it does

```
GET /og?type=<log|fic|review|list|work>
       &title=<required>
       &subtitle=<optional>
       &meta=<optional>
       &rating=<0-10 half-star integer, optional>
       &poster=<url, optional — see decision below>
```

- Renders a **1200×630 PNG** and returns it with:
  - `Content-Type: image/png`
  - `Cache-Control: public, max-age=31536000, immutable`
  - CORS headers (`Access-Control-Allow-Origin: *`, `GET, OPTIONS`)
- Handles `OPTIONS` preflight with `204`.
- Returns `400` with a helpful message when `title` is missing/blank.
- Returns `405` for non-GET methods and `500` if rasterization fails.

### Example

```
https://shipyard-og.<subdomain>.workers.dev/og?type=log&title=Dune%3A%20Part%20Two&subtitle=Directed%20by%20Denis%20Villeneuve&meta=2024%20%C2%B7%20Watched%20Jul%2011&rating=9
```

Drop it straight into your page head:

```html
<meta property="og:image" content="https://shipyard-og.example.workers.dev/og?type=fic&title=The%20Stars%20Incline%20Us&meta=Chapter%2012%20of%2020&rating=7" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta name="twitter:card" content="summary_large_image" />
```

## The card design

Warm, editorial, print-inspired — like a library index card or a film ticket.

| Token       | Hex        | Use                                   |
| ----------- | ---------- | ------------------------------------- |
| Paper       | `#f4efe4`  | Background (with a soft radial glow)  |
| Ink         | `#211c15`  | Serif title + wordmark                |
| Flare       | `#cf4626`  | Rust-vermilion accent, mark, stars    |
| Verdigris   | `#0e7c6f`  | Aged-copper accent (logs / works)     |
| Muted       | `#6c6350`  | Subtitle text                         |
| Amber       | `#b3801f`  | Review accent                         |

Layout:

- **Wordmark** top-left: a flare square + `SHIPYARD` in letter-spaced Inter.
- **Type badge** top-right: a pill colored per content kind (`LOG`, `FANFIC`,
  `REVIEW`, `LIST`, `WORK`).
- **Eyebrow** (`meta`): uppercase, letter-spaced, in the kind's accent color.
- **Title**: big **Fraunces** serif, auto-wrapped to at most 2 lines, truncated
  with `…`. Short punchy titles (≤15 chars) get an oversized single-line
  treatment.
- **Subtitle**: muted Inter.
- **Footer**: a hairline, a kind-specific tagline (e.g. "Logged on Shipyard"),
  and — when `rating` is present — a row of five flare-colored stars supporting
  full / half / empty states.
- A ticket-style inset border, a colored left spine, and an oversized faint
  flare disc in the corner give it a premium, composed feel.

Fonts are **[Fraunces](https://github.com/undercasetype/Fraunces)** (serif
title) and **[Inter](https://github.com/rsms/inter)** (everything else), both
OFL-licensed, embedded via `include_bytes!` (see `fonts/`, licenses included).
The variable fonts' `wght` axis is driven by CSS `font-weight` in the SVG.

## Rendering approach

Pure Rust, no C dependencies, so it runs on `wasm32-unknown-unknown`:

1. `build_card_svg(&CardParams) -> String` composes a 1200×630 SVG. It is a
   **pure function** with no Worker types, so it is fully unit-testable.
2. `render_png(svg, fontdb)` rasterizes with **`usvg` + `resvg` + `tiny-skia`**
   and encodes a PNG. Fonts are loaded once per isolate (`OnceLock`) since
   parsing ~1.2 MB of font data on every request would be wasteful.

### Security: XML escaping

Every user-supplied string (`title`, `subtitle`, `meta`) is XML-escaped before
insertion into the SVG. `&` is replaced **first** (→ `&amp;`) so we never
double-escape, then `<`→`&lt;`, `>`→`&gt;`, `"`→`&quot;`, `'`→`&apos;`; control
characters are dropped. This prevents SVG/markup injection and is covered by
tests (`xml_escaping_prevents_svg_injection`, `ampersand_escaped_before_...`).

### Poster embedding decision: **skipped (by design)**

The `poster` query parameter is **accepted but intentionally not rendered.**
Embedding a remote image would require fetching an arbitrary URL per request,
base64-encoding it into a `data:` URI, and enabling resvg's raster-image
decoders (PNG/JPEG/GIF) — which meaningfully inflates the wasm binary and adds a
network round-trip that can fail, stall, or be abused as an SSRF/proxy vector.
Per the brief, **"a building, reliable card beats a fragile one."** The card is
designed to be strong purely typographically, so posters are omitted. The
parameter is still parsed (ignored) so callers can pass it without error, and
re-enabling it later is a contained change: add `base64`, turn on resvg's
`raster-images` feature, fetch via the Worker `Fetch` API, and inject an
`<image href="data:...">` into the SVG.

## Build, test, deploy

```bash
# one-time
rustup target add wasm32-unknown-unknown
cargo install worker-build --version "^0.1"

# native build + unit tests (fast, no wasm)
cargo build
cargo test

# render sample cards to PNG for visual inspection
cargo run --example sample -- ./out

# wasm build (what the Worker actually ships)
cargo build --lib --target wasm32-unknown-unknown   # quick dep/compat check
worker-build --release                              # full JS shim + wasm

# deploy
npx wrangler deploy
# local dev
npx wrangler dev
```

## Files

- `Cargo.toml` — crate config (`cdylib` + `lib`), pinned deps.
- `src/lib.rs` — `#[event(fetch)]` handler: routing, query parsing, CORS,
  caching, error responses.
- `src/card.rs` — pure SVG composition, word-wrap, star geometry, XML escaping,
  and `render_png`.
- `tests/card.rs` — unit tests (title escaping, injection safety, escaping
  order, truncation, star states 0/5/7/10, kind parsing).
- `examples/sample.rs` — writes sample PNGs for eyeballing the design.
- `fonts/` — embedded OFL fonts + their license files.
- `wrangler.jsonc` — Worker config (`worker-build --release`, observability on).
