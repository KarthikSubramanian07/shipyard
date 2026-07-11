//! Pure, Worker-free SVG card generation + rasterization for Shipyard OG images.
//!
//! Everything in this module is deliberately free of `worker` types so it can be
//! unit-tested with plain `cargo test` on the host target.

use std::fmt::Write as _;

/// Canvas dimensions for an Open Graph share card.
pub const WIDTH: u32 = 1200;
pub const HEIGHT: u32 = 630;

// ---- Brand palette ---------------------------------------------------------
const PAPER: &str = "#f4efe4"; // warm paper background
const INK: &str = "#211c15"; // warm near-black ink
const FLARE: &str = "#cf4626"; // rust-vermilion accent
const VERDIGRIS: &str = "#0e7c6f"; // aged copper green
const MUTED: &str = "#6c6350"; // muted taupe for secondary text
const AMBER: &str = "#b3801f"; // warm gold (reviews)

/// Parsed, validated inputs for a card. Kept plain so it is trivial to build in
/// tests and free of any Worker request machinery.
#[derive(Debug, Clone, Default)]
pub struct CardParams {
    pub kind: CardKind,
    pub title: String,
    pub subtitle: Option<String>,
    pub meta: Option<String>,
    /// Rating in half-star units, 0..=10 (i.e. out of 5 stars). `None` hides stars.
    pub rating: Option<u8>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum CardKind {
    Log,
    Fic,
    Review,
    List,
    Work,
}

impl Default for CardKind {
    fn default() -> Self {
        CardKind::Log
    }
}

impl CardKind {
    pub fn parse(s: &str) -> Option<CardKind> {
        Some(match s.trim().to_ascii_lowercase().as_str() {
            "log" => CardKind::Log,
            "fic" => CardKind::Fic,
            "review" => CardKind::Review,
            "list" => CardKind::List,
            "work" => CardKind::Work,
            _ => return None,
        })
    }

    /// Short uppercase badge label.
    fn label(self) -> &'static str {
        match self {
            CardKind::Log => "LOG",
            CardKind::Fic => "FANFIC",
            CardKind::Review => "REVIEW",
            CardKind::List => "LIST",
            CardKind::Work => "WORK",
        }
    }

    /// Accent color used for the badge + eyebrow of this kind.
    fn accent(self) -> &'static str {
        match self {
            CardKind::Log => VERDIGRIS,
            CardKind::Fic => FLARE,
            CardKind::Review => AMBER,
            CardKind::List => INK,
            CardKind::Work => VERDIGRIS,
        }
    }

    /// Footer tagline tuned to the content kind.
    fn footer(self) -> &'static str {
        match self {
            CardKind::Log => "Logged on Shipyard",
            CardKind::Fic => "Read it on Shipyard",
            CardKind::Review => "Reviewed on Shipyard",
            CardKind::List => "A list on Shipyard",
            CardKind::Work => "Tracked on Shipyard",
        }
    }
}

// ---- XML escaping ----------------------------------------------------------

/// Escape a user-supplied string for safe insertion into SVG/XML text nodes and
/// attribute values. `&` MUST be replaced first so we don't double-escape the
/// entities we introduce. This is the security boundary against SVG injection.
pub fn xml_escape(input: &str) -> String {
    let mut out = String::with_capacity(input.len() + 8);
    for ch in input.chars() {
        match ch {
            '&' => out.push_str("&amp;"),
            '<' => out.push_str("&lt;"),
            '>' => out.push_str("&gt;"),
            '"' => out.push_str("&quot;"),
            '\'' => out.push_str("&apos;"),
            // Drop control chars that would make the SVG invalid XML.
            c if (c as u32) < 0x20 && c != '\t' => {}
            c => out.push(c),
        }
    }
    out
}

// ---- Text wrapping ---------------------------------------------------------

