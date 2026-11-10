# Accessibility

Shipyard aims for **WCAG 2.2 Level AA** on the public Next.js app (`apps/web`).

## What was tested

- Automated: axe-core (tags `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`, `wcag22aa`) at 1440×900, 390×844 and 320×800 on home, about, contact, privacy, discover, search (query / empty / no results), login (idle and error), signup, work pages (TV and book), the log dialog, a fic page, profile pages, a missing list, and a 404 — in both light and dark colour schemes.
- Manual: keyboard operation of the log dialog (focus trap, Escape, restore), account and flare menus (`aria-expanded`, Escape), search typeahead (live status and Escape), visible focus rings, skip link to `#main`, page `lang` and titles, landmarks and headings, form labels and error alerts, decorative icon markup, in-text link distinction, `prefers-reduced-motion`, and reflow at 320px width.

## Known limitations

- Local audits use the seeded D1 database. Live TMDB / Open Library search and authenticated flows that need a real session were exercised only as far as the public UI and error states allow without production secrets.
- Poster and backdrop images inherit alt text from the work title; decorative brand marks and Lucide icons are marked `aria-hidden`.
- Colour scheme follows the saved theme preference (or system) via a small inline init script; the theme toggle is a labelled button.

## Reporting a barrier

Open an issue at https://github.com/KarthikSubramanian07/shipyard/issues or use the contact page.
