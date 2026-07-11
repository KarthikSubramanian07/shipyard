//! Shipyard OG image Worker.
//!
//! `GET /og?type=<log|fic|review|list|work>&title=<..>&subtitle=<..>&meta=<..>&rating=<0-10>`
//! renders a 1200x630 PNG share card. All rendering logic lives in `card`, which
//! is pure and unit-tested; this module only handles HTTP plumbing.

pub mod card;

use std::sync::{Arc, OnceLock};

use card::{build_card_svg, render_png, CardKind, CardParams};
use worker::*;

/// The embedded font database is expensive to build (~1.2MB of font data
/// parsed), so build it once per isolate and reuse it for every request.
fn fonts() -> &'static Arc<usvg::fontdb::Database> {
    static DB: OnceLock<Arc<usvg::fontdb::Database>> = OnceLock::new();
    DB.get_or_init(card::load_fonts)
}

fn cors_headers(headers: &mut Headers) -> Result<()> {
    headers.set("Access-Control-Allow-Origin", "*")?;
    headers.set("Access-Control-Allow-Methods", "GET, OPTIONS")?;
    headers.set("Access-Control-Allow-Headers", "Content-Type")?;
    Ok(())
}

#[event(fetch)]
async fn fetch(req: Request, _env: Env, _ctx: Context) -> Result<Response> {
    // CORS preflight.
    if req.method() == Method::Options {
        let mut headers = Headers::new();
        cors_headers(&mut headers)?;
        return Ok(Response::empty()?.with_status(204).with_headers(headers));
    }

    if req.method() != Method::Get {
        return error_response("Method not allowed. Use GET.", 405);
    }

    let url = req.url()?;

    // Collect query params.
    let mut kind_str: Option<String> = None;
    let mut title: Option<String> = None;
    let mut subtitle: Option<String> = None;
    let mut meta: Option<String> = None;
    let mut rating: Option<u8> = None;

    for (key, value) in url.query_pairs() {
        match key.as_ref() {
            "type" => kind_str = Some(value.into_owned()),
            "title" => title = Some(value.into_owned()),
            "subtitle" => subtitle = Some(value.into_owned()),
            "meta" => meta = Some(value.into_owned()),
            "rating" => rating = value.trim().parse::<u8>().ok().map(|r| r.min(10)),
            _ => {}
        }
    }

    let title = match title {
        Some(t) if !t.trim().is_empty() => t,
        _ => {
            return error_response(
                "Missing required `title` query parameter. \
                 Example: /og?type=log&title=Dune&subtitle=Denis%20Villeneuve&rating=9",
                400,
            )
        }
    };

    let kind = kind_str
        .as_deref()
        .and_then(CardKind::parse)
        .unwrap_or_default();

    let params = CardParams {
        kind,
        title,
        subtitle: subtitle.filter(|s| !s.trim().is_empty()),
        meta: meta.filter(|s| !s.trim().is_empty()),
        rating,
    };

    let svg = build_card_svg(&params);
    let png = match render_png(&svg, fonts()) {
        Ok(bytes) => bytes,
        Err(e) => {
            console_error!("render failed: {e}");
            return error_response("Failed to render card image.", 500);
        }
    };

    let mut headers = Headers::new();
    headers.set("Content-Type", "image/png")?;
    headers.set("Cache-Control", "public, max-age=31536000, immutable")?;
    cors_headers(&mut headers)?;
    Ok(Response::from_bytes(png)?.with_headers(headers))
}

/// Build a plain-text error response with CORS headers attached.
fn error_response(message: &str, status: u16) -> Result<Response> {
    let mut resp = Response::error(message, status)?;
    cors_headers(resp.headers_mut())?;
    Ok(resp)
}
