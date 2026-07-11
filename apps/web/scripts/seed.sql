-- Demo seed for Shipyard. Idempotent (INSERT OR IGNORE). Run with:
--   pnpm db:seed:local   (or db:seed:remote)
-- Seeded accounts are OAuth-style (no password) - they populate the feed and
-- work pages so a fresh install isn't empty. Create your own account to log in.

-- Users -----------------------------------------------------------------------
INSERT OR IGNORE INTO users (id, username, email, display_name, bio, is_pro, is_admin)
VALUES
  ('usr_ada', 'ada', 'ada@shipyard.local', 'Ada', 'Sci-fi, slow burns, and shows cancelled before their time.', 1, 0),
  ('usr_miro', 'miro', 'miro@shipyard.local', 'Miro', 'I finish a show and immediately rewrite the ending.', 0, 0),
  ('usr_wren', 'wren', 'wren@shipyard.local', 'Wren', 'Books that destroyed me in my 20s.', 0, 0);

-- Default shelves --------------------------------------------------------------
INSERT OR IGNORE INTO shelves (id, user_id, name, slug, is_default, position) VALUES
  ('shf_ada_w', 'usr_ada', 'Watched', 'watched', 1, 0),
  ('shf_ada_r', 'usr_ada', 'Reading', 'reading', 1, 1),
  ('shf_ada_want', 'usr_ada', 'Want to Watch', 'want', 1, 2),
  ('shf_ada_fav', 'usr_ada', 'Favorites', 'favorites', 1, 3),
  ('shf_miro_w', 'usr_miro', 'Watched', 'watched', 1, 0),
  ('shf_miro_r', 'usr_miro', 'Reading', 'reading', 1, 1),
  ('shf_miro_want', 'usr_miro', 'Want to Watch', 'want', 1, 2),
  ('shf_miro_fav', 'usr_miro', 'Favorites', 'favorites', 1, 3),
  ('shf_wren_w', 'usr_wren', 'Watched', 'watched', 1, 0),
  ('shf_wren_r', 'usr_wren', 'Reading', 'reading', 1, 1),
  ('shf_wren_want', 'usr_wren', 'Want to Watch', 'want', 1, 2),
  ('shf_wren_fav', 'usr_wren', 'Favorites', 'favorites', 1, 3);

-- Works (lightweight external references). Book covers come from Open Library
-- (no key). Film/TV posters are left NULL here and are backfilled from TMDB once
-- a TMDB_BEARER token is set (see scripts/backfill-posters.mjs).
INSERT OR IGNORE INTO works (id, source, external_id, type, slug, title, year, poster_url, synopsis) VALUES
  ('wrk_succ', 'tmdb', 'tv:76331', 'tv', 'succession-2018', 'Succession', 2018, NULL, 'A media dynasty tears itself apart over who inherits the throne.'),
  ('wrk_past', 'tmdb', 'movie:666277', 'film', 'past-lives-2023', 'Past Lives', 2023, NULL, 'Two childhood friends reunite across decades and continents.'),
  ('wrk_annih', 'tmdb', 'movie:300668', 'film', 'annihilation-2018', 'Annihilation', 2018, NULL, 'A biologist enters a shimmering zone where nature rewrites itself.'),
  ('wrk_lhod', 'openlibrary', 'OL59800W', 'book', 'the-left-hand-of-darkness-1969', 'The Left Hand of Darkness', 1969, 'https://covers.openlibrary.org/b/id/10618463-L.jpg', 'An envoy navigates a world without fixed gender.'),
  ('wrk_pyre', 'tmdb', 'tv:94997', 'tv', 'house-of-the-dragon-2022', 'House of the Dragon', 2022, NULL, 'A Targaryen civil war a century before the Iron Throne fell.');

