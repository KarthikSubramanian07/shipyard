//! Render sample cards to PNG for local visual inspection:
//! `cargo run --example sample -- <out_dir>`
use shipyard_og::card::{build_card_svg, load_fonts, render_png, CardKind, CardParams};

fn main() {
    let out = std::env::args().nth(1).unwrap_or_else(|| ".".to_string());
    let db = load_fonts();

    let samples = [
        (
            "log",
            CardParams {
                kind: CardKind::Log,
                title: "Dune: Part Two".into(),
                subtitle: Some("Directed by Denis Villeneuve".into()),
                meta: Some("2024 · Watched Jul 11".into()),
                rating: Some(9),
            },
        ),
        (
            "fic",
            CardParams {
                kind: CardKind::Fic,
                title: "The Stars Incline Us, They Do Not Bind Us".into(),
                subtitle: Some("by quill_and_compass · Slow Burn, 84k words".into()),
                meta: Some("Chapter 12 of 20".into()),
                rating: Some(7),
            },
        ),
        (
            "review",
            CardParams {
                kind: CardKind::Review,
                title: "Pedro Páramo".into(),
                subtitle: Some("Juan Rulfo".into()),
                meta: Some("A review".into()),
                rating: Some(10),
            },
        ),
    ];

    for (name, p) in samples {
        let svg = build_card_svg(&p);
        let png = render_png(&svg, &db).expect("render");
        let path = format!("{out}/sample-{name}.png");
        std::fs::write(&path, &png).expect("write");
        println!("wrote {path} ({} bytes)", png.len());
    }
}