/// Greedy word-wrap of `text` into at most `max_lines` lines of at most
/// `max_chars` characters. If the text does not fit, the final line is
/// truncated and an ellipsis (`…`) is appended. Operates on raw (unescaped)
/// text; callers must escape the resulting lines before emitting them.
pub fn wrap_title(text: &str, max_chars: usize, max_lines: usize) -> Vec<String> {
    let words: Vec<&str> = text.split_whitespace().collect();
    if words.is_empty() {
        return vec![String::new()];
    }

    let mut lines: Vec<String> = Vec::new();
    let mut cur = String::new();

    for word in &words {
        let candidate_len = if cur.is_empty() {
            word.chars().count()
        } else {
            cur.chars().count() + 1 + word.chars().count()
        };

        if candidate_len <= max_chars || cur.is_empty() {
            // A single word longer than the line is hard-split below when it
            // is the only thing on the line and still overflows.
            if cur.is_empty() {
                cur.push_str(word);
            } else {
                cur.push(' ');
                cur.push_str(word);
            }
        } else {
            lines.push(std::mem::take(&mut cur));
            cur.push_str(word);
            if lines.len() == max_lines {
                break;
            }
        }
    }
    if lines.len() < max_lines && !cur.is_empty() {
        lines.push(cur);
    }

    // Did we consume every word? Rebuild what we emitted and compare counts.
    let emitted_words: usize = lines.iter().map(|l| l.split_whitespace().count()).sum();
    let overflowed = emitted_words < words.len();

    // A lone word that is itself wider than the line also needs truncation.
    let last_too_long = lines
        .last()
        .map(|l| l.chars().count() > max_chars)
        .unwrap_or(false);

    if overflowed || last_too_long {
        if let Some(last) = lines.last_mut() {
            truncate_with_ellipsis(last, max_chars);
        }
    }

    if lines.is_empty() {
        lines.push(String::new());
    }
    lines
}

fn truncate_with_ellipsis(line: &mut String, max_chars: usize) {
    // Reserve one slot for the ellipsis glyph.
    let keep = max_chars.saturating_sub(1);
    let mut trimmed: String = line.chars().take(keep).collect();
    // Avoid a dangling space before the ellipsis.
    while trimmed.ends_with(' ') {
        trimmed.pop();
    }
    trimmed.push('…');
    *line = trimmed;
}

// ---- Star geometry ---------------------------------------------------------

/// Build an SVG path `d` string for a 5-pointed star centered at (cx, cy) with
/// outer radius `r`.
fn star_path(cx: f64, cy: f64, r: f64) -> String {
    let inner = r * 0.382;
    let mut d = String::new();
    // Ten vertices alternating outer/inner, starting at the top point.
    for i in 0..10 {
        let radius = if i % 2 == 0 { r } else { inner };
        let angle = -std::f64::consts::FRAC_PI_2 + (i as f64) * std::f64::consts::PI / 5.0;
        let x = cx + radius * angle.cos();
        let y = cy + radius * angle.sin();
        if i == 0 {
            let _ = write!(d, "M{:.2} {:.2}", x, y);
        } else {
            let _ = write!(d, "L{:.2} {:.2}", x, y);
        }
    }
    d.push('Z');
    d
}

/// Render a row of five rating stars for `rating` half-star units (0..=10),
/// right-anchored so the row ends at `right_x` centered vertically on `cy`.
/// Emits `<defs>`-style clip paths inline via a shared id prefix.
pub fn stars_svg(rating: u8, right_x: f64, cy: f64) -> String {
    let rating = rating.min(10) as i32;
    let r = 15.0_f64; // outer radius
    let step = 38.0_f64; // horizontal pitch between star centers
    let count = 5;
    let total_w = step * (count as f64 - 1.0) + 2.0 * r;
    let first_cx = right_x - total_w + r;

    let mut out = String::new();
    out.push_str("<g class=\"stars\">");
    for i in 0..count {
        let cx = first_cx + (i as f64) * step;
        let d = star_path(cx, cy, r);
        // value remaining for this star: 2 = full, 1 = half, <=0 = empty.
        let value = rating - i * 2;
        let class = if value >= 2 {
            "full"
        } else if value == 1 {
            "half"
        } else {
            "empty"
        };

        // Faint track drawn for every star; doubles as the "empty" look.
        let track_opacity = if class == "full" { 1.0 } else { 0.18 };
        let _ = write!(
            out,
            "<path data-star=\"{cls}\" d=\"{d}\" fill=\"{flare}\" opacity=\"{op:.2}\"/>",
            cls = class,
            d = d,
            flare = FLARE,
            op = track_opacity,
        );

        if class == "half" {
            // Solid left half via a clip rect covering the left of the star.
            let clip_id = format!("half{i}");
            let _ = write!(
                out,
                "<clipPath id=\"{id}\"><rect x=\"{x:.2}\" y=\"{y:.2}\" width=\"{w:.2}\" height=\"{h:.2}\"/></clipPath>\
                 <path d=\"{d}\" fill=\"{flare}\" clip-path=\"url(#{id})\"/>",
                id = clip_id,
                x = cx - r,
                y = cy - r,
                w = r,
                h = 2.0 * r,
                d = d,
                flare = FLARE,
            );
        }
    }
    out.push_str("</g>");
    out
}

// ---- Card composition ------------------------------------------------------