-- Logs (with ratings + a couple of reviews) ------------------------------------
INSERT OR IGNORE INTO logs (id, user_id, work_id, rating, reaction, review_body, has_spoilers, like_count) VALUES
  ('log_ada_succ', 'usr_ada', 'wrk_succ', 10, 'No one has ever loved anyone.', 'The best-written ensemble on television. Every finale re-contextualizes the whole run.', 0, 3),
  ('log_ada_past', 'usr_ada', 'wrk_past', 9, 'In-yun. I am undone.', NULL, 0, 1),
  ('log_miro_annih', 'usr_miro', 'wrk_annih', 8, 'The lighthouse sequence lives in my head rent free.', 'A film about self-destruction disguised as sci-fi horror. The score is a slow panic attack.', 1, 2),
  ('log_wren_lhod', 'usr_wren', 'wrk_lhod', 10, 'Light is the left hand of darkness.', 'Le Guin builds an entire anthropology just to make one point about love. It works.', 0, 4),
  ('log_miro_succ', 'usr_miro', 'wrk_succ', 9, 'Kendall on the rocks. That last shot.', NULL, 0, 0);

-- Reactions --------------------------------------------------------------------
INSERT OR IGNORE INTO reactions (id, user_id, work_id, body, like_count) VALUES
  ('rxn_wren_pyre', 'usr_wren', 'wrk_pyre', 'The dragons are fine but I''m here for the Small Council politics.', 1),
  ('rxn_ada_annih', 'usr_ada', 'wrk_annih', 'Every frame of the shimmer is a screensaver I would actually use.', 0);

-- A fic + first chapter --------------------------------------------------------
INSERT OR IGNORE INTO fics (id, user_id, work_id, title, slug, summary, type, rating, canon, is_complete, word_count, chapter_count, kudos_count, published_at)
VALUES ('fic_miro_succ', 'usr_miro', 'wrk_succ', 'The Deal That Held', 'the-deal-that-held-fic_mi', 'An alternate ending where the siblings actually stick together. Canon-divergent, one shot.', 'alternate-ending', 'teen', 'canon-divergent', 1, 1200, 1, 2, unixepoch());

INSERT OR IGNORE INTO fic_chapters (id, fic_id, idx, title, body, word_count, published_at)
VALUES ('fch_miro_1', 'fic_miro_succ', 0, NULL, 'They met on the terrace, and for once nobody was recording.' || X'0A' || 'Kendall spoke first, which surprised everyone, including Kendall.', 1200, unixepoch());

INSERT OR IGNORE INTO fic_tags (fic_id, kind, tag) VALUES
  ('fic_miro_succ', 'tone', 'angst'),
  ('fic_miro_succ', 'tone', 'hurt-comfort'),
  ('fic_miro_succ', 'pairing', 'the siblings');

-- Follows ----------------------------------------------------------------------
INSERT OR IGNORE INTO follows (follower_id, following_id) VALUES
  ('usr_ada', 'usr_miro'),
  ('usr_wren', 'usr_ada'),
  ('usr_miro', 'usr_wren'),
  ('usr_ada', 'usr_wren');

-- Activity feed ----------------------------------------------------------------
INSERT OR IGNORE INTO activities (id, user_id, kind, entity_id, work_id) VALUES
  ('act_1', 'usr_ada', 'review', 'log_ada_succ', 'wrk_succ'),
  ('act_2', 'usr_ada', 'log', 'log_ada_past', 'wrk_past'),
  ('act_3', 'usr_miro', 'review', 'log_miro_annih', 'wrk_annih'),
  ('act_4', 'usr_wren', 'review', 'log_wren_lhod', 'wrk_lhod'),
  ('act_5', 'usr_miro', 'log', 'log_miro_succ', 'wrk_succ'),
  ('act_6', 'usr_wren', 'reaction', 'rxn_wren_pyre', 'wrk_pyre'),
  ('act_7', 'usr_miro', 'fic', 'fic_miro_succ', 'wrk_succ');

-- Favorites shelf items --------------------------------------------------------
INSERT OR IGNORE INTO shelf_items (shelf_id, work_id) VALUES
  ('shf_ada_fav', 'wrk_succ'),
  ('shf_ada_fav', 'wrk_past'),
  ('shf_wren_fav', 'wrk_lhod');
