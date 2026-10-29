//! Renders the site-wide default share card (`apps/web/public/og.png`).
//!
//!   cargo run --example default_card -- ../../apps/web/public/og.png
use shipyard_og::card::{build_card_svg, load_fonts, render_png, CardKind, CardParams};

fn main() {
    let out = std::env::args()
        .nth(1)
        .unwrap_or_else(|| "../../apps/web/public/og.png".to_string());
    let svg = build_card_svg(&CardParams {
        kind: CardKind::Work,
        title: "Track everything. Rewrite anything.".to_string(),
        subtitle: Some("Films, TV & books - plus the fanfic they inspire".to_string()),
        meta: Some("FREE FOREVER".to_string()),
        rating: None,
    });
    let png = render_png(&svg, &load_fonts()).expect("render default card");
    std::fs::write(&out, png).expect("write png");
    println!("wrote {out}");
}