/// Build the full 1200x630 SVG document for the given parameters. Pure and
/// deterministic: no I/O, no Worker types, all user text XML-escaped.
pub fn build_card_svg(params: &CardParams) -> String {
    let w = WIDTH as f64;
    let h = HEIGHT as f64;
    let margin = 72.0_f64;
    let content_right = w - margin; // 1128

    let accent = params.kind.accent();

    // --- Title: wrap + adaptive sizing --------------------------------------
    let title_char_count = params.title.chars().count();
    let mut lines = wrap_title(&params.title, 22, 2);
    // Big single-line treatment for short punchy titles.
    let (font_size, line_height) = if lines.len() == 1 && title_char_count <= 15 {
        (104.0, 112.0)
    } else {
        (82.0, 92.0)
    };
    if lines.len() == 1 && title_char_count <= 15 {
        // Re-wrap tighter so a short title never over-wraps at the big size.
        lines = wrap_title(&params.title, 17, 1);
    }

    let mut svg = String::with_capacity(4096);
    let _ = write!(
        svg,
        "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"{w}\" height=\"{h}\" viewBox=\"0 0 {w} {h}\">",
        w = WIDTH,
        h = HEIGHT
    );

    // Background + subtle vignette for depth.
    let _ = write!(
        svg,
        "<defs>\
         <radialGradient id=\"vign\" cx=\"18%\" cy=\"12%\" r=\"120%\">\
         <stop offset=\"0%\" stop-color=\"#fbf7ee\"/>\
         <stop offset=\"100%\" stop-color=\"{paper}\"/>\
         </radialGradient>\
         </defs>",
        paper = PAPER
    );
    let _ = write!(
        svg,
        "<rect width=\"{w}\" height=\"{h}\" fill=\"url(#vign)\"/>",
        w = WIDTH,
        h = HEIGHT
    );

    // Decorative oversized flare disc, bottom-right, clipped by the canvas.
    let _ = write!(
        svg,
        "<circle cx=\"{cx:.0}\" cy=\"{cy:.0}\" r=\"260\" fill=\"{flare}\" opacity=\"0.06\"/>",
        cx = w - 40.0,
        cy = h + 60.0,
        flare = FLARE
    );

    // Ticket-style inset border.
    let _ = write!(
        svg,
        "<rect x=\"28\" y=\"28\" width=\"{iw}\" height=\"{ih}\" rx=\"22\" fill=\"none\" stroke=\"{ink}\" stroke-opacity=\"0.10\" stroke-width=\"2\"/>",
        iw = WIDTH - 56,
        ih = HEIGHT - 56,
        ink = INK
    );
    // Left spine accent bar in the kind's accent color.
    let _ = write!(
        svg,
        "<rect x=\"28\" y=\"28\" width=\"8\" height=\"{ih}\" rx=\"4\" fill=\"{accent}\"/>",
        ih = HEIGHT - 56,
        accent = accent
    );

    // --- Header: wordmark (left) + type badge (right) -----------------------
    // Flare square mark.
    let _ = write!(
        svg,
        "<rect x=\"{x:.0}\" y=\"64\" width=\"24\" height=\"24\" rx=\"5\" fill=\"{flare}\"/>",
        x = margin,
        flare = FLARE
    );
    let _ = write!(
        svg,
        "<text x=\"{x:.0}\" y=\"84\" font-family=\"Inter\" font-weight=\"700\" font-size=\"26\" letter-spacing=\"4\" fill=\"{ink}\">SHIPYARD</text>",
        x = margin + 38.0,
        ink = INK
    );

    // Type badge pill, right-aligned.
    let label = params.kind.label();
    let label_w = 26.0 + (label.chars().count() as f64) * 13.5; // rough padded width
    let badge_x = content_right - label_w;
    let _ = write!(
        svg,
        "<rect x=\"{bx:.1}\" y=\"58\" width=\"{bw:.1}\" height=\"38\" rx=\"19\" fill=\"{accent}\"/>",
        bx = badge_x,
        bw = label_w,
        accent = accent
    );
    let _ = write!(
        svg,
        "<text x=\"{tx:.1}\" y=\"83\" text-anchor=\"middle\" font-family=\"Inter\" font-weight=\"600\" font-size=\"18\" letter-spacing=\"3\" fill=\"#fbf7ee\">{label}</text>",
        tx = badge_x + label_w / 2.0,
        label = label // label is a static, safe string
    );

    // Header hairline.
    let _ = write!(
        svg,
        "<line x1=\"{m}\" y1=\"124\" x2=\"{r}\" y2=\"124\" stroke=\"{ink}\" stroke-opacity=\"0.12\" stroke-width=\"1\"/>",
        m = margin,
        r = content_right,
        ink = INK
    );

    // --- Eyebrow (meta) -----------------------------------------------------
    let mut cursor_y;
    if let Some(meta) = params.meta.as_ref().filter(|m| !m.trim().is_empty()) {
        let meta_trunc = clamp_chars(meta, 54);
        let _ = write!(
            svg,
            "<text x=\"{x:.0}\" y=\"186\" font-family=\"Inter\" font-weight=\"600\" font-size=\"22\" letter-spacing=\"2\" fill=\"{accent}\">{meta}</text>",
            x = margin,
            accent = accent,
            meta = xml_escape(&meta_trunc.to_uppercase())
        );
        cursor_y = 186.0;
    } else {
        cursor_y = 150.0;
    }

    // --- Title --------------------------------------------------------------
    // First baseline sits a comfortable gap below the eyebrow/header.
    let mut baseline = cursor_y + 80.0;
    for line in &lines {
        let _ = write!(
            svg,
            "<text x=\"{x:.0}\" y=\"{y:.1}\" font-family=\"Fraunces\" font-weight=\"600\" font-size=\"{fs:.0}\" fill=\"{ink}\">{t}</text>",
            x = margin,
            y = baseline,
            fs = font_size,
            ink = INK,
            t = xml_escape(line)
        );
        baseline += line_height;
    }
    cursor_y = baseline;

    // --- Subtitle -----------------------------------------------------------
    if let Some(sub) = params.subtitle.as_ref().filter(|s| !s.trim().is_empty()) {
        let sub_trunc = clamp_chars(sub, 68);
        let _ = write!(
            svg,
            "<text x=\"{x:.0}\" y=\"{y:.1}\" font-family=\"Inter\" font-weight=\"400\" font-size=\"30\" fill=\"{muted}\">{s}</text>",
            x = margin,
            y = cursor_y + 22.0,
            muted = MUTED,
            s = xml_escape(&sub_trunc)
        );
    }

    // --- Footer: hairline + tagline (left) + stars (right) ------------------
    let footer_y = h - 82.0;
    let _ = write!(
        svg,
        "<line x1=\"{m}\" y1=\"{ly:.0}\" x2=\"{r}\" y2=\"{ly:.0}\" stroke=\"{ink}\" stroke-opacity=\"0.12\" stroke-width=\"1\"/>",
        m = margin,
        r = content_right,
        ly = footer_y,
        ink = INK
    );
    let _ = write!(
        svg,
        "<text x=\"{x:.0}\" y=\"{y:.0}\" font-family=\"Inter\" font-weight=\"500\" font-size=\"21\" letter-spacing=\"1\" fill=\"{muted}\">{txt}</text>",
        x = margin,
        y = footer_y + 40.0,
        muted = MUTED,
        txt = params.kind.footer() // static safe string
    );

    if let Some(rating) = params.rating {
        svg.push_str(&stars_svg(rating, content_right, footer_y + 32.0));
    }

    svg.push_str("</svg>");
    svg
}

