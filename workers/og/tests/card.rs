//! Unit tests for the pure card-building logic. These run on the host target
//! with plain `cargo test` — no wasm, no Worker runtime needed.

use shipyard_og::card::{build_card_svg, stars_svg, wrap_title, xml_escape, CardKind, CardParams};

fn params(title: &str) -> CardParams {
    CardParams {
        kind: CardKind::Log,
        title: title.to_string(),
        subtitle: None,
        meta: None,
        rating: None,
    }
}

#[test]
fn svg_contains_escaped_title() {
    let svg = build_card_svg(&params("Dune: Part Two"));
    assert!(svg.contains("Dune: Part Two"), "title text should appear verbatim");
    assert!(svg.starts_with("<svg"));
    assert!(svg.ends_with("</svg>"));
    assert!(svg.contains("width=\"1200\"") && svg.contains("height=\"630\""));
}

#[test]
fn xml_escaping_prevents_svg_injection() {
    // A malicious title trying to break out of the text node / inject markup.
    let evil = r#"</text><script>alert('xss')</script> & <b>"quoted"</b>"#;
    let escaped = xml_escape(evil);

    // No raw angle brackets, ampersands or quotes survive.
    assert!(!escaped.contains('<'));
    assert!(!escaped.contains('>'));
    assert!(!escaped.contains('"'));
    assert!(!escaped.contains('\''));
    // & must be escaped first so we don't double-encode our own entities.
    assert!(escaped.contains("&amp;"));
    assert!(escaped.contains("&lt;"));
    assert!(escaped.contains("&gt;"));
    assert!(escaped.contains("&quot;"));
    assert!(escaped.contains("&apos;"));
    // No double-escaping: we must not see "&amp;lt;".
    assert!(!escaped.contains("&amp;lt;"));

    // And the full card must not contain an unescaped injected tag.
    let svg = build_card_svg(&params(evil));
    assert!(!svg.contains("<script>"));
    assert!(svg.contains("&lt;script&gt;"));
}

#[test]
fn ampersand_escaped_before_other_entities() {
    // Regression: escaping order. Input "&lt;" (literal) must become
    // "&amp;lt;", NOT be left as a real "<" entity.
    let out = xml_escape("Tom & Jerry <3");
    assert_eq!(out, "Tom &amp; Jerry &lt;3");
}

#[test]
fn long_title_is_truncated_with_ellipsis() {
    let long = "This Is An Absurdly Long Media Title That Should Definitely Not Fit Onto Only Two Lines Of A Share Card No Matter What";
    let svg = build_card_svg(&params(long));
    assert!(svg.contains('…'), "overflowing title must gain an ellipsis");

    // The wrap helper itself must cap the line count.
    let lines = wrap_title(long, 22, 2);
    assert_eq!(lines.len(), 2, "must not exceed max_lines");
    assert!(lines.last().unwrap().ends_with('…'));
    for l in &lines {
        assert!(l.chars().count() <= 22, "line over budget: {l:?}");
    }
}

#[test]
fn short_title_is_not_truncated() {
    let lines = wrap_title("A Short Title", 22, 2);
    assert_eq!(lines, vec!["A Short Title".to_string()]);
    assert!(!lines[0].contains('…'));
}

#[test]
fn stars_render_full_half_empty_by_rating() {
    // 0 => 0 full, 0 half, 5 empty
    let s0 = stars_svg(0, 1128.0, 300.0);
    assert_eq!(s0.matches("data-star=\"full\"").count(), 0);
    assert_eq!(s0.matches("data-star=\"half\"").count(), 0);
    assert_eq!(s0.matches("data-star=\"empty\"").count(), 5);

    // 5 half-star units => 2.5 stars => 2 full, 1 half, 2 empty
    let s5 = stars_svg(5, 1128.0, 300.0);
    assert_eq!(s5.matches("data-star=\"full\"").count(), 2);
    assert_eq!(s5.matches("data-star=\"half\"").count(), 1);
    assert_eq!(s5.matches("data-star=\"empty\"").count(), 2);

    // 7 half-star units => 3.5 stars => 3 full, 1 half, 1 empty
    let s7 = stars_svg(7, 1128.0, 300.0);
    assert_eq!(s7.matches("data-star=\"full\"").count(), 3);
    assert_eq!(s7.matches("data-star=\"half\"").count(), 1);
    assert_eq!(s7.matches("data-star=\"empty\"").count(), 1);

    // 10 half-star units => 5 stars => 5 full, 0 half, 0 empty
    let s10 = stars_svg(10, 1128.0, 300.0);
    assert_eq!(s10.matches("data-star=\"full\"").count(), 5);
    assert_eq!(s10.matches("data-star=\"half\"").count(), 0);
    assert_eq!(s10.matches("data-star=\"empty\"").count(), 0);
}

#[test]
fn rating_included_only_when_present() {
    let mut p = params("The Left Hand of Darkness");
    assert!(!build_card_svg(&p).contains("data-star"));
    p.rating = Some(9);
    let svg = build_card_svg(&p);
    assert!(svg.contains("data-star"));
    // 9 half-units => 4 full, 1 half
    assert_eq!(svg.matches("data-star=\"full\"").count(), 4);
    assert_eq!(svg.matches("data-star=\"half\"").count(), 1);
}

#[test]
fn subtitle_and_meta_are_escaped_and_present() {
    let p = CardParams {
        kind: CardKind::Fic,
        title: "Fic Title".to_string(),
        subtitle: Some("by A<uthor> & \"friends\"".to_string()),
        meta: Some("Chapter 12 · 3.2k words".to_string()),
        rating: Some(8),
    };
    let svg = build_card_svg(&p);
    assert!(svg.contains("&lt;uthor&gt;"));
    assert!(svg.contains("&amp;"));
    assert!(!svg.contains("A<uthor>"));
    // meta is uppercased in the eyebrow
    assert!(svg.contains("CHAPTER 12"));
    // Fanfic badge
    assert!(svg.contains("FANFIC"));
}

#[test]
fn card_kind_parsing() {
    assert_eq!(CardKind::parse("log"), Some(CardKind::Log));
    assert_eq!(CardKind::parse("FIC"), Some(CardKind::Fic));
    assert_eq!(CardKind::parse(" Review "), Some(CardKind::Review));
    assert_eq!(CardKind::parse("list"), Some(CardKind::List));
    assert_eq!(CardKind::parse("work"), Some(CardKind::Work));
    assert_eq!(CardKind::parse("bogus"), None);
}

#[test]
fn empty_title_does_not_panic() {
    let svg = build_card_svg(&params(""));
    assert!(svg.starts_with("<svg"));
    assert!(svg.ends_with("</svg>"));
}