/// Truncate to `max` chars, appending an ellipsis if shortened. Used for
/// secondary lines where full word-wrapping is unnecessary.
fn clamp_chars(s: &str, max: usize) -> String {
    let trimmed = s.trim();
    if trimmed.chars().count() <= max {
        return trimmed.to_string();
    }
    let mut out: String = trimmed.chars().take(max.saturating_sub(1)).collect();
    while out.ends_with(' ') {
        out.pop();
    }
    out.push('…');
    out
}

// ---- Rasterization ---------------------------------------------------------

use std::sync::Arc;

/// Load the embedded brand fonts into a shared font database. The fonts are
/// baked into the binary via `include_bytes!` so rendering needs no filesystem
/// or system fonts (both unavailable on `wasm32-unknown-unknown`). Returns an
/// `Arc` so a single db can be built once and reused for every request.
pub fn load_fonts() -> Arc<usvg::fontdb::Database> {
    let mut db = usvg::fontdb::Database::new();
    db.load_font_data(include_bytes!("../fonts/Fraunces.ttf").to_vec());
    db.load_font_data(include_bytes!("../fonts/Inter.ttf").to_vec());
    db.set_serif_family("Fraunces");
    db.set_sans_serif_family("Inter");
    Arc::new(db)
}

/// Rasterize an SVG string to a PNG byte buffer using the provided font db.
/// Returns a descriptive error string on failure so callers can surface a 500.
pub fn render_png(svg: &str, fontdb: &Arc<usvg::fontdb::Database>) -> Result<Vec<u8>, String> {
    let mut opt = usvg::Options::default();
    opt.font_family = "Inter".to_string();
    opt.fontdb = Arc::clone(fontdb);

    let tree = usvg::Tree::from_str(svg, &opt).map_err(|e| format!("usvg parse: {e}"))?;

    let mut pixmap =
        tiny_skia::Pixmap::new(WIDTH, HEIGHT).ok_or_else(|| "pixmap alloc failed".to_string())?;
    resvg::render(&tree, tiny_skia::Transform::identity(), &mut pixmap.as_mut());

    pixmap.encode_png().map_err(|e| format!("png encode: {e}"))
}
